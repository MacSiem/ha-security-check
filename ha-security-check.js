/**
 * HA Security Check - Security audit tool for Home Assistant
 * Checks for common security issues: exposed ports, SSL, outdated addons, insecure integrations, etc.
 */
class HASecurityCheck extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    // --- Throttle fields ---
    this._lastRenderTime = 0;
    this._renderScheduled = false;
    this._firstHassRender = false;
    // --- Pagination ---
    this._currentPage = {};
    this._pageSize = 15;
    this._hass = null;
    this._config = {};
    this._activeTab = 'overview';
    this._loading = true;
    this._auditData = null;
    this._lastScan = null;
  }

  // -- Persistence --
  _scKey() { return 'ha-security-check-' + (this._config.storage_key || 'default'); }
  _saveScanData() {
    try {
      const data = { lastScan: this._lastScan ? this._lastScan.toISOString() : null, lastScore: this._lastScore || null };
      localStorage.setItem(this._scKey(), JSON.stringify(data));
    } catch(e) {}
  }
  _loadScanData() {
    try {
      const raw = localStorage.getItem(this._scKey());
      if (raw) {
        const data = JSON.parse(raw);
        if (data.lastScan) this._lastScan = new Date(data.lastScan);
        if (data.lastScore !== undefined) this._lastScore = data.lastScore;
      }
    } catch(e) {}
  }

  set hass(hass) {
    this._hass = hass;
    if (!hass) return;
    const now = Date.now();
    if (!this._firstHassRender) {
      this._firstHassRender = true;
      this._runAudit();
      this._render();
      this._lastRenderTime = now;
      return;
    }
    if (now - (this._lastRenderTime || 0) < 10000) {
      if (!this._renderScheduled) {
        this._renderScheduled = true;
        setTimeout(() => {
          this._renderScheduled = false;
          const newHash = Object.keys(hass.states).length + '_' + (hass.states['sun.sun'] ? hass.states['sun.sun'].state : '');
          if (newHash === this._lastStateHash) return;
          this._lastStateHash = newHash;
      this._runAudit();
          this._render();
          this._lastRenderTime = Date.now();
        }, 5000 - (now - (this._lastRenderTime || 0)));
      }
      return;
    }
      this._runAudit();
    this._render();
    this._lastRenderTime = now;
  }

  setConfig(config) {
    this._config = { title: config.title || 'Security Check', ...config };
    this._loadScanData();
  }

  async _runAudit() {
    if (!this._hass) return;
    this._loading = true;
    this._updateContent();

    const checks = [];
    const findings = { critical: [], warning: [], info: [], pass: [] };

    try {
      let hostInfo = null, osInfo = null, supervisorInfo = null, coreInfo = null;
      try { hostInfo = (await this._hass.callWS({ type: 'supervisor/api', endpoint: '/host/info', method: 'get' }))?.data; } catch(e) {}
      try { osInfo = (await this._hass.callWS({ type: 'supervisor/api', endpoint: '/os/info', method: 'get' }))?.data; } catch(e) {}
      try { supervisorInfo = (await this._hass.callWS({ type: 'supervisor/api', endpoint: '/supervisor/info', method: 'get' }))?.data; } catch(e) {}
      try { coreInfo = (await this._hass.callWS({ type: 'supervisor/api', endpoint: '/core/info', method: 'get' }))?.data; } catch(e) {}

      if (coreInfo) {
        const current = coreInfo.version;
        const latest = coreInfo.version_latest;
        if (current && latest && current !== latest) {
          findings.warning.push({ id: 'core_update', title: 'HA Core update available', desc: `Current: ${current} \u2192 Latest: ${latest}`, fix: 'Update via Settings \u2192 System \u2192 Updates' });
        } else if (current) {
          findings.pass.push({ id: 'core_update', title: 'HA Core is up to date', desc: `Version: ${current}` });
        }
      }

      if (supervisorInfo) {
        if (supervisorInfo.version !== supervisorInfo.version_latest) {
          findings.warning.push({ id: 'supervisor_update', title: 'Supervisor update available', desc: `Current: ${supervisorInfo.version} \u2192 Latest: ${supervisorInfo.version_latest}`, fix: 'Update the Supervisor from System settings' });
        } else {
          findings.pass.push({ id: 'supervisor_update', title: 'Supervisor is up to date', desc: `Version: ${supervisorInfo.version}` });
        }
      }

      if (osInfo) {
        if (osInfo.update_available) {
          findings.warning.push({ id: 'os_update', title: 'OS update available', desc: `Current: ${osInfo.version} \u2192 Latest: ${osInfo.version_latest}`, fix: 'Update via Settings \u2192 System \u2192 Updates' });
        } else if (osInfo.version) {
          findings.pass.push({ id: 'os_update', title: 'HA OS is up to date', desc: `Version: ${osInfo.version}` });
        }
      }

      let addons = [];
      try {
        const addonList = await this._hass.callWS({ type: 'supervisor/api', endpoint: '/addons', method: 'get' });
        addons = addonList?.data?.addons || [];
      } catch(e) {}

      const installedAddons = addons.filter(a => a.installed);

      const outdatedAddons = installedAddons.filter(a => a.update_available);
      if (outdatedAddons.length > 0) {
        findings.warning.push({ id: 'addon_updates', title: `${outdatedAddons.length} addon(s) have updates`, desc: outdatedAddons.map(a => `${a.name}: ${a.version} \u2192 ${a.version_latest}`).join(', '), fix: 'Update addons via Settings \u2192 Add-ons' });
      } else if (installedAddons.length > 0) {
        findings.pass.push({ id: 'addon_updates', title: 'All addons up to date', desc: `${installedAddons.length} addon(s) installed` });
      }

      const hostNetAddons = installedAddons.filter(a => a.host_network);
      if (hostNetAddons.length > 0) {
        findings.info.push({ id: 'host_network', title: `${hostNetAddons.length} addon(s) use host networking`, desc: hostNetAddons.map(a => a.name).join(', '), fix: 'Verify these addons require host network access' });
      }

      const unprotectedAddons = installedAddons.filter(a => a.protected === false);
      if (unprotectedAddons.length > 0) {
        findings.critical.push({ id: 'unprotected_addons', title: `${unprotectedAddons.length} addon(s) with protection disabled`, desc: unprotectedAddons.map(a => a.name).join(', '), fix: 'Enable protection mode in addon settings unless you specifically need it disabled' });
      }

      const noAutoUpdate = installedAddons.filter(a => a.auto_update === false);
      if (noAutoUpdate.length > 3) {
        findings.info.push({ id: 'auto_update', title: `${noAutoUpdate.length} addon(s) without auto-update`, desc: noAutoUpdate.map(a => a.name).join(', '), fix: 'Consider enabling auto-update for non-critical addons' });
      }

      const configEntries = this._hass.config;
      const externalUrl = configEntries?.external_url || '';
      if (externalUrl) {
        if (externalUrl.startsWith('https://')) {
          findings.pass.push({ id: 'ssl_external', title: 'External access uses HTTPS', desc: `External URL: ${externalUrl}` });
        } else if (externalUrl.startsWith('http://')) {
          findings.critical.push({ id: 'ssl_external', title: 'External access without SSL!', desc: `External URL uses plain HTTP: ${externalUrl}`, fix: 'Configure SSL/TLS for external access via NGINX, Cloudflare tunnel, or DuckDNS addon' });
        }
      } else {
        findings.info.push({ id: 'ssl_external', title: 'No external URL configured', desc: 'HA is only accessible locally (or external access not configured in HA)', fix: 'If you access HA remotely, configure external_url in configuration.yaml' });
      }

      const internalUrl = configEntries?.internal_url || '';
      if (internalUrl && internalUrl.startsWith('https://')) {
        findings.pass.push({ id: 'ssl_internal', title: 'Internal access uses HTTPS', desc: `Internal URL: ${internalUrl}` });
      }

      let users = [];
      try {
        const userList = await this._hass.callWS({ type: 'config/auth/list' });
        users = userList || [];
      } catch(e) {}

      if (users.length > 0) {
        const activeUsers = users.filter(u => u.is_active !== false);
        findings.info.push({ id: 'user_count', title: `${activeUsers.length} active user(s)`, desc: `Total registered: ${users.length}` });

        const owners = users.filter(u => u.is_owner);
        if (owners.length > 1) {
          findings.warning.push({ id: 'multi_owner', title: `${owners.length} owner accounts detected`, desc: owners.map(u => u.name).join(', '), fix: 'Limit owner accounts to minimize attack surface. Demote unnecessary owners to admin.' });
        }

        const localOnly = users.filter(u => u.local_only);
        if (localOnly.length > 0) {
          findings.pass.push({ id: 'local_only_users', title: `${localOnly.length} user(s) restricted to local access`, desc: localOnly.map(u => u.name).join(', ') });
        }
      }

      const states = this._hass.states;
      const allEntities = Object.keys(states || {});

      const shellEntities = allEntities.filter(e => e.startsWith('shell_command.'));
      if (shellEntities.length > 0) {
        findings.info.push({ id: 'shell_commands', title: `${shellEntities.length} shell command(s) configured`, desc: shellEntities.slice(0, 5).join(', ') + (shellEntities.length > 5 ? '...' : ''), fix: 'Ensure shell commands don\'t execute untrusted input' });
      }

      const sshAddon = installedAddons.find(a => a.slug?.includes('ssh') || a.name?.toLowerCase().includes('ssh'));
      if (sshAddon) {
        if (sshAddon.state === 'started') {
          findings.warning.push({ id: 'ssh_addon', title: 'SSH addon is running', desc: `${sshAddon.name} (${sshAddon.version})`, fix: 'Ensure SSH uses key-based auth. Disable if not actively needed.' });
        } else {
          findings.info.push({ id: 'ssh_addon', title: 'SSH addon installed but stopped', desc: sshAddon.name });
        }
      }

      const mqttAddon = installedAddons.find(a => a.slug?.includes('mosquitto') || a.name?.toLowerCase().includes('mqtt'));
      if (mqttAddon && mqttAddon.state === 'started') {
        findings.info.push({ id: 'mqtt_broker', title: 'MQTT broker is running', desc: `${mqttAddon.name}`, fix: 'Ensure MQTT has authentication enabled and is not exposed to the internet' });
      }

      const automationEntities = allEntities.filter(e => e.startsWith('automation.'));
      const scriptEntities = allEntities.filter(e => e.startsWith('script.'));
      findings.info.push({ id: 'automation_count', title: `${automationEntities.length} automations, ${scriptEntities.length} scripts`, desc: 'Review automations periodically for unintended actions' });

      const riskyAddons = installedAddons.filter(a => {
        const name = (a.name || a.slug || '').toLowerCase();
        return name.includes('ftp') || name.includes('samba') || name.includes('telnet');
      });
      if (riskyAddons.length > 0) {
        findings.warning.push({ id: 'risky_services', title: 'Potentially risky network services', desc: riskyAddons.map(a => `${a.name} (${a.state || 'stopped'})`).join(', '), fix: 'Ensure file sharing services are properly secured and only accessible on local network' });
      }

      // NEW CHECK: HACS custom repositories
      try {
        const hacsSensor = states['sensor.hacs'];
        if (hacsSensor) {
          const customRepos = hacsSensor.attributes?.custom_repositories || [];
          if (customRepos.length > 0) {
            findings.info.push({ id: 'hacs_custom_repos', title: `${customRepos.length} custom HACS repository(ies) installed`, desc: customRepos.slice(0, 3).map(r => r.repository || r).join(', ') + (customRepos.length > 3 ? '...' : ''), fix: 'Review custom repositories for trust and source quality' });
          }
        }
      } catch(e) {}

      // NEW CHECK: Trusted networks / Auth providers
      try {
        const authProviders = this._hass.config?.auth_providers || [];
        const hasTrustedNetworks = authProviders.some(ap => ap.type === 'trusted_networks');
        if (hasTrustedNetworks) {
          findings.warning.push({ id: 'trusted_networks', title: 'Trusted networks auth provider enabled', desc: 'This reduces security by allowing local network access without authentication', fix: 'Disable trusted_networks or use only on fully isolated private networks' });
        }
        const hasLegacyApiPassword = authProviders.some(ap => ap.type === 'legacy_api_password');
        if (hasLegacyApiPassword) {
          findings.critical.push({ id: 'legacy_api_password', title: 'Legacy API password enabled', desc: 'Legacy API passwords are deprecated and less secure than long-lived access tokens', fix: 'Remove api_password from configuration.yaml and use long-lived access tokens instead' });
        }
      } catch(e) {}

      // NEW CHECK: IP bans
      try {
        const banData = await this._hass.callApi('GET', 'config/ip_ban');
        if (banData?.banned_ips && banData.banned_ips.length > 0) {
          findings.info.push({ id: 'ip_bans', title: `${banData.banned_ips.length} IP(s) are banned`, desc: 'Failed login attempts have resulted in IP bans', fix: 'Review failed login attempts in the System Log' });
        }
      } catch(e) {}

      // NEW CHECK: HTTP configuration
      try {
        const httpConfig = this._hass.config;
        if (httpConfig) {
          if (httpConfig.login_attempts_threshold === 0 || !httpConfig.hasOwnProperty('login_attempts_threshold')) {
            findings.warning.push({ id: 'login_attempts', title: 'Login attempt threshold not configured', desc: 'IP ban after failed logins may be disabled', fix: 'Set login_attempts_threshold in configuration.yaml (default: 5)' });
          }
          if (httpConfig.ip_ban_enabled === false) {
            findings.warning.push({ id: 'ip_ban_disabled', title: 'IP banning is disabled', desc: 'Failed login attempts will not result in IP bans', fix: 'Enable ip_ban_enabled in configuration.yaml' });
          }
          if (httpConfig.use_x_forwarded_for === true && !httpConfig.trusted_proxies) {
            findings.warning.push({ id: 'x_forwarded_for_unprotected', title: 'X-Forwarded-For enabled without trusted proxies', desc: 'This can allow IP spoofing if not behind a trusted proxy', fix: 'Either set trusted_proxies or disable use_x_forwarded_for' });
          }
        }
      } catch(e) {}

      // NEW CHECK: Privileged addons
      try {
        const privilegedAddons = installedAddons.filter(a => a.privileged === true);
        if (privilegedAddons.length > 0) {
          findings.warning.push({ id: 'privileged_addons', title: `${privilegedAddons.length} addon(s) with privileged access`, desc: privilegedAddons.map(a => a.name).join(', '), fix: 'Privileged addons have root-level access. Verify they are trustworthy and necessary.' });
        }
      } catch(e) {}

      // NEW CHECK: Exposed addon ports
      try {
        const exposedAddons = installedAddons.filter(a => {
          const hasPorts = a.ports && Object.keys(a.ports).length > 0;
          const hasNetwork = a.network && Object.keys(a.network).length > 0;
          return hasPorts || hasNetwork;
        });
        if (exposedAddons.length > 0) {
          const portList = exposedAddons.map(a => {
            const ports = a.ports ? Object.keys(a.ports).join(',') : '';
            return `${a.name}${ports ? `:${ports}` : ''}`;
          }).join('; ');
          findings.info.push({ id: 'exposed_addon_ports', title: `${exposedAddons.length} addon(s) expose port(s)`, desc: portList, fix: 'Ensure exposed ports are not accessible from the internet. Use firewall rules if needed.' });
        }
      } catch(e) {}

      // NEW CHECK: Ingress vs exposed addons
      try {
        const nonIngressAddons = installedAddons.filter(a => a.ingress !== true && a.ports && Object.keys(a.ports).length > 0);
        if (nonIngressAddons.length > 0) {
          findings.info.push({ id: 'non_ingress_addons', title: `${nonIngressAddons.length} addon(s) not using Ingress`, desc: nonIngressAddons.map(a => a.name).join(', '), fix: 'Consider using Ingress for safer addon access (only through HA UI)' });
        }
      } catch(e) {}

      // NEW CHECK: Webhooks
      try {
        const webhookEntities = allEntities.filter(e => e.startsWith('automation.') || e.startsWith('script.'));
        let webhookCount = 0;
        webhookEntities.forEach(e => {
          const state = states[e];
          if (state?.attributes?.description?.includes('webhook') || state?.attributes?.trigger?.includes('webhook')) {
            webhookCount++;
          }
        });
        if (webhookCount > 0) {
          findings.info.push({ id: 'webhooks', title: `${webhookCount} automation(s)/script(s) with webhook(s)`, desc: 'Webhooks expose endpoints that can be triggered from the internet', fix: 'Ensure webhook URLs are not shared publicly. Use strong secrets in webhook URLs.' });
        }
      } catch(e) {}

      // NEW CHECK: Long-lived access tokens
      try {
        const tokenCount = users.filter(u => u.refresh_tokens && u.refresh_tokens.length > 0).length;
        if (tokenCount > 0) {
          findings.info.push({ id: 'access_tokens', title: `${tokenCount} user(s) with long-lived access token(s)`, desc: 'Access tokens should be rotated regularly and kept secure', fix: 'Rotate tokens periodically. Remove unused tokens from Settings \u2192 Users' });
        }
      } catch(e) {}

      // NEW CHECK: Camera entities
      try {
        const cameraEntities = allEntities.filter(e => e.startsWith('camera.'));
        if (cameraEntities.length > 0) {
          findings.info.push({ id: 'camera_count', title: `${cameraEntities.length} camera(s) configured`, desc: 'Camera streams should not be exposed directly to the internet', fix: 'Use Secure (SSL/TLS) connection. Do not expose camera ports directly. Use Nabu Casa or tunnel.' });
        }
      } catch(e) {}

      // NEW CHECK: Media source / proxy exposure
      try {
        const mediaEntities = allEntities.filter(e => e.startsWith('media_player.'));
        if (mediaEntities.length > 0) {
          findings.info.push({ id: 'media_exposure', title: `${mediaEntities.length} media player(s) configured`, desc: 'Ensure media sources are not serving public content', fix: 'Use local media libraries. Do not expose media over the internet unless necessary.' });
        }
      } catch(e) {}

      // NEW CHECK: Recorder / history purge settings
      try {
        const recorderEntities = allEntities.filter(e => e.startsWith('recorder.'));
        if (recorderEntities.length > 0) {
          const recorderState = states['automation.'] || states['script.'];
          const purgeKeepDays = this._hass.config?.components?.recorder?.purge_keep_days;
          if (purgeKeepDays && purgeKeepDays > 30) {
            findings.info.push({ id: 'recorder_retention', title: `Recorder keeping data for ${purgeKeepDays} days`, desc: 'Long retention can be a privacy concern if you have guests or visitors', fix: 'Consider reducing purge_keep_days in configuration.yaml if privacy is a concern' });
          }
        }
      } catch(e) {}

      // NEW CHECK: Supervisor security (debug mode)
      try {
        if (supervisorInfo?.debug === true) {
          findings.warning.push({ id: 'supervisor_debug', title: 'Supervisor debug mode is enabled', desc: 'Debug mode exposes additional logs and may reduce security', fix: 'Disable debug mode in Supervisor settings unless troubleshooting' });
        }
        if (supervisorInfo?.debug_block === true) {
          findings.info.push({ id: 'supervisor_debug_block', title: 'Supervisor debug block is enabled', desc: 'This is a development/testing feature', fix: 'Ensure this is intentional and not left enabled in production' });
        }
      } catch(e) {}

      // NEW CHECK: HACS addon integrity
      try {
        const hacsAddon = installedAddons.find(a => a.slug === 'hacs');
        if (hacsAddon) {
          if (hacsAddon.update_available) {
            findings.warning.push({ id: 'hacs_update', title: 'HACS addon has an update available', desc: `Current: ${hacsAddon.version} \u2192 Latest: ${hacsAddon.version_latest}`, fix: 'Update HACS addon from Settings \u2192 Add-ons' });
          } else {
            findings.pass.push({ id: 'hacs_update', title: 'HACS addon is up to date', desc: `Version: ${hacsAddon.version}` });
          }
        }
      } catch(e) {}

      // NEW CHECK: Bluetooth / USB exposure in addons
      try {
        const btUsbAddons = installedAddons.filter(a => {
          const config = a.devices || [];
          return config.some(d => d && (d.includes('bluetooth') || d.includes('usb') || d.includes('/dev/bus/usb')));
        });
        if (btUsbAddons.length > 0) {
          findings.info.push({ id: 'bt_usb_addons', title: `${btUsbAddons.length} addon(s) with Bluetooth/USB access`, desc: btUsbAddons.map(a => a.name).join(', '), fix: 'Verify that these addons are trustworthy. USB/Bluetooth access provides direct hardware access.' });
        }
      } catch(e) {}

      // NEW CHECK: Firewall / Network isolation
      try {
        if (hostInfo?.chassis && hostInfo.chassis !== 'embedded') {
          findings.warning.push({ id: 'non_haos', title: 'Running on non-HAOS system', desc: `Detected chassis: ${hostInfo.chassis}. Missing Supervisor network isolation.`, fix: 'Use Home Assistant OS for built-in network security features. Manual firewall configuration required on generic Linux.' });
        }
      } catch(e) {}

      // NEW CHECK: Backup encryption
      try {
        const backups = await this._hass.callWS({ type: 'supervisor/api', endpoint: '/backups', method: 'get' });
        if (backups?.data?.backups && backups.data.backups.length > 0) {
          const unencryptedBackups = backups.data.backups.filter(b => b.protected === false);
          if (unencryptedBackups.length > 0) {
            findings.warning.push({ id: 'unencrypted_backups', title: `${unencryptedBackups.length} backup(s) without encryption`, desc: 'Unencrypted backups expose sensitive data', fix: 'Create new backups with a password. Set a backup password in Settings \u2192 System \u2192 Backups' });
          }
        }
      } catch(e) {}

      // NEW CHECK: MQTT anonymous access
      try {
        const mqttAddonRunning = installedAddons.find(a => (a.slug || '').includes('mosquitto') && a.state === 'started');
        if (mqttAddonRunning) {
          try {
            const mqttConfig = await this._hass.callWS({ type: 'supervisor/api', endpoint: `/addons/${mqttAddonRunning.slug}/options`, method: 'get' });
            const opts = mqttConfig?.data?.options || {};
            if (opts.anonymous === true) {
              findings.critical.push({ id: 'mqtt_anonymous', title: 'MQTT allows anonymous connections', desc: 'Anyone on the network can connect to your MQTT broker without authentication', fix: 'Disable anonymous access in Mosquitto addon configuration and set up proper user credentials' });
            } else {
              findings.pass.push({ id: 'mqtt_anonymous', title: 'MQTT requires authentication', desc: 'Anonymous connections are disabled' });
            }
          } catch(e2) {
            findings.info.push({ id: 'mqtt_config', title: 'Could not verify MQTT configuration', desc: 'Unable to read Mosquitto addon settings', fix: 'Manually verify MQTT authentication settings' });
          }
        }
      } catch(e) {}

      // NEW CHECK: Dangerous template sensors
      try {
        const templateEntities = allEntities.filter(e => e.includes('template') || e.includes('command_line'));
        if (templateEntities.length > 10) {
          findings.info.push({ id: 'template_sensors', title: `${templateEntities.length} template/command_line entities`, desc: 'Large number of template entities may indicate complex configs that need review', fix: 'Periodically review template sensors for security implications' });
        }
      } catch(e) {}

      // NEW CHECK: HTTP configuration (CORS)
      try {
        const httpConfig = this._hass.config;
        if (httpConfig?.components?.includes('cors') || httpConfig?.allowlist_external_urls?.length > 0) {
          findings.info.push({ id: 'cors_config', title: 'CORS or external URL allowlist configured', desc: 'Cross-origin requests or external URLs are permitted', fix: 'Review allowed origins and URLs to ensure they are trusted' });
        }
      } catch(e) {}

      // NEW CHECK: Port 8123 direct exposure
      try {
        const externalUrl = this._hass.config?.external_url || '';
        if (externalUrl && externalUrl.includes(':8123')) {
          findings.warning.push({ id: 'port_exposure', title: 'Default port 8123 exposed externally', desc: `External URL uses default HA port: ${externalUrl}`, fix: 'Use a reverse proxy (NGINX, Caddy) or Nabu Casa instead of direct port forwarding. Change default port if exposing directly.' });
        }
      } catch(e) {}

      // NEW CHECK: Person tracking entities
      try {
        const personEntities = allEntities.filter(e => e.startsWith('person.'));
        if (personEntities.length > 0) {
          findings.info.push({ id: 'person_tracking', title: `${personEntities.length} person(s) tracked`, desc: 'Location data is sensitive PII', fix: 'Ensure only trusted users have access to person entities. Review recorder include/exclude.' });
        }
      } catch(e) {}

      const critCount = findings.critical.length;
      const warnCount = findings.warning.length;
      const passCount = findings.pass.length;
      const infoCount = findings.info.length;
      const totalChecks = critCount + warnCount + passCount + infoCount;
      let score = 100;
      score -= critCount * 15;
      score -= warnCount * 5;
      score -= infoCount * 0.5;
      score = Math.max(0, Math.min(100, score));

      // Fetch network interfaces from Supervisor API
      let networkInfo = null;
      try {
        const netResp = await this._hass.callWS({ type: 'supervisor/api', endpoint: '/network/info', method: 'get' });
        networkInfo = netResp?.data?.interfaces || netResp?.result?.interfaces || [];
      } catch(ne) { networkInfo = []; }

      this._auditData = { findings, score, critCount, warnCount, passCount, infoCount, totalChecks, users, addons: installedAddons, entities: allEntities.length, networkInterfaces: networkInfo };
      this._lastScan = new Date();
    this._saveScanData();

    } catch(e) {
      console.error('[Security Check] Error:', e);
      this._auditData = { error: e.message };
    }

    this._loading = false;
    this._updateContent();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
/* ===== BENTO LIGHT MODE DESIGN SYSTEM ===== */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:host {
  --bento-primary: #3B82F6;
  --bento-primary-hover: #2563EB;
  --bento-primary-light: rgba(59, 130, 246, 0.08);
  --bento-success: #10B981;
  --bento-success-light: rgba(16, 185, 129, 0.08);
  --bento-error: #EF4444;
  --bento-error-light: rgba(239, 68, 68, 0.08);
  --bento-warning: #F59E0B;
  --bento-warning-light: rgba(245, 158, 11, 0.08);
  --bento-bg: #F8FAFC;
  --bento-card: #FFFFFF;
  --bento-border: #E2E8F0;
  --bento-text: #1E293B;
  --bento-text-secondary: #64748B;
  --bento-text-muted: #94A3B8;
  --bento-radius-xs: 6px;
  --bento-radius-sm: 10px;
  --bento-radius-md: 16px;
  --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04);
  --bento-shadow-lg: 0 8px 25px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04);
  --bento-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Card */
.card, .ha-card, ha-card, .main-card, .exporter-card, .security-card, .reports-card, .storage-card, .chore-card, .cry-card, .backup-card, .network-card, .sentence-card, .energy-card, .panel-card {
  background: var(--bento-card) !important;
  border: 1px solid var(--bento-border) !important;
  border-radius: var(--bento-radius-md) !important;
  box-shadow: var(--bento-shadow-sm) !important;
  font-family: 'Inter', sans-serif !important;
  color: var(--bento-text) !important;
  overflow: hidden;
  padding: 20px !important;
}

/* Headers */
.card-header, .header, .card-title, h1, h2, h3 {
  color: var(--bento-text) !important;
  font-family: 'Inter', sans-serif !important;
}
.card-header, .header {
  border-bottom: 1px solid var(--bento-border) !important;
  padding-bottom: 12px !important;
  margin-bottom: 16px !important;
}

/* Tabs */
.tabs, .tab-bar, .tab-nav, .tab-header {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid var(--bento-border);
  padding: 0 4px;
  margin-bottom: 20px;
  overflow-x: auto;
}
.tab, .tab-btn, .tab-button {
  padding: 10px 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  color: var(--bento-text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: var(--bento-transition);
  white-space: nowrap;
  border-radius: 0;
}
.tab:hover, .tab-btn:hover, .tab-button:hover {
  color: var(--bento-primary);
  background: var(--bento-primary-light);
}
.tab.active, .tab-btn.active, .tab-button.active {
  color: var(--bento-primary);
  border-bottom-color: var(--bento-primary);
  background: rgba(59, 130, 246, 0.04);
  font-weight: 600;
}

/* Tab content */
.tab-content { display: none; }
.tab-content.active { display: block; animation: bentoFadeIn 0.3s ease-out; }
@keyframes bentoFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

/* Buttons */
button, .btn, .action-btn {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  border-radius: var(--bento-radius-xs);
  transition: var(--bento-transition);
  cursor: pointer;
}
button.active, .btn.active, .btn-primary, .action-btn.active {
  background: var(--bento-primary) !important;
  color: white !important;
  border-color: var(--bento-primary) !important;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
}

/* Status badges */
.badge, .status-badge, .tag, .chip {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.badge-success, .status-ok, .status-good { background: var(--bento-success-light); color: var(--bento-success); }
.badge-error, .status-error, .status-critical { background: var(--bento-error-light); color: var(--bento-error); }
.badge-warning, .status-warning { background: var(--bento-warning-light); color: var(--bento-warning); }
.badge-info, .status-info { background: var(--bento-primary-light); color: var(--bento-primary); }

/* Tables */
table { width: 100%; border-collapse: separate; border-spacing: 0; font-family: 'Inter', sans-serif; }
th { background: var(--bento-bg); color: var(--bento-text-secondary); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 14px; text-align: left; border-bottom: 2px solid var(--bento-border); }
td { padding: 12px 14px; border-bottom: 1px solid var(--bento-border); color: var(--bento-text); font-size: 13px; }
tr:hover td { background: var(--bento-primary-light); }
tr:last-child td { border-bottom: none; }

/* Inputs & selects */
input, select, textarea {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  padding: 8px 12px;
  border: 1.5px solid var(--bento-border);
  border-radius: var(--bento-radius-xs);
  background: var(--bento-card);
  color: var(--bento-text);
  transition: var(--bento-transition);
  outline: none;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--bento-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Stat cards */
.stat-card, .stat, .metric-card, .stat-box, .overview-stat, .kpi-card {
  background: var(--bento-card);
  border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-sm);
  padding: 16px;
  transition: var(--bento-transition);
}
.stat-card:hover, .stat:hover, .metric-card:hover { box-shadow: var(--bento-shadow-md); transform: translateY(-1px); }
.stat-value, .metric-value, .stat-number { font-size: 28px; font-weight: 700; color: var(--bento-text); font-family: 'Inter', sans-serif; }
.stat-label, .metric-label, .stat-title { font-size: 12px; font-weight: 500; color: var(--bento-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }

/* Canvas override (prevent Bento CSS from distorting charts) */
canvas {
  max-width: 100% !important;
  height: auto !important;
  width: auto !important;
  border: none !important;
}

/* Pagination */
.pagination, .pag {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding: 16px 0;
  border-top: 1px solid var(--bento-border);
}
.pagination-btn, .pag-btn {
  padding: 8px 14px;
  border: 1.5px solid var(--bento-border);
  background: var(--bento-card);
  color: var(--bento-text);
  border-radius: var(--bento-radius-xs);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  transition: var(--bento-transition);
}
.pagination-btn:hover:not(:disabled), .pag-btn:hover:not(:disabled) { background: var(--bento-primary); color: white; border-color: var(--bento-primary); }
.pagination-btn:disabled, .pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination-info, .pag-info { font-size: 13px; color: var(--bento-text-secondary); font-weight: 500; padding: 0 8px; }
.page-size-select { padding: 6px 10px; border: 1.5px solid var(--bento-border); border-radius: var(--bento-radius-xs); font-size: 12px; font-family: 'Inter', sans-serif; }

/* Empty state */
.empty-state, .no-data, .no-results {
  text-align: center;
  padding: 48px 24px;
  color: var(--bento-text-secondary);
  font-size: 14px;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bento-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--bento-text-muted); }

/* ===== END BENTO LIGHT MODE ===== */


@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:host {
  --bento-bg: #F8FAFC;
  --bento-card: #FFFFFF;
  --bento-primary: #3B82F6;
  --bento-primary-hover: #2563EB;
  --bento-text: #1E293B;
  --bento-text-secondary: #64748B;
  --bento-border: #E2E8F0;
  --bento-success: #10B981;
  --bento-warning: #F59E0B;
  --bento-error: #EF4444;
  --bento-radius: 16px;
  --bento-radius-sm: 10px;
  --bento-radius-xs: 6px;
  --bento-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.06);
  --bento-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: block;
  color-scheme: light !important;
}
* { box-sizing: border-box; }

.card, .card-container, .reports-card, .export-card {
  background: var(--bento-card); border-radius: var(--bento-radius); box-shadow: var(--bento-shadow);
  padding: 28px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--bento-text); border: 1px solid var(--bento-border); animation: fadeSlideIn 0.4s ease-out;
}
.card-header { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--bento-text); letter-spacing: -0.01em; display: flex; justify-content: space-between; align-items: center; }
.card-header h2 { font-size: 20px; font-weight: 700; color: var(--bento-text); margin: 0; letter-spacing: -0.01em; }
.card-title, .title, .header-title, .pan-title { font-size: 20px; font-weight: 700; color: var(--bento-text); letter-spacing: -0.01em; }
.header, .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--bento-border); margin-bottom: 24px; overflow-x: auto; padding-bottom: 0; }
.tab, .tab-btn, .tab-button { padding: 10px 20px; border: none; background: transparent; color: var(--bento-text-secondary); cursor: pointer; font-size: 14px; font-weight: 500; border-bottom: 2px solid transparent; transition: var(--bento-transition); white-space: nowrap; margin-bottom: -2px; border-radius: 8px 8px 0 0; font-family: 'Inter', sans-serif; }
.tab.active, .tab-btn.active, .tab-button.active { color: var(--bento-primary); border-bottom-color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
.tab:hover, .tab-btn:hover, .tab-button:hover { color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
.tab-icon { margin-right: 6px; }
.tab-content { display: none; }
.tab-content.active { display: block; animation: fadeSlideIn 0.3s ease-out; }

button, .btn, .btn-s { padding: 9px 16px; border: 1.5px solid var(--bento-border); background: var(--bento-card); color: var(--bento-text); border-radius: var(--bento-radius-sm); cursor: pointer; font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif; transition: var(--bento-transition); }
button:hover, .btn:hover, .btn-s:hover { background: var(--bento-bg); border-color: var(--bento-primary); color: var(--bento-primary); }
button.active, .btn.active, .btn-act { background: var(--bento-primary); color: white; border-color: var(--bento-primary); box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25); }
.btn-primary { padding: 9px 16px; background: var(--bento-primary); color: white; border: 1.5px solid var(--bento-primary); border-radius: var(--bento-radius-sm); cursor: pointer; font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif; transition: var(--bento-transition); box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25); }
.btn-primary:hover { background: var(--bento-primary-hover); border-color: var(--bento-primary-hover); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35); transform: translateY(-1px); }
.btn-secondary { padding: 9px 16px; background: var(--bento-card); color: var(--bento-text); border: 1.5px solid var(--bento-border); border-radius: var(--bento-radius-sm); cursor: pointer; font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif; transition: var(--bento-transition); }
.btn-secondary:hover { border-color: var(--bento-primary); color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
.btn-danger { padding: 9px 16px; background: var(--bento-card); color: var(--bento-error); border: 1.5px solid var(--bento-error); border-radius: var(--bento-radius-sm); cursor: pointer; font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif; transition: var(--bento-transition); }
.btn-danger:hover { background: var(--bento-error); color: white; }
.btn-small { padding: 5px 12px; font-size: 12px; border: 1px solid var(--bento-border); background: var(--bento-card); color: var(--bento-text-secondary); border-radius: var(--bento-radius-xs); cursor: pointer; font-weight: 500; font-family: 'Inter', sans-serif; transition: var(--bento-transition); }
.btn-small:hover { border-color: var(--bento-primary); color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }

input[type="text"], input[type="number"], input[type="date"], input[type="time"], input[type="email"], input[type="search"], select, textarea, .search-input, .sinput, .sinput-sm, .alert-search-box, .period-select { padding: 9px 14px; border: 1.5px solid var(--bento-border); border-radius: var(--bento-radius-sm); font-size: 13px; background: var(--bento-card); color: var(--bento-text); font-family: 'Inter', sans-serif; transition: var(--bento-transition); outline: none; }
input[type="text"]:focus, input[type="number"]:focus, input[type="date"]:focus, input[type="time"]:focus, select:focus, textarea:focus, .search-input:focus, .sinput:focus, .sinput-sm:focus, .alert-search-box:focus, .period-select:focus { border-color: var(--bento-primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
input::placeholder, .search-input::placeholder, .sinput::placeholder, .sinput-sm::placeholder { color: var(--bento-text-secondary); opacity: 0.7; }
.form-group { margin-bottom: 16px; }
.form-group.full { grid-column: 1 / -1; }
.form-row { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
label, .cg label, .clbl { display: block; font-size: 12px; font-weight: 600; color: var(--bento-text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.03em; }
.add-form { background: var(--bento-bg); border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); padding: 20px; margin-bottom: 20px; }
textarea { min-height: 80px; resize: vertical; }

.stats, .stats-grid, .stats-container, .summary-grid, .network-stats, .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px; }
.stat, .stat-card, .summary-card, .network-stat, .metric-card, .kpi-card { background: var(--bento-bg); border-radius: var(--bento-radius-sm); padding: 16px; border: 1px solid var(--bento-border); transition: var(--bento-transition); text-align: center; }
.stat:hover, .stat-card:hover, .summary-card:hover, .network-stat:hover, .metric-card:hover { border-color: var(--bento-primary); box-shadow: var(--bento-shadow-md); transform: translateY(-1px); }
.stat-card.online { border-left: 3px solid var(--bento-success); }
.stat-card.offline { border-left: 3px solid var(--bento-error); }
.sv, .stat-value, .summary-value, .network-stat-value, .metric-value { font-size: 24px; font-weight: 700; color: var(--bento-primary); line-height: 1.2; }
.stat.ok .sv { color: var(--bento-success); }
.stat.err .sv { color: var(--bento-error); }
.sl, .stat-label, .summary-label, .network-stat-label, .metric-label { font-size: 12px; color: var(--bento-text-secondary); font-weight: 500; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.03em; }
.stat-trend { font-size: 12px; font-weight: 600; margin-top: 4px; }
.stat-trend.positive, .trend-up { color: var(--bento-success); }
.stat-trend.negative, .trend-down { color: var(--bento-error); }

.device-table, .entity-table, .table, .alert-table, .data-table, .backup-table, .history-table, .log-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 16px; }
.device-table th, .entity-table th, .table th, .alert-table th, .data-table th, .backup-table th, table th { text-align: left; padding: 12px 16px; border-bottom: 2px solid var(--bento-border); font-weight: 600; color: var(--bento-text-secondary); background: var(--bento-bg); cursor: pointer; user-select: none; white-space: nowrap; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; transition: var(--bento-transition); font-family: 'Inter', sans-serif; }
.device-table th:first-child, .entity-table th:first-child, .table th:first-child, table th:first-child { border-radius: var(--bento-radius-xs) 0 0 0; }
.device-table th:last-child, .entity-table th:last-child, .table th:last-child, table th:last-child { border-radius: 0 var(--bento-radius-xs) 0 0; }
.device-table th:hover, .entity-table th:hover, .table th:hover, table th:hover { background: rgba(59, 130, 246, 0.06); color: var(--bento-primary); }
.device-table th.sorted, .entity-table th.sorted, .table th.sorted, table th.sorted { background: rgba(59, 130, 246, 0.08); color: var(--bento-primary); }
.device-table td, .entity-table td, .table td, .alert-table td, .data-table td, .backup-table td, table td { padding: 12px 16px; border-bottom: 1px solid var(--bento-border); color: var(--bento-text); font-size: 13px; font-family: 'Inter', sans-serif; }
.device-table tr:hover, .entity-table tr:hover, .table tbody tr:hover, .alert-table tr:hover, table tr:hover { background: rgba(59, 130, 246, 0.03); }
.table-container { overflow-x: auto; border-radius: var(--bento-radius-sm); border: 1px solid var(--bento-border); }
.sort-indicator { font-size: 10px; margin-left: 4px; color: var(--bento-primary); }

.status-badge, .severity-badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; }
.status-online, .status-home, .status-active, .status-ok, .status-healthy, .status-running, .status-complete, .status-completed, .status-success, .badge-success { background: rgba(16, 185, 129, 0.1); color: #059669; }
.status-offline, .status-error, .status-failed, .status-critical, .severity-critical, .badge-error, .badge-danger { background: rgba(239, 68, 68, 0.1); color: #DC2626; }
.status-away, .status-warning, .severity-warning, .badge-warning { background: rgba(245, 158, 11, 0.1); color: #B45309; }
.status-unavailable, .status-unknown, .status-idle, .status-inactive, .status-stopped, .badge-neutral { background: rgba(100, 116, 139, 0.1); color: var(--bento-text-secondary); }
.status-zone, .severity-info, .badge-info { background: rgba(59, 130, 246, 0.1); color: var(--bento-primary); }

.alert-item { padding: 14px 18px; border-left: 4px solid var(--bento-border); border-radius: 0 var(--bento-radius-sm) var(--bento-radius-sm) 0; margin-bottom: 10px; background: var(--bento-bg); display: flex; justify-content: space-between; align-items: center; transition: var(--bento-transition); }
.alert-item:hover { box-shadow: var(--bento-shadow); }
.alert-critical { border-color: var(--bento-error); background: rgba(239, 68, 68, 0.04); }
.alert-warning { border-color: var(--bento-warning); background: rgba(245, 158, 11, 0.04); }
.alert-info { border-color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
.alert-text { flex: 1; }
.alert-type { font-weight: 600; font-size: 13px; margin-bottom: 4px; color: var(--bento-text); }
.alert-time { font-size: 12px; color: var(--bento-text-secondary); }
.alert-actions { display: flex; gap: 8px; }
.alert-dismiss { padding: 6px 12px; font-size: 12px; background: var(--bento-card); color: var(--bento-text-secondary); border: 1px solid var(--bento-border); border-radius: var(--bento-radius-xs); cursor: pointer; font-weight: 500; transition: var(--bento-transition); }
.alert-dismiss:hover { background: var(--bento-error); color: white; border-color: var(--bento-error); }

.section { margin-bottom: 24px; }
.section h3, .section-title, .pan-head { font-size: 16px; font-weight: 600; color: var(--bento-text); margin-bottom: 12px; letter-spacing: -0.01em; }

.battery-grid, .grid, .items-grid, .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.battery-card, .item-card, .chore-card, .entry-card, .backup-card { background: var(--bento-bg); border-radius: var(--bento-radius-sm); padding: 16px; border: 1px solid var(--bento-border); transition: var(--bento-transition); }
.battery-card:hover, .item-card:hover, .chore-card:hover, .entry-card:hover, .backup-card:hover { box-shadow: var(--bento-shadow-md); border-color: var(--bento-primary); transform: translateY(-1px); }
.chore-card.priority-high { border-left: 3px solid var(--bento-error); }
.chore-card.priority-medium { border-left: 3px solid var(--bento-warning); }
.chore-card.priority-low { border-left: 3px solid var(--bento-success); }
.chore-title, .entry-title, .item-title { font-weight: 600; font-size: 14px; color: var(--bento-text); margin-bottom: 6px; }
.chore-meta, .entry-meta, .item-meta { font-size: 12px; color: var(--bento-text-secondary); }
.chore-assignee { font-size: 12px; color: var(--bento-primary); font-weight: 500; }
.chore-actions, .item-actions, .entry-actions { display: flex; gap: 6px; margin-top: 10px; }

.battery-bar, .progress-bar, .bandwidth-bar-bg { width: 100%; height: 8px; background: var(--bento-border); border-radius: 4px; overflow: hidden; margin-top: 8px; }
.battery-fill, .progress-fill, .bandwidth-bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); background: var(--bento-success); }
.battery-fill.battery_critical { background: var(--bento-error) !important; }
.battery-fill.battery_warning { background: var(--bento-warning) !important; }
.battery-label, .bandwidth-label { font-size: 13px; color: var(--bento-text); font-weight: 500; display: flex; justify-content: space-between; align-items: center; }

.pagination, .pag { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px; padding: 16px 0; border-top: 1px solid var(--bento-border); }
.pagination-btn, .pag-btn { padding: 8px 14px; border: 1.5px solid var(--bento-border); background: var(--bento-card); color: var(--bento-text); border-radius: var(--bento-radius-xs); cursor: pointer; font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif; transition: var(--bento-transition); }
.pagination-btn:hover:not(:disabled), .pag-btn:hover:not(:disabled) { background: var(--bento-primary); color: white; border-color: var(--bento-primary); }
.pagination-btn:disabled, .pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination-info, .pag-info { font-size: 13px; color: var(--bento-text-secondary); font-weight: 500; padding: 0 8px; }
.page-size-selector, .pag-size { padding: 6px 10px; border: 1.5px solid var(--bento-border); border-radius: var(--bento-radius-xs); background: var(--bento-card); color: var(--bento-text); font-size: 13px; cursor: pointer; font-family: 'Inter', sans-serif; }

.col-main { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--bento-text); }
.topbar-r { display: flex; gap: 8px; align-items: center; }
.panels { display: flex; gap: 12px; }
.pan-left, .pan-center, .pan-right { background: var(--bento-card); border-radius: var(--bento-radius-sm); border: 1px solid var(--bento-border); overflow: hidden; }
.cbar { display: flex; gap: 8px; align-items: center; padding: 12px; background: var(--bento-bg); border-bottom: 1px solid var(--bento-border); }
.cg { display: flex; gap: 8px; align-items: center; }
.cg-r { margin-left: auto; }

.dd { position: relative; }
.dd-menu { position: absolute; top: 100%; left: 0; background: var(--bento-card); border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); box-shadow: var(--bento-shadow-md); min-width: 180px; z-index: 100; display: none; overflow: hidden; }
.dd.open .dd-menu { display: block; }
.dd-i { padding: 10px 16px; cursor: pointer; font-size: 13px; color: var(--bento-text); transition: var(--bento-transition); font-family: 'Inter', sans-serif; }
.dd-i:hover { background: rgba(59, 130, 246, 0.06); color: var(--bento-primary); }
.dd-div { border-top: 1px solid var(--bento-border); margin: 4px 0; }

.auto-item, .tr-item, .list-item, .automation-item { padding: 12px 16px; cursor: pointer; border-bottom: 1px solid var(--bento-border); display: flex; align-items: center; gap: 10px; transition: var(--bento-transition); font-family: 'Inter', sans-serif; }
.auto-item:hover, .tr-item:hover, .list-item:hover, .automation-item:hover { background: rgba(59, 130, 246, 0.04); }
.auto-item.sel, .tr-item.sel, .list-item.selected, .automation-item.selected { background: rgba(59, 130, 246, 0.08); border-left: 3px solid var(--bento-primary); }
.auto-item.error-item, .automation-item.error-item { border-left: 3px solid var(--bento-error); }
.auto-name { font-weight: 500; font-size: 13px; color: var(--bento-text); }
.auto-meta { font-size: 12px; color: var(--bento-text-secondary); }
.auto-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--bento-text-secondary); }
.auto-dot.s-running { background: var(--bento-success); }
.auto-dot.s-stopped { background: var(--bento-text-secondary); }
.auto-dot.s-error { background: var(--bento-error); }
.auto-count { font-size: 11px; color: var(--bento-text-secondary); margin-left: auto; }

.tgroup { border: 1px solid var(--bento-border); border-radius: var(--bento-radius-xs); margin-bottom: 8px; overflow: hidden; }
.tgroup-h { padding: 10px 14px; background: var(--bento-bg); display: flex; align-items: center; gap: 8px; cursor: pointer; transition: var(--bento-transition); font-family: 'Inter', sans-serif; }
.tgroup-h:hover { background: rgba(59, 130, 246, 0.06); }
.tg-tog { transition: transform 0.2s; font-size: 12px; color: var(--bento-text-secondary); }
.tgroup.collapsed .tg-tog { transform: rotate(-90deg); }
.tgroup.collapsed .tgroup-items { display: none; }
.tg-name { font-weight: 600; font-size: 13px; color: var(--bento-text); }
.tg-cnt { font-size: 11px; color: var(--bento-text-secondary); margin-left: auto; background: var(--bento-border); padding: 2px 8px; border-radius: 10px; }

.device-detail, .detail-panel, .details { background: var(--bento-bg); border-radius: var(--bento-radius-sm); padding: 16px; border: 1px solid var(--bento-border); }
.detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bento-border); font-size: 13px; }
.detail-row:last-child { border-bottom: none; }
.detail-label { color: var(--bento-text-secondary); font-weight: 500; }
.detail-value { color: var(--bento-text); font-weight: 600; }

.board { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 8px; }
.column { min-width: 260px; background: var(--bento-bg); border-radius: var(--bento-radius-sm); padding: 12px; border: 1px solid var(--bento-border); }
.column-header { font-weight: 600; font-size: 14px; color: var(--bento-text); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
.column-count { background: var(--bento-border); color: var(--bento-text-secondary); font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }

.schedule, .calendar { margin-top: 16px; }
.week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-top: 16px; }
.week-header { padding: 8px; text-align: center; font-size: 12px; font-weight: 600; color: var(--bento-text-secondary); text-transform: uppercase; letter-spacing: 0.03em; border-radius: var(--bento-radius-xs); }
.week-cell { padding: 8px; text-align: center; font-size: 12px; background: var(--bento-bg); border: 1px solid var(--bento-border); cursor: pointer; transition: var(--bento-transition); border-radius: var(--bento-radius-xs); }
.week-cell:hover { border-color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
.chore-item { padding: 8px 12px; border-bottom: 1px solid var(--bento-border); font-size: 13px; }

.leaderboard { background: var(--bento-bg); border-radius: var(--bento-radius-sm); border: 1px solid var(--bento-border); overflow: hidden; }
.leaderboard-row { display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--bento-border); gap: 12px; font-size: 13px; transition: var(--bento-transition); }
.leaderboard-row:last-child { border-bottom: none; }
.leaderboard-row:hover { background: rgba(59, 130, 246, 0.04); }
.rank { font-weight: 700; color: var(--bento-primary); font-size: 14px; min-width: 28px; }
.name { font-weight: 500; color: var(--bento-text); flex: 1; }
.streak { color: var(--bento-warning); font-weight: 600; }
.completion { color: var(--bento-success); font-weight: 600; }

.baby-selector { display: flex; gap: 8px; margin-bottom: 16px; }
.quick-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.quick-btn, .action-btn { padding: 10px 16px; border: 1.5px solid var(--bento-border); background: var(--bento-card); border-radius: var(--bento-radius-sm); cursor: pointer; font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif; transition: var(--bento-transition); display: flex; align-items: center; gap: 6px; color: var(--bento-text); }
.quick-btn:hover, .action-btn:hover { border-color: var(--bento-primary); color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
.quick-btn.active, .action-btn.active { background: var(--bento-primary); color: white; border-color: var(--bento-primary); }
.timeline { position: relative; padding-left: 24px; }
.timeline-item { padding: 12px 0; border-bottom: 1px solid var(--bento-border); position: relative; }
.timeline-time { font-size: 12px; color: var(--bento-text-secondary); font-weight: 500; }
.timeline-content { font-size: 13px; color: var(--bento-text); margin-top: 4px; }

canvas, .canvas-container canvas { width: 100%; height: 200px; border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); margin-bottom: 16px; }
.canvas-container { position: relative; margin-bottom: 16px; }
.chart-container { background: var(--bento-bg); border-radius: var(--bento-radius-sm); padding: 16px; border: 1px solid var(--bento-border); margin-bottom: 16px; }

.empty, .empty-state { text-align: center; padding: 48px 24px; color: var(--bento-text-secondary); font-size: 14px; font-family: 'Inter', sans-serif; }
.empty-ico, .empty-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.5; }
.spinner { width: 32px; height: 32px; border: 3px solid var(--bento-border); border-top: 3px solid var(--bento-primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 24px auto; }

.search-box, .search-bar, .controls, .ctrls, .filter-bar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
.control-group { display: flex; gap: 8px; align-items: center; }

.domain-group-header { margin-top: 20px; padding: 10px 16px; background: var(--bento-bg); border-radius: var(--bento-radius-xs); font-weight: 600; font-size: 14px; color: var(--bento-text); border: 1px solid var(--bento-border); }
.domain-group-header:first-child { margin-top: 0; }
.domain-group-count { font-weight: 500; color: var(--bento-text-secondary); font-size: 12px; margin-left: 8px; }

.automation-list, .list, .item-list { border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); overflow: hidden; }
.automation-name, .entity-name { font-weight: 500; font-size: 13px; color: var(--bento-text); }
.automation-id, .entity-id { font-size: 11px; color: var(--bento-text-secondary); }
.error-badge, .count-badge { background: var(--bento-error); color: white; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; margin-left: 6px; }
.tab .error-badge { background: var(--bento-error); color: white; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 10px; margin-left: 6px; }

.health-score, .score { font-size: 48px; font-weight: 700; color: var(--bento-primary); text-align: center; margin: 16px 0; }
.emoji { font-size: 20px; line-height: 1; }
.device-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: rgba(59, 130, 246, 0.08); border-radius: var(--bento-radius-xs); font-size: 16px; }

.recommendation-card, .tip-card, .suggestion-card { background: var(--bento-bg); border-radius: var(--bento-radius-sm); padding: 16px; border: 1px solid var(--bento-border); margin-bottom: 12px; transition: var(--bento-transition); }
.recommendation-card:hover, .tip-card:hover, .suggestion-card:hover { border-color: var(--bento-primary); box-shadow: var(--bento-shadow-md); }

.export-options, .options-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px; }
.export-option, .option-card { background: var(--bento-bg); border: 1.5px solid var(--bento-border); border-radius: var(--bento-radius-sm); padding: 16px; cursor: pointer; transition: var(--bento-transition); text-align: center; }
.export-option:hover, .option-card:hover { border-color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
.export-option.selected, .option-card.selected { border-color: var(--bento-primary); background: rgba(59, 130, 246, 0.08); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

.storage-bar, .usage-bar { width: 100%; height: 24px; background: var(--bento-border); border-radius: var(--bento-radius-xs); overflow: hidden; margin-bottom: 12px; }
.storage-fill, .usage-fill { height: 100%; border-radius: var(--bento-radius-xs); transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); background: var(--bento-primary); }

.check-item, .security-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--bento-border); transition: var(--bento-transition); }
.check-item:hover, .security-item:hover { background: rgba(59, 130, 246, 0.03); }
.check-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 16px; }
.check-icon.pass { background: rgba(16, 185, 129, 0.1); }
.check-icon.fail { background: rgba(239, 68, 68, 0.1); }
.check-icon.warn { background: rgba(245, 158, 11, 0.1); }
.check-text, .security-text { flex: 1; }
.check-title { font-weight: 600; font-size: 13px; color: var(--bento-text); }
.check-desc { font-size: 12px; color: var(--bento-text-secondary); margin-top: 2px; }

.waveform { background: var(--bento-bg); border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); padding: 16px; margin-bottom: 16px; }
.analysis-result, .result-card { background: var(--bento-bg); border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); padding: 20px; text-align: center; margin-bottom: 16px; }
.confidence-bar { height: 8px; background: var(--bento-border); border-radius: 4px; overflow: hidden; margin-top: 8px; }
.confidence-fill { height: 100%; border-radius: 4px; background: var(--bento-primary); transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1); }

.sentence-item, .intent-item { padding: 12px 16px; border-bottom: 1px solid var(--bento-border); display: flex; justify-content: space-between; align-items: center; transition: var(--bento-transition); }
.sentence-item:hover, .intent-item:hover { background: rgba(59, 130, 246, 0.03); }
.sentence-text { font-size: 13px; color: var(--bento-text); font-family: 'Inter', sans-serif; }
.intent-badge { display: inline-flex; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: rgba(59, 130, 246, 0.1); color: var(--bento-primary); }

.backup-item, .backup-entry { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid var(--bento-border); transition: var(--bento-transition); }
.backup-item:hover, .backup-entry:hover { background: rgba(59, 130, 246, 0.03); }
.backup-name { font-weight: 500; font-size: 14px; color: var(--bento-text); }
.backup-date, .backup-size { font-size: 12px; color: var(--bento-text-secondary); }

.report-section { background: var(--bento-bg); border-radius: var(--bento-radius-sm); padding: 20px; border: 1px solid var(--bento-border); margin-bottom: 16px; }
.insight-card { padding: 14px; border-left: 3px solid var(--bento-primary); background: rgba(59, 130, 246, 0.04); border-radius: 0 var(--bento-radius-xs) var(--bento-radius-xs) 0; margin-bottom: 10px; }

@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bento-border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--bento-text-secondary); }

@media (max-width: 768px) {
  .card, .card-container, .reports-card, .export-card { padding: 16px; }
  .stats, .stats-grid, .summary-grid { grid-template-columns: repeat(2, 1fr); }
  .panels { flex-direction: column; }
  .board { flex-direction: column; }
  .column { min-width: unset; }
}

/* ===== SECURITY CHECK SPECIFIC ===== */
.score-section { display: flex; align-items: center; gap: 24px; margin-bottom: 20px; padding: 16px; background: var(--bento-bg); border-radius: var(--bento-radius-sm); border: 1px solid var(--bento-border); }
.score-ring { position: relative; width: 120px; height: 120px; flex-shrink: 0; }
.score-ring svg { width: 120px; height: 120px; transform: rotate(-90deg); }
.score-bg { fill: none; stroke: var(--bento-border); stroke-width: 8; }
.score-fill { fill: none; stroke-width: 8; stroke-linecap: round; transition: stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
.score-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
.score-num { font-size: 28px; font-weight: 700; font-family: 'Inter', sans-serif; line-height: 1.2; }
.score-label { font-size: 11px; color: var(--bento-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.score-summary { flex: 1; }
.score-summary h3 { margin: 0 0 12px 0; font-size: 15px; font-weight: 600; }
.summary-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; color: var(--bento-text-secondary); }
.summary-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.summary-count { font-weight: 700; color: var(--bento-text); min-width: 20px; }

.finding { padding: 14px 16px; border-radius: var(--bento-radius-sm); border: 1px solid var(--bento-border); margin-bottom: 8px; background: var(--bento-card); transition: var(--bento-transition); }
.finding:hover { box-shadow: var(--bento-shadow-sm); }
.finding.critical { border-left: 3px solid #f44336; }
.finding.warning { border-left: 3px solid #ff9800; }
.finding.info { border-left: 3px solid #03a9f4; }
.finding.pass { border-left: 3px solid #4caf50; }
.finding-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.finding-icon { font-size: 16px; }
.finding-title { font-weight: 600; font-size: 13px; color: var(--bento-text); flex: 1; }
.finding-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
.badge-critical { background: rgba(244, 67, 54, 0.1); color: #f44336; }
.badge-warning { background: rgba(255, 152, 0, 0.1); color: #ff9800; }
.badge-info { background: rgba(3, 169, 244, 0.1); color: #03a9f4; }
.badge-pass { background: rgba(76, 175, 80, 0.1); color: #4caf50; }
.finding-desc { font-size: 12px; color: var(--bento-text-secondary); line-height: 1.5; }
.finding-fix { font-size: 12px; color: var(--bento-primary); margin-top: 6px; font-weight: 500; }

.section-title { font-size: 14px; font-weight: 600; color: var(--bento-text); margin: 16px 0 8px 0; padding-bottom: 6px; border-bottom: 1px solid var(--bento-border); }
.section-title:first-child { margin-top: 0; }

.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }

.scan-info { font-size: 12px; color: var(--bento-text-muted); text-align: right; margin-top: 12px; font-style: italic; }

.tip-box { padding: 14px 16px; background: var(--bento-bg); border-radius: var(--bento-radius-sm); border: 1px solid var(--bento-border); font-size: 13px; color: var(--bento-text-secondary); line-height: 1.6; }
.tip-box strong { color: var(--bento-text); }

.empty-msg { text-align: center; padding: 32px; color: var(--bento-text-secondary); font-size: 14px; }

.table-container { overflow-x: auto; margin-bottom: 16px; }

.loading { text-align: center; padding: 48px; color: var(--bento-text-secondary); font-size: 14px; }

</style>
      <ha-card>
        <div class="security-card">
          <div class="card-header">
            <h2>${this._config.title}</h2>
            <!-- Refresh handled by panel toolbar -->
          </div>
          <div class="tabs">
            <button class="tab-button ${this._activeTab === 'overview' ? 'active' : ''}" data-tab="overview">Overview</button>
            <button class="tab-button ${this._activeTab === 'critical' ? 'active' : ''}" data-tab="critical">Critical & Warnings</button>
            <button class="tab-button ${this._activeTab === 'addons' ? 'active' : ''}" data-tab="addons">Addons</button>
            <button class="tab-button ${this._activeTab === 'network' ? 'active' : ''}" data-tab="network">Network</button>
            <button class="tab-button ${this._activeTab === 'users' ? 'active' : ''}" data-tab="users">Users</button>
            <button class="tab-button ${this._activeTab === 'tips' ? 'active' : ''}" data-tab="tips">Tips</button>
          </div>
          <div id="content"></div>
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.shadowRoot.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._activeTab = btn.dataset.tab;
        this._updateContent();
      });
    });

    // Refresh now handled by panel toolbar (removed internal Re-scan button)
  }

  _updateContent() {
    const content = this.shadowRoot.getElementById('content');
    if (!content) return;
    if (this._loading) { content.innerHTML = '<div class="loading"><div class="spinner"></div>Running security audit...</div>'; return; }
    if (!this._auditData || this._auditData.error) { content.innerHTML = `<div class="error">\u26A0\uFE0F ${this._auditData?.error || 'Audit failed'}</div>`; return; }
    const d = this._auditData;
    switch (this._activeTab) {
      case 'overview': content.innerHTML = this._renderOverview(d); break;
      case 'critical': content.innerHTML = this._renderFindings(d); break;
      case 'addons': content.innerHTML = this._renderAddons(d); break;
      case 'network': content.innerHTML = this._renderNetwork(d); break;
      case 'users': content.innerHTML = this._renderUsers(d); break;
      case 'tips': content.innerHTML = this._renderTips(d); break;
    }
  }

  _renderOverview(d) {
    const circ = 2 * Math.PI * 42;
    const sc = d.score;
    const scoreColor = sc >= 80 ? '#4caf50' : sc >= 60 ? '#ff9800' : '#f44336';
    const grade = sc >= 90 ? 'A' : sc >= 80 ? 'B' : sc >= 70 ? 'C' : sc >= 60 ? 'D' : 'F';
    const gradeMsg = sc >= 90 ? 'Excellent security posture' : sc >= 80 ? 'Good, minor improvements possible' : sc >= 60 ? 'Fair, several issues to address' : 'Needs attention \u2014 critical issues found';
    let html = `<div class="score-section"><div class="score-ring"><svg viewBox="0 0 100 100"><circle class="score-bg" cx="50" cy="50" r="42" /><circle class="score-fill" cx="50" cy="50" r="42" style="stroke:${scoreColor};stroke-dasharray:${(sc/100)*circ} ${circ}" /></svg><div class="score-text"><div class="score-num" style="color:${scoreColor}">${sc}</div><div class="score-label">Score</div></div></div><div class="score-summary"><h3>Grade: ${grade} \u2014 ${gradeMsg}</h3><div class="summary-row"><div class="summary-dot" style="background:#f44336"></div><span class="summary-count">${d.critCount}</span> Critical</div><div class="summary-row"><div class="summary-dot" style="background:#ff9800"></div><span class="summary-count">${d.warnCount}</span> Warnings</div><div class="summary-row"><div class="summary-dot" style="background:#03a9f4"></div><span class="summary-count">${d.infoCount}</span> Info</div><div class="summary-row"><div class="summary-dot" style="background:#4caf50"></div><span class="summary-count">${d.passCount}</span> Passed</div></div></div>`;
    html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:16px"><div style="padding:10px;background:var(--bento-bg);border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700">${d.addons.length}</div><div style="font-size:11px;color:var(--bento-text-secondary)">Addons installed</div></div><div style="padding:10px;background:var(--bento-bg);border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700">${d.users.length}</div><div style="font-size:11px;color:var(--bento-text-secondary)">User accounts</div></div><div style="padding:10px;background:var(--bento-bg);border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700">${d.entities}</div><div style="font-size:11px;color:var(--bento-text-secondary)">Entities</div></div><div style="padding:10px;background:var(--bento-bg);border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700">${d.totalChecks}</div><div style="font-size:11px;color:var(--bento-text-secondary)">Checks run</div></div></div>`;
    if (d.critCount > 0) { html += '<div class="section-title">\u{1F6A8} Critical Issues</div>'; d.findings.critical.forEach(f => { html += this._renderFinding(f, 'critical'); }); }
    if (d.warnCount > 0) { html += '<div class="section-title">\u26A0\uFE0F Warnings</div>'; d.findings.warning.forEach(f => { html += this._renderFinding(f, 'warning'); }); }
    if (this._lastScan) { html += `<div class="scan-info">Last scan: ${this._lastScan.toLocaleString()}</div>`; }
    return html;
  }

  _renderFindings(d) {
    let html = '';
    if (d.findings.critical.length) { html += '<div class="section-title">\u{1F6A8} Critical</div>'; d.findings.critical.forEach(f => { html += this._renderFinding(f, 'critical'); }); }
    if (d.findings.warning.length) { html += '<div class="section-title">\u26A0\uFE0F Warnings</div>'; d.findings.warning.forEach(f => { html += this._renderFinding(f, 'warning'); }); }
    if (d.findings.info.length) { html += '<div class="section-title">\u2139\uFE0F Informational</div>'; d.findings.info.forEach(f => { html += this._renderFinding(f, 'info'); }); }
    if (d.findings.pass.length) { html += '<div class="section-title">\u2705 Passed</div>'; d.findings.pass.forEach(f => { html += this._renderFinding(f, 'pass'); }); }
    if (!html) html = '<div class="empty-msg">No findings</div>';
    return html;
  }

  _renderFinding(f, severity) {
    const icons = { critical: '\u{1F6A8}', warning: '\u26A0\uFE0F', info: '\u2139\uFE0F', pass: '\u2705' };
    const labels = { critical: 'Critical', warning: 'Warning', info: 'Info', pass: 'Pass' };
    return `<div class="finding ${severity}"><div class="finding-header"><span class="finding-icon">${icons[severity]}</span><span class="finding-title">${f.title}</span><span class="finding-badge badge-${severity}">${labels[severity]}</span></div><div class="finding-desc">${f.desc}</div>${f.fix ? `<div class="finding-fix">\u{1F4A1} ${f.fix}</div>` : ''}</div>`;
  }

  _renderAddons(d) {
    if (!d.addons.length) return '<div class="empty-msg">No addons installed</div>';
    return `<div class="table-container"><table class="entity-table"><thead><tr><th>Addon</th><th>Version</th><th>State</th><th>Protection</th><th>Auto-update</th><th>Host Network</th></tr></thead><tbody>${d.addons.map(a => { const prot = a.protected !== false; const autoUp = a.auto_update !== false; const hostNet = a.host_network === true; const updateAvail = a.update_available; return `<tr><td>${a.name || a.slug}${updateAvail ? ' \u2B06\uFE0F' : ''}</td><td>${a.version || '-'}${updateAvail ? ` \u2192 ${a.version_latest}` : ''}</td><td><span class="status-dot" style="background:${a.state === 'started' ? '#4caf50' : '#9e9e9e'}"></span>${a.state || 'stopped'}</td><td style="color:${prot ? '#4caf50' : '#f44336'}">${prot ? '\u2713 On' : '\u2717 Off'}</td><td style="color:${autoUp ? '#4caf50' : '#ff9800'}">${autoUp ? '\u2713 On' : '\u2717 Off'}</td><td style="color:${hostNet ? '#ff9800' : 'var(--bento-text-secondary)'}">${hostNet ? '\u26A0 Yes' : 'No'}</td></tr>`; }).join('')}</tbody></table></div>`;
  }

  _renderUsers(d) {
    if (!d.users.length) return '<div class="empty-msg">Could not retrieve user list</div>';
    return `<div class="table-container"><table class="entity-table"><thead><tr><th>User</th><th>Role</th><th>Active</th><th>Local Only</th><th>System</th></tr></thead><tbody>${d.users.map(u => `<tr><td>${u.name || 'Unnamed'}</td><td>${u.is_owner ? '\u{1F451} Owner' : u.group_ids?.includes('system-admin') ? 'Admin' : 'User'}</td><td style="color:${u.is_active !== false ? '#4caf50' : '#9e9e9e'}">${u.is_active !== false ? '\u2713 Active' : 'Inactive'}</td><td>${u.local_only ? '\u2713 Yes' : 'No'}</td><td>${u.system_generated ? '\u{1F916} Yes' : 'No'}</td></tr>`).join('')}</tbody></table></div>`;
  }

  _renderNetwork(d) {
    let html = '';

    // Remote Access
    const hasCloud = (this._hass.config?.components || []).includes('cloud');
    html += '<div class="section-title">\u{1F310} Remote Access</div>';
    if (hasCloud) {
      html += `<div class="finding pass"><div class="finding-header"><span class="finding-icon">\u2705</span><span class="finding-title">Nabu Casa Cloud</span><span class="finding-badge badge-pass">ACTIVE</span></div><div class="finding-desc">Secure remote access via Home Assistant Cloud (Nabu Casa). Encrypted tunnel, no port forwarding needed.</div></div>`;
    } else {
      html += `<div class="finding info"><div class="finding-header"><span class="finding-icon">\u2139\uFE0F</span><span class="finding-title">No Cloud Service</span></div><div class="finding-desc">Home Assistant Cloud (Nabu Casa) is not configured. If you need remote access, it's the safest option.</div></div>`;
    }

    // URLs
    html += '<div class="section-title">\u{1F3E1} External & Internal URLs</div>';
    const externalUrl = this._hass.config?.external_url || '';
    const internalUrl = this._hass.config?.internal_url || '';

    html += `<div class="finding ${externalUrl.startsWith('https://') ? 'pass' : externalUrl.startsWith('http://') ? 'critical' : 'info'}">`;
    if (externalUrl.startsWith('https://')) {
      html += `<div class="finding-header"><span class="finding-icon">\u2705</span><span class="finding-title">External URL (HTTPS)</span><span class="finding-badge badge-pass">Secure</span></div>`;
    } else if (externalUrl.startsWith('http://')) {
      html += `<div class="finding-header"><span class="finding-icon">\u{1F6A8}</span><span class="finding-title">External URL (HTTP)</span><span class="finding-badge badge-critical">INSECURE</span></div>`;
    } else {
      html += `<div class="finding-header"><span class="finding-icon">\u2139\uFE0F</span><span class="finding-title">No External URL</span></div>`;
    }
    html += `<div class="finding-desc">${externalUrl || 'Not configured'}</div></div>`;

    html += `<div class="finding ${internalUrl.startsWith('https://') ? 'pass' : 'info'}">`;
    html += `<div class="finding-header"><span class="finding-icon">\u2139\uFE0F</span><span class="finding-title">Internal URL</span></div>`;
    html += `<div class="finding-desc">${internalUrl || 'http://homeassistant.local:8123 (default)'}</div></div>`;

    // Network info from hass.config
    const haConfig = this._hass.config || {};
    html += '<div class="section-title">\u{1F4F6} Network Info</div>';
    html += '<div class="finding info"><div class="finding-desc">';
    html += '<div style="display:grid;grid-template-columns:140px 1fr;gap:6px 12px;font-size:13px;">';
    html += `<span style="font-weight:600;color:var(--bento-text-secondary)">Location name</span><span>${haConfig.location_name || 'N/A'}</span>`;
    html += `<span style="font-weight:600;color:var(--bento-text-secondary)">HA Version</span><span>${haConfig.version || 'N/A'}</span>`;
    html += `<span style="font-weight:600;color:var(--bento-text-secondary)">Time zone</span><span>${haConfig.time_zone || 'N/A'}</span>`;
    const integrationCount = (haConfig.components || []).length;
    html += `<span style="font-weight:600;color:var(--bento-text-secondary)">Integrations</span><span>${integrationCount} loaded</span>`;
    html += '</div></div></div>';

    // Network Interfaces from Supervisor
    const ifaces = d.networkInterfaces || [];
    if (ifaces.length > 0) {
      html += '<div class="section-title">\u{1F50C} Network Interfaces</div>';
      ifaces.forEach(iface => {
        const name = iface.interface || iface.name || 'unknown';
        const type = iface.type || 'unknown';
        const enabled = iface.enabled !== false;
        const ipv4 = iface.ipv4 || {};
        const addresses = ipv4.address || [];
        const gateway = ipv4.gateway || 'N/A';
        const method = ipv4.method || 'auto';
        const dns = (iface.ipv4?.nameservers || []).join(', ') || 'N/A';
        const mac = iface.mac || 'N/A';
        const wifi = iface.wifi || null;

        html += '<div class="finding info" style="margin-bottom:8px">';
        html += '<div class="finding-header">';
        html += '<span class="finding-icon">' + (type === 'wireless' ? '\u{1F4F6}' : '\u{1F50C}') + '</span>';
        html += '<span class="finding-title">' + name + ' (' + type + ')</span>';
        html += '<span class="finding-badge ' + (enabled ? 'badge-pass' : 'badge-info') + '">' + (enabled ? 'UP' : 'DOWN') + '</span>';
        html += '</div>';
        html += '<div class="finding-desc"><div style="display:grid;grid-template-columns:100px 1fr;gap:4px 12px;font-size:12px;">';
        if (addresses.length > 0) html += '<span style="font-weight:600">IP</span><span>' + addresses.join(', ') + '</span>';
        html += '<span style="font-weight:600">Gateway</span><span>' + gateway + '</span>';
        html += '<span style="font-weight:600">DNS</span><span>' + dns + '</span>';
        html += '<span style="font-weight:600">MAC</span><span><code style="font-size:11px">' + mac + '</code></span>';
        html += '<span style="font-weight:600">Method</span><span>' + method + '</span>';
        if (wifi) {
          html += '<span style="font-weight:600">SSID</span><span>' + (wifi.ssid || 'N/A') + '</span>';
          html += '<span style="font-weight:600">Signal</span><span>' + (wifi.signal ? wifi.signal + '%' : 'N/A') + '</span>';
        }
        html += '</div></div></div>';
      });
    }

    html += '<div class="section-title">\u{1F5A5}\uFE0F Exposed Addon Ports</div>';
    const exposedAddons = d.addons.filter(a => (a.ports && Object.keys(a.ports).length > 0) || (a.network && Object.keys(a.network).length > 0));
    if (exposedAddons.length === 0) {
      html += '<div class="empty-msg">No addons exposing ports</div>';
    } else {
      html += '<div class="table-container"><table class="entity-table"><thead><tr><th>Addon</th><th>Ingress</th><th>Ports</th><th>State</th></tr></thead><tbody>';
      exposedAddons.forEach(a => {
        const hasIngress = a.ingress === true;
        const ports = a.ports ? Object.entries(a.ports).map(([port, config]) => `${port}${config.host_port ? `→${config.host_port}` : ''}`).join(', ') : 'N/A';
        const color = hasIngress ? '#4caf50' : a.state === 'started' ? '#ff9800' : '#9e9e9e';
        html += `<tr><td>${a.name}</td><td style="color:${color}">${hasIngress ? '\u2713 Yes' : '\u2717 No'}</td><td><code style="font-size:12px;background:var(--bento-bg);padding:4px 8px;border-radius:4px">${ports}</code></td><td><span class="status-dot" style="background:${a.state === 'started' ? '#4caf50' : '#9e9e9e'}"></span>${a.state || 'stopped'}</td></tr>`;
      });
      html += '</tbody></table></div>';
    }

    html += '<div class="section-title">\u{1F517} Network-Related Findings</div>';
    const networkFindings = d.findings.critical.concat(d.findings.warning).concat(d.findings.info).filter(f =>
      f.id.includes('ssl') || f.id.includes('host_network') || f.id.includes('exposed_addon_ports') ||
      f.id.includes('ports') || f.id.includes('ingress') || f.id.includes('webhook') ||
      f.id.includes('proxy') || f.id.includes('trusted') || f.id.includes('ip_ban') ||
      f.id.includes('camera') || f.id.includes('media') || f.id.includes('risky') ||
      f.id.includes('external') || f.id.includes('port_exposure') || f.id.includes('cors') ||
      f.id.includes('mqtt') || f.id.includes('network')
    );

    if (networkFindings.length === 0) {
      html += '<div class="empty-msg">No network-related findings</div>';
    } else {
      networkFindings.forEach(f => {
        const severity = d.findings.critical.includes(f) ? 'critical' : d.findings.warning.includes(f) ? 'warning' : 'info';
        html += this._renderFinding(f, severity);
      });
    }

    return html;
  }

  _renderTips(d) {
    return `
      <div class="tip-box"><strong>\u{1F510} Authentication</strong><br>Enable multi-factor authentication (TOTP) for all user accounts, especially owner accounts. Go to Profile \u2192 Multi-factor Authentication.</div>
      <div class="tip-box" style="margin-top:8px"><strong>\u{1F310} Network Security</strong><br>Never expose your HA instance directly to the internet. Use Cloudflare Tunnel, Nabu Casa, or a reverse proxy with SSL. Keep port 8123 behind a firewall.</div>
      <div class="tip-box" style="margin-top:8px"><strong>\u{1F504} Updates</strong><br>Keep HA Core, Supervisor, OS, and all addons up to date. Security patches are regularly released. Enable auto-update for addons when possible.</div>
      <div class="tip-box" style="margin-top:8px"><strong>\u{1F4BE} Backups</strong><br>Schedule regular automated backups and store them off-site (Google Drive, NAS, etc.). Test backup restoration periodically.</div>
      <div class="tip-box" style="margin-top:8px"><strong>\u{1F50D} Audit Trail</strong><br>Review the Logbook regularly for unexpected activity. Monitor login attempts through the System Log. Consider setting up alerts for failed login attempts.</div>
      <div class="tip-box" style="margin-top:8px"><strong>\u{1F9E9} Addon Hygiene</strong><br>Remove unused addons. Keep protection mode enabled unless absolutely needed. Review addon permissions (host network, privileged mode) periodically.</div>
      <div class="tip-box" style="margin-top:8px"><strong>\u{1F4E1} IoT Network</strong><br>Isolate IoT devices on a separate VLAN/subnet. Use firewall rules to prevent IoT devices from reaching the internet directly. This limits the blast radius of compromised devices.</div>
    `;
  }

// --- Pagination helper ---
  _renderPagination(tabName, totalItems) {
    if (!this._currentPage[tabName]) this._currentPage[tabName] = 1;
    const pageSize = this._pageSize;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = Math.min(this._currentPage[tabName], totalPages);
    this._currentPage[tabName] = page;
    return `
      <div class="pagination">
        <button class="pagination-btn" data-page-tab="${tabName}" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>&#8249; Prev</button>
        <span class="pagination-info">${page} / ${totalPages} (${totalItems})</span>
        <button class="pagination-btn" data-page-tab="${tabName}" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>Next &#8250;</button>
        <select class="page-size-select" data-page-tab="${tabName}" data-action="page-size">
          ${[10,15,25,50].map(s => `<option value="${s}" ${s === pageSize ? 'selected' : ''}>${s}/page</option>`).join('')}
        </select>
      </div>`;
  }

  _paginateItems(items, tabName) {
    if (!this._currentPage[tabName]) this._currentPage[tabName] = 1;
    const start = (this._currentPage[tabName] - 1) * this._pageSize;
    return items.slice(start, start + this._pageSize);
  }

  _setupPaginationListeners() {
    if (!this.shadowRoot) return;
    this.shadowRoot.querySelectorAll('.pagination-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.dataset.pageTab;
        const page = parseInt(e.target.dataset.page);
        if (tab && page > 0) {
          this._currentPage[tab] = page;
          this._render ? this._render() : (this.render ? this.render() : this.renderCard());
        }
      });
    });
    this.shadowRoot.querySelectorAll('.page-size-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        this._pageSize = parseInt(e.target.value);
        // Reset all pages to 1
        Object.keys(this._currentPage).forEach(k => this._currentPage[k] = 1);
        this._render ? this._render() : (this.render ? this.render() : this.renderCard());
      });
    });
  }
}

if (!customElements.get('ha-security-check')) {
  customElements.define('ha-security-check', HASecurityCheck);
}

window.customCards = window.customCards || [];
window.customCards.push({ type: 'ha-security-check', name: 'Security Check', description: 'Security audit tool for Home Assistant', preview: true });

console.info(
  '%c  HA-SECURITY-CHECK  %c v1.0.0 ',
  'background: #f44336; color: white; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;',
  'background: #ffebee; color: #f44336; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;'
);
