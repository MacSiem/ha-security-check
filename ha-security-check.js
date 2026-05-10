/* HA Tools split — ha-security-check v4.0.0 (2026-05-10) — single-tool standalone repo */
(function() {
'use strict';

// -- HA Tools Persistence (stub -- full impl in ha-tools-panel.js) --
window._haToolsPersistence = window._haToolsPersistence || { _cache: {}, _hass: null, setHass(h) { this._hass = h; }, async save(k, d) { try { localStorage.setItem('ha-security-check-' + k, JSON.stringify(d)); } catch(e) { console.debug('[ha-security-check] caught:', e); } }, async load(k) { try { const r = localStorage.getItem('ha-security-check-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } }, loadSync(k) { try { const r = localStorage.getItem('ha-security-check-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } } };

const _esc = window._haToolsEsc || ((s) => typeof s === 'string' ? s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]) : (s ?? ''));

/**
 * HA Security Check - Security audit tool for Home Assistant
 * Checks for common security issues: exposed ports, SSL, outdated addons, insecure integrations, etc.
 */
/* ===== HA Tools split — inline shared infrastructure ===== */
// Bento Design System CSS (inline copy — keeps tool standalone)
if (typeof window !== 'undefined' && !window.HAToolsBentoCSS) {
  window.HAToolsBentoCSS = `
/* ═══════════════════════════════════════════════
   HA Tools — Bento Design System v2.0 (Premium)
   ═══════════════════════════════════════════════ */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

:host {
  /* Brand palette — diamond top, gradient-friendly */
  --bento-primary: #6366f1;
  --bento-primary-2: #8b5cf6;
  --bento-primary-3: #ec4899;
  --bento-primary-hover: #4f46e5;
  --bento-primary-light: rgba(99, 102, 241, 0.08);
  --bento-primary-glow: rgba(99, 102, 241, 0.35);
  --bento-success: #10B981;
  --bento-success-light: rgba(16, 185, 129, 0.10);
  --bento-success-border: rgba(16, 185, 129, 0.25);
  --bento-error: #EF4444;
  --bento-error-light: rgba(239, 68, 68, 0.10);
  --bento-error-border: rgba(239, 68, 68, 0.25);
  --bento-warning: #F59E0B;
  --bento-warning-light: rgba(245, 158, 11, 0.10);
  --bento-warning-border: rgba(245, 158, 11, 0.25);
  --bento-info: #06b6d4;
  --bento-info-light: rgba(6, 182, 212, 0.10);
  --bento-info-border: rgba(6, 182, 212, 0.25);

  /* Theme */
  --bento-bg:     var(--primary-background-color, #fafaf9);
  --bento-bg-2:   var(--card-background-color, #f5f5f4);
  --bento-card:   var(--card-background-color, #ffffff);
  --bento-glass:  rgba(255, 255, 255, 0.7);
  --bento-border: var(--divider-color, #e7e5e4);
  --bento-border-strong: rgba(0, 0, 0, 0.08);
  --bento-text:           var(--primary-text-color,   #0c0a09);
  --bento-text-secondary: var(--secondary-text-color, #57534e);
  --bento-text-muted:     var(--disabled-text-color,  #a8a29e);

  /* Radii */
  --bento-radius-xs: 8px;
  --bento-radius-sm: 12px;
  --bento-radius-md: 18px;
  --bento-radius-lg: 24px;
  --bento-radius-pill: 999px;

  /* Shadows — modern, layered */
  --bento-shadow-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.05), 0 2px 6px rgba(0,0,0,0.03);
  --bento-shadow-lg: 0 24px 48px -12px rgba(0,0,0,0.10), 0 12px 24px -8px rgba(0,0,0,0.05);
  --bento-shadow-glow: 0 0 0 1px rgba(99,102,241,0.15), 0 8px 32px -8px rgba(99,102,241,0.25);

  /* Gradients */
  --bento-grad-primary: linear-gradient(135deg, #6366f1, #8b5cf6);
  --bento-grad-rainbow: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  --bento-grad-success: linear-gradient(135deg, #10b981, #34d399);
  --bento-grad-error:   linear-gradient(135deg, #ef4444, #f87171);
  --bento-grad-warning: linear-gradient(135deg, #f59e0b, #fbbf24);

  /* Motion */
  --bento-trans-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --bento-trans:      0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --bento-trans-slow: 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  /* Typography */
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
  font-feature-settings: "cv11" 1, "ss01" 1;
  letter-spacing: -0.01em;
  display: block;
  color: var(--bento-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Dark mode ───────────────────────────────── */
@media (prefers-color-scheme: dark) {
  :host {
    --bento-bg:     var(--primary-background-color, #0a0a0f);
    --bento-bg-2:   var(--card-background-color,    #111119);
    --bento-card:   var(--card-background-color,    #16161f);
    --bento-glass:  rgba(22, 22, 31, 0.7);
    --bento-border: var(--divider-color,            #27272f);
    --bento-border-strong: rgba(255, 255, 255, 0.08);
    --bento-text:           var(--primary-text-color,   #fafaf9);
    --bento-text-secondary: var(--secondary-text-color, #d6d3d1);
    --bento-text-muted:     var(--disabled-text-color,  #78716c);
    --bento-primary:        #818cf8;
    --bento-primary-2:      #a78bfa;
    --bento-primary-3:      #f472b6;
    --bento-primary-light:  rgba(129, 140, 248, 0.12);
    --bento-primary-glow:   rgba(129, 140, 248, 0.45);
    --bento-success: #34d399;
    --bento-success-light:  rgba(52, 211, 153, 0.12);
    --bento-success-border: rgba(52, 211, 153, 0.30);
    --bento-error:   #f87171;
    --bento-error-light:    rgba(248, 113, 113, 0.12);
    --bento-error-border:   rgba(248, 113, 113, 0.30);
    --bento-warning: #fbbf24;
    --bento-warning-light:  rgba(251, 191, 36, 0.12);
    --bento-warning-border: rgba(251, 191, 36, 0.30);
    --bento-info:    #22d3ee;
    --bento-info-light:     rgba(34, 211, 238, 0.12);
    --bento-info-border:    rgba(34, 211, 238, 0.30);
    --bento-shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
    --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.2);
    --bento-shadow-lg: 0 24px 48px -12px rgba(0,0,0,0.6), 0 12px 24px -8px rgba(0,0,0,0.3);
    --bento-shadow-glow: 0 0 0 1px rgba(129,140,248,0.2), 0 8px 32px -8px rgba(129,140,248,0.5);
    --bento-grad-primary: linear-gradient(135deg, #818cf8, #a78bfa);
    --bento-grad-rainbow: linear-gradient(135deg, #818cf8, #a78bfa 50%, #f472b6);
    color-scheme: dark !important;
  }
  .card, .card-container, .main-card, .panel-card {
    background: var(--bento-card) !important; color: var(--bento-text) !important; border-color: var(--bento-border) !important;
  }
  input, select, textarea { background: var(--bento-bg-2); color: var(--bento-text); border-color: var(--bento-border); }
  table th { background: var(--bento-bg-2); color: var(--bento-text-secondary); border-color: var(--bento-border); }
  table td { color: var(--bento-text); border-color: var(--bento-border); }
  pre, code { background: #1e1e2e !important; color: #e2e8f0 !important; }
}

/* ── Reset & motion preferences ──────────────── */
* { box-sizing: border-box; }
@media (prefers-reduced-motion: reduce) { * { animation-duration: 0s !important; transition-duration: 0s !important; } }

/* ── Main Card Wrapper ───────────────────────── */
.card {
  background: var(--bento-card);
  border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-md);
  box-shadow: var(--bento-shadow-md);
  color: var(--bento-text);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  transition: box-shadow var(--bento-trans), border-color var(--bento-trans);
}

/* ── Header ──────────────────────────────────── */
.header {
  padding: 20px 24px 0;
  display: flex; align-items: center; gap: 12px;
}
.header-icon { font-size: 24px; }
.header-title {
  font-size: 18px; font-weight: 700; letter-spacing: -0.02em;
  color: var(--bento-text);
}
.header-badge {
  margin-left: auto;
  background: var(--bento-grad-primary); color: #fff;
  font-size: 11px; padding: 4px 10px; border-radius: var(--bento-radius-pill);
  font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  box-shadow: 0 4px 14px -2px var(--bento-primary-glow);
}
.content { padding: 20px 24px 24px; }

/* ── Tabs (modern pill style) ────────────────── */
.tabs, .tab-bar, .tab-nav, .tab-header {
  display: flex !important; gap: 4px !important;
  padding: 4px !important;
  background: var(--bento-bg-2) !important;
  border-radius: var(--bento-radius-pill) !important;
  margin-bottom: 20px !important;
  overflow-x: auto !important; overflow-y: hidden !important;
  -webkit-overflow-scrolling: touch !important;
  flex-wrap: nowrap !important; border-bottom: 0 !important;
  width: fit-content; max-width: 100%;
}
.tab, .tab-btn, .tab-button, .dtab {
  padding: 8px 16px !important;
  border: none !important; background: transparent !important; cursor: pointer !important;
  font-size: 13px !important; font-weight: 600 !important;
  font-family: "Inter", sans-serif !important;
  color: var(--bento-text-secondary) !important;
  border-radius: var(--bento-radius-pill) !important;
  margin-bottom: 0 !important;
  transition: all var(--bento-trans) !important;
  white-space: nowrap !important; flex: none !important;
  letter-spacing: -0.005em !important;
}
.tab:hover, .tab-btn:hover, .tab-button:hover, .dtab:hover {
  color: var(--bento-text) !important;
  background: var(--bento-card) !important;
}
.tab.active, .tab-btn.active, .tab-button.active, .dtab.active {
  background: var(--bento-card) !important;
  color: var(--bento-primary) !important;
  box-shadow: var(--bento-shadow-sm) !important;
  font-weight: 700 !important;
}
.tab-content { display: block; }
.tab-content.active { animation: bentoFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
@keyframes bentoFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Stat / KPI cards (premium) ──────────────── */
.stat-card, .stat-item, .metric-card, .kpi-card {
  background: var(--bento-bg-2) !important;
  border: 1px solid var(--bento-border) !important;
  border-radius: var(--bento-radius-sm) !important;
  padding: 18px !important;
  text-align: left !important;
  transition: transform var(--bento-trans), box-shadow var(--bento-trans), border-color var(--bento-trans);
  position: relative; overflow: hidden;
}
.stat-card::before, .metric-card::before, .kpi-card::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--bento-grad-primary);
  opacity: 0; transition: opacity var(--bento-trans);
}
.stat-card:hover, .stat-item:hover, .metric-card:hover, .kpi-card:hover {
  transform: translateY(-2px); box-shadow: var(--bento-shadow-lg); border-color: var(--bento-primary-light);
}
.stat-card:hover::before, .metric-card:hover::before, .kpi-card:hover::before { opacity: 1; }
.stat-icon { font-size: 22px; margin-bottom: 6px; opacity: 0.85; }
.stat-value, .stat-val, .metric-value, .kpi-val {
  font-size: 26px; font-weight: 800; line-height: 1.1;
  letter-spacing: -0.02em; color: var(--bento-text);
  font-feature-settings: "tnum" 1;
}
.stat-label, .stat-lbl, .metric-label, .kpi-lbl {
  font-size: 11px; color: var(--bento-text-secondary);
  margin-top: 4px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
}
.stat-num {
  font-size: 24px; font-weight: 800; color: var(--bento-primary);
  font-feature-settings: "tnum" 1; letter-spacing: -0.02em;
}
.stat-sub { font-size: 12px; color: var(--bento-text-muted); font-weight: 500; }

/* ── Overview grid ───────────────────────────── */
.overview-grid, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px; margin-bottom: 20px;
}

/* ── Section headers ─────────────────────────── */
.section-header, .section-title {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 12px; font-weight: 700; color: var(--bento-text-secondary);
  text-transform: uppercase; letter-spacing: 0.08em;
  margin: 16px 0 10px;
}
.section-header::before, .section-title::before {
  content: ""; width: 4px; height: 4px; border-radius: 50%; background: var(--bento-primary);
  margin-right: 8px; flex-shrink: 0;
}

/* ── Loading / Empty / Info ──────────────────── */
.loading-bar {
  height: 3px; border-radius: var(--bento-radius-pill);
  background: linear-gradient(90deg, var(--bento-primary), var(--bento-primary-2), transparent);
  background-size: 200% 100%;
  animation: bentoLoad 1.5s linear infinite; margin-bottom: 12px;
}
@keyframes bentoLoad { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state, .no-data, .no-results {
  text-align: center; color: var(--bento-text-secondary);
  padding: 40px 20px; font-size: 14px;
  background: var(--bento-bg-2); border-radius: var(--bento-radius-md);
  border: 1px dashed var(--bento-border);
}
.info-note, .tip-box {
  font-size: 13px; color: var(--bento-text-secondary);
  background: var(--bento-primary-light);
  border-radius: var(--bento-radius-sm); padding: 12px 14px;
  border-left: 3px solid var(--bento-primary); margin-top: 12px;
  line-height: 1.55;
}
.last-updated {
  font-size: 11px; color: var(--bento-text-muted);
  text-align: right; margin-top: 12px; font-feature-settings: "tnum" 1;
}

/* ── Buttons (premium) ───────────────────────── */
.refresh-btn {
  background: var(--bento-bg-2); border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-pill); padding: 6px 14px;
  font-size: 12px; color: var(--bento-text-secondary);
  cursor: pointer; font-weight: 600; transition: all var(--bento-trans);
  font-family: "Inter", sans-serif;
}
.refresh-btn:hover {
  background: var(--bento-card); color: var(--bento-primary);
  border-color: var(--bento-primary); transform: translateY(-1px);
  box-shadow: var(--bento-shadow-sm);
}
.toggle-btn, .action-btn {
  background: var(--bento-grad-primary); border: none;
  border-radius: var(--bento-radius-xs); padding: 8px 16px;
  font-size: 13px; color: #fff; cursor: pointer; font-weight: 600;
  transition: all var(--bento-trans); font-family: "Inter", sans-serif;
  letter-spacing: -0.005em;
  box-shadow: 0 4px 12px -2px var(--bento-primary-glow);
}
.toggle-btn:hover, .action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -4px var(--bento-primary-glow);
}
.send-btn, .btn-primary {
  width: 100%;
  background: var(--bento-grad-primary); color: #fff;
  border: none; border-radius: var(--bento-radius-sm);
  padding: 12px 20px; font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: "Inter", sans-serif;
  letter-spacing: -0.01em;
  transition: all var(--bento-trans);
  box-shadow: 0 4px 14px -2px var(--bento-primary-glow);
}
.send-btn:hover, .btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -6px var(--bento-primary-glow);
}
.send-btn:active, .btn-primary:active { transform: translateY(0); }
.send-btn:disabled, .btn-primary:disabled {
  opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none;
}

/* ── Badges / Status (modern pill) ───────────── */
.badge, .status-badge, .tag, .chip {
  padding: 4px 12px; border-radius: var(--bento-radius-pill);
  font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;
  letter-spacing: 0.04em; text-transform: uppercase;
  border: 1px solid;
}
.badge-ok, .badge-success { background: var(--bento-success-light); color: var(--bento-success); border-color: var(--bento-success-border); }
.badge-er, .badge-error   { background: var(--bento-error-light);   color: var(--bento-error);   border-color: var(--bento-error-border); }
.badge-warn, .badge-warning { background: var(--bento-warning-light); color: var(--bento-warning); border-color: var(--bento-warning-border); }
.badge-info { background: var(--bento-info-light); color: var(--bento-info); border-color: var(--bento-info-border); }

.count-badge {
  font-size: 11px; font-weight: 700; padding: 3px 10px;
  border-radius: var(--bento-radius-pill); display: inline-flex; align-items: center;
  font-feature-settings: "tnum" 1;
}
.error-badge { background: var(--bento-error-light); color: var(--bento-error); border: 1px solid var(--bento-error-border); }
.warn-badge  { background: var(--bento-warning-light); color: var(--bento-warning); border: 1px solid var(--bento-warning-border); }
.info-badge  { background: var(--bento-primary-light); color: var(--bento-primary); border: 1px solid var(--bento-border); }
.ok-badge    { background: var(--bento-success-light); color: var(--bento-success); border: 1px solid var(--bento-success-border); }

/* ── Tables (modern) ─────────────────────────── */
table { width: 100%; border-collapse: separate; border-spacing: 0; }
th {
  background: var(--bento-bg-2); color: var(--bento-text-secondary);
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  padding: 12px 16px; text-align: left;
  border-bottom: 1px solid var(--bento-border);
}
th:first-child { border-top-left-radius: var(--bento-radius-sm); }
th:last-child  { border-top-right-radius: var(--bento-radius-sm); }
td {
  padding: 14px 16px; border-bottom: 1px solid var(--bento-border);
  color: var(--bento-text); font-size: 13px;
}
tr { transition: background var(--bento-trans-fast); }
tr:hover td { background: var(--bento-primary-light); }
tr:last-child td { border-bottom: 0; }

/* ── Forms / Inputs ──────────────────────────── */
input, select, textarea {
  padding: 10px 14px; border: 1.5px solid var(--bento-border);
  border-radius: var(--bento-radius-xs);
  background: var(--bento-card); color: var(--bento-text);
  font-size: 14px; font-family: "Inter", sans-serif;
  transition: all var(--bento-trans); outline: none;
  letter-spacing: -0.005em;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--bento-primary);
  box-shadow: 0 0 0 4px var(--bento-primary-light);
}
input::placeholder, textarea::placeholder { color: var(--bento-text-muted); }

/* ── Code blocks ─────────────────────────────── */
code {
  background: var(--bento-bg-2); padding: 2px 6px;
  border-radius: 4px; font-size: 12px;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  border: 1px solid var(--bento-border);
}
pre {
  background: #1e1e2e; color: #e2e8f0;
  padding: 16px; border-radius: var(--bento-radius-sm);
  font-size: 12.5px; overflow-x: auto; line-height: 1.65;
  white-space: pre-wrap; word-break: break-word;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  box-shadow: var(--bento-shadow-md);
}

/* ── Grid layouts ────────────────────────────── */
.schedule-grid, .send-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
.schedule-card, .send-card, .info-card {
  background: var(--bento-bg-2); border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-sm); padding: 16px;
  transition: all var(--bento-trans);
}
.schedule-card:hover, .send-card:hover, .info-card:hover {
  border-color: var(--bento-primary-light); transform: translateY(-1px);
  box-shadow: var(--bento-shadow-md);
}

/* ── Log entries ─────────────────────────────── */
.log-entry {
  display: flex; flex-wrap: wrap; align-items: flex-start;
  gap: 4px 8px; padding: 10px 12px;
  border-radius: var(--bento-radius-sm); margin-bottom: 6px;
  font-size: 12.5px; min-width: 0; overflow: hidden;
  border: 1px solid transparent; transition: all var(--bento-trans-fast);
}
.error-entry { background: var(--bento-error-light); border-color: var(--bento-error-border); }
.warn-entry  { background: var(--bento-warning-light); border-color: var(--bento-warning-border); }
.log-time { color: var(--bento-text-muted); font-feature-settings: "tnum" 1; flex-shrink: 0; font-family: "JetBrains Mono", monospace; }
.log-domain {
  font-weight: 700; flex-shrink: 1; min-width: 0; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; word-break: break-all;
}
.error-domain { color: var(--bento-error); }
.warn-domain  { color: var(--bento-warning); }
.log-msg {
  color: var(--bento-text-secondary); flex-basis: 100%;
  word-break: break-word; overflow-wrap: anywhere;
  white-space: pre-wrap; min-width: 0; line-height: 1.55;
}

/* ── Send status ─────────────────────────────── */
.send-status {
  padding: 12px 16px; border-radius: var(--bento-radius-sm);
  margin-top: 14px; font-size: 13px; font-weight: 600;
  text-align: center; letter-spacing: -0.005em;
  border: 1px solid;
}
.send-status.sending { background: var(--bento-primary-light); color: var(--bento-primary); border-color: var(--bento-border); }
.send-status.success { background: var(--bento-success-light); color: var(--bento-success); border-color: var(--bento-success-border); }
.send-status.error   { background: var(--bento-error-light);   color: var(--bento-error);   border-color: var(--bento-error-border); }

/* ── Scrollbar ───────────────────────────────── */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bento-border); border-radius: var(--bento-radius-pill); border: 2px solid transparent; background-clip: content-box; }
::-webkit-scrollbar-thumb:hover { background: var(--bento-text-muted); background-clip: content-box; }

/* ── Animations ──────────────────────────────── */
@keyframes bentoSpin  { to { transform: rotate(360deg); } }
@keyframes bentoPulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
@keyframes bentoSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes bentoStaggerIn { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

/* Apply stagger to grids of stat-cards */
.stats-grid > *, .overview-grid > *, .summary-grid > * {
  animation: bentoStaggerIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
}
.stats-grid > *:nth-child(1)  { animation-delay: 0.02s; }
.stats-grid > *:nth-child(2)  { animation-delay: 0.06s; }
.stats-grid > *:nth-child(3)  { animation-delay: 0.10s; }
.stats-grid > *:nth-child(4)  { animation-delay: 0.14s; }
.stats-grid > *:nth-child(5)  { animation-delay: 0.18s; }
.stats-grid > *:nth-child(6)  { animation-delay: 0.22s; }

/* ── Mobile — 768 px ─────────────────────────── */
@media (max-width: 768px) {
  .content { padding: 16px; }
  .header { padding: 16px 16px 0; }
  .tabs { gap: 2px !important; padding: 3px !important; }
  .tab, .tab-button, .tab-btn { padding: 6px 12px !important; font-size: 12px !important; }
  .overview-grid, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid {
    grid-template-columns: repeat(2, 1fr); gap: 10px;
  }
  .stat-value, .stat-val, .kpi-val, .metric-val { font-size: 22px; }
  .stat-label, .stat-lbl, .kpi-lbl, .metric-lbl { font-size: 10px; }
  .send-grid, .schedule-grid { grid-template-columns: 1fr; }
  .log-entry { flex-wrap: wrap; gap: 2px 6px; padding: 8px 10px; }
  .log-domain { max-width: 60%; font-size: 11.5px; }
  .log-msg { flex-basis: 100%; max-width: 100%; font-size: 11.5px; }
  pre { padding: 12px; font-size: 11.5px; }
  h2 { font-size: 18px; }
  h3 { font-size: 15px; }
  table { font-size: 12.5px; }
  th, td { padding: 10px 12px; }
}
@media (max-width: 480px) {
  .tabs { gap: 1px !important; padding: 2px !important; }
  .tab, .tab-button, .tab-btn { padding: 5px 10px !important; font-size: 11px !important; }
  .overview-grid, .stats-grid, .summary-grid { grid-template-columns: 1fr 1fr; }
  .stat-value, .stat-val, .kpi-val { font-size: 18px; }
}
`;
}
// XSS escape singleton (idempotent)
if (typeof window !== 'undefined') {
  window._haToolsEsc = window._haToolsEsc || (function(){
    var MAP = {};
    MAP[String.fromCharCode(38)] = '&amp;';
    MAP[String.fromCharCode(60)] = '&lt;';
    MAP[String.fromCharCode(62)] = '&gt;';
    MAP[String.fromCharCode(34)] = '&quot;';
    MAP[String.fromCharCode(39)] = '&#39;';
    return function(s){ return typeof s === 'string' ? s.replace(/[&<>"']/g, function(c){ return MAP[c]; }) : (s == null ? '' : s); };
  })();
}
// Universal donate footer injector — guarantees the support box appears
// on every split-tool card regardless of internal render state.
if (typeof window !== 'undefined' && !window.__haToolsSplitDonateInjector) {
  window.__haToolsSplitDonateInjector = true;
  var SPLIT_TAGS = ['ha-purge-cache','ha-yaml-checker','ha-data-exporter','ha-baby-tracker','ha-chore-tracker','ha-energy-optimizer','ha-energy-insights','ha-energy-email','ha-log-email','ha-smart-reports','ha-network-map','ha-trace-viewer','ha-automation-analyzer','ha-storage-monitor','ha-backup-manager','ha-security-check','ha-device-health','ha-sentence-manager','ha-encoding-fixer','ha-entity-renamer','ha-frigate-privacy','ha-vacuum-water-monitor'];
  var DONATE_HTML = ''
    + '<div class="donate-section" data-source="ha-tools-split-injector">'
    + '  <div class="donate-text">'
    + '    <h3>❤️ Support HA Tools Development</h3>'
    + '    <p>If this tool makes your Home Assistant life easier, consider supporting the project. Every coffee motivates further development!</p>'
    + '  </div>'
    + '  <div class="donate-buttons">'
    + '    <a class="donate-btn coffee" href="https://buymeacoffee.com/macsiem" target="_blank" rel="noopener noreferrer">☕ Buy Me a Coffee</a>'
    + '    <a class="donate-btn paypal" href="https://www.paypal.com/donate/?hosted_button_id=Y967H4PLRBN8W" target="_blank" rel="noopener noreferrer">💳 PayPal</a>'
    + '  </div>'
    + '</div>';
  function deepFindAll(tag, root) {
    var out = [];
    (function walk(node){
      if (!node || !node.querySelectorAll) return;
      var children = node.querySelectorAll('*');
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (c.tagName && c.tagName.toLowerCase() === tag) out.push(c);
        if (c.shadowRoot) walk(c.shadowRoot);
      }
    })(root || document);
    return out;
  }
  // Per-tool prerequisite check + inline install banner
  var PREREQS = {
    'ha-energy-email': { service: 'ha_tools_email', repo: 'ha-tools-email-integration', label: 'HA Tools Email integration', kind: 'integration' },
    'ha-log-email':    { service: 'ha_tools_email', repo: 'ha-tools-email-integration', label: 'HA Tools Email integration', kind: 'integration' },
    'ha-encoding-fixer': { shellCommand: 'fix_encoding', label: 'shell_command.fix_encoding (optional advanced feature)', kind: 'shell_command_optional' }
  };
  // Per-tool first-run intro banner (one-line scope + 3 use cases)
  var INTROS = {
    'ha-yaml-checker': { headline: 'Validate Home Assistant YAML configuration on demand.', steps: ['Click \'Check HA Configuration\' to run homeassistant.check_config.', 'Switch to \'Encje\' tab to search entities by domain.', 'Use \'Template\' tab to preview Jinja2 templates.'] },
    'ha-data-exporter': { headline: 'Browse, filter, and export Home Assistant entity data.', steps: ['Filter by domain or search entities live.', 'Take a snapshot or export selection to CSV / JSON.', 'Privacy warning before downloading attributes with sensitive data.'] },
    'ha-chore-tracker': { headline: 'Household chore tracker with kanban + recurring schedules.', steps: ['Add a chore: name + assignee + frequency.', 'Drag from \'Todo\' to \'Done\' to mark complete.', 'Stats tab shows counts per assignee.'] },
    'ha-energy-optimizer': { headline: 'Tariff-aware energy usage with hourly heatmaps + tips.', steps: ['Today / Yesterday / 7-day / 30-day usage and cost.', 'Patterns tab — hourly heatmap of consumption.', 'Recommendations tab — auto-generated tips.'] },
    'ha-energy-insights': { headline: 'Daily / weekly / monthly energy charts + top consumers.', steps: ['Switch view tabs to see consumption over time.', 'Top devices ranked by kWh.', 'Tips tab with energy-saving suggestions.'] },
    'ha-energy-email': { headline: 'Energy reports delivered by email via ha_tools_email.', steps: ['Click \'Send Now\' to email the current snapshot.', 'Schedule daily / weekly / monthly delivery.', 'Configure SMTP in the Schedule tab (one-time).'] },
    'ha-log-email': { headline: 'Daily error / warning digests delivered by email.', steps: ['Click \'Send Now\' to email the current digest.', 'Schedule daily delivery + threshold (e.g. \u22653 errors).', 'Requires ha-tools-email-integration.'] },
    'ha-smart-reports': { headline: 'Aggregate weekly / monthly reports — energy + automations + state changes.', steps: ['Weekly summary card on Overview.', 'Drill down by Energy / Automations / System sub-tabs.', 'Privacy-safe view strips entity names before sharing.'] },
    'ha-network-map': { headline: 'Visualise the network around HA — devices, topology, MAC bindings.', steps: ['Devices tab — table of all known devices.', 'Topology tab — graph view of the network.', 'Click \'Rescan\' to ping the local subnet (user-initiated).'] },
    'ha-trace-viewer': { headline: 'Step through HA automation traces with a flow graph.', steps: ['Pick automation in sidebar to see latest 5 traces.', 'Click trace for full path through triggers / conditions / actions.', 'Export trace as JSON for offline debug.'] },
    'ha-automation-analyzer': { headline: 'Surface slow / failing / suspicious automations.', steps: ['Overview shows total + health score + top failing.', 'Performance tab ranks by avg runtime.', 'Optimization tab suggests improvements (loops, redundant triggers).'] },
    'ha-storage-monitor': { headline: 'Disk + recorder DB + add-on storage breakdown.', steps: ['Overview shows used / free + per-category breakdown.', 'Backups tab — count + size warning.', 'Cleanup tab — actionable suggestions.'] },
    'ha-backup-manager': { headline: 'Create + list + inspect HA backups.', steps: ['List existing backups (date / size / encryption).', 'Click \'Create backup now\' to invoke backup.create.', 'Restore selected backup.'] },
    'ha-security-check': { headline: 'Security audit + remediation tips.', steps: ['Overview shows score (X/100) + letter grade.', 'Click warning row for step-by-step remediation.', 'Tips tab — checklist of best practices.'] },
    'ha-device-health': { headline: 'Device battery / signal / last-seen health.', steps: ['List devices grouped by health (OK / Warning / Critical).', 'Filter by low battery (<20%) or weak signal.', 'Click device for model / manufacturer / last seen.'] },
    'ha-encoding-fixer': { headline: 'Detect + fix UTF-8 / mojibake issues across HA.', steps: ['Click \'Scan\' to walk entity registry + states.', 'Per-entity \'Fix\' button calls homeassistant.reload.', 'Optional: deep file scan via shell_command (see README).'] },
    'ha-entity-renamer': { headline: 'Bulk-rename HA entities + friendly names.', steps: ['Pick an entity, set new ID — entity_registry/update.', 'Bulk pattern: sensor.old_* \u2192 sensor.new_*.', 'Optional: rewrite Lovelace dashboard refs.'] },
    'ha-frigate-privacy': { headline: 'One-click Frigate privacy mode (pause detection / recording / snapshots).', steps: ['Click \'Pause 15 min\' for instant privacy.', 'Schedules tab — daily privacy window (e.g. 22:00\u201306:00).', 'Resume at any time to re-enable cameras.'] }
  };
  var PREREQ_HTML_CACHE = {};
  function buildPrereqBanner(tag, prereq, hass) {
    if (PREREQ_HTML_CACHE[tag]) return PREREQ_HTML_CACHE[tag];
    var html = '';
    if (prereq.kind === 'integration') {
      html = '<div class="prereq-banner prereq-error" data-prereq="' + tag + '">' +
        '<div class="prereq-icon">⚠️</div>' +
        '<div class="prereq-text">' +
          '<strong>This tool requires the ' + prereq.label + '</strong><br>' +
          'Install it from HACS: <code>https://github.com/MacSiem/' + prereq.repo + '</code> ' +
          '(Category: <strong>Integration</strong>) — then add <code>' + prereq.service + ':</code> to your <code>configuration.yaml</code> and restart HA.' +
        '</div>' +
        '<a class="prereq-cta" href="https://github.com/MacSiem/' + prereq.repo + '" target="_blank" rel="noopener noreferrer">Open install guide ↗</a>' +
      '</div>';
    } else if (prereq.kind === 'shell_command_optional') {
      html = '<div class="prereq-banner prereq-info" data-prereq="' + tag + '">' +
        '<div class="prereq-icon">💡</div>' +
        '<div class="prereq-text">' +
          '<strong>Optional advanced feature: deep file scan</strong><br>' +
          'To enable scanning of <code>configuration.yaml</code> files, install the bundled <code>encoding_scanner.py</code> + add <code>shell_command:</code> entries. See README.' +
        '</div>' +
      '</div>';
    }
    PREREQ_HTML_CACHE[tag] = html;
    return html;
  }
  function buildIntroBanner(tag, intro) {
    var stepsHtml = intro.steps.map(function(s){ return '<li>' + s + '</li>'; }).join('');
    return '<div class="intro-banner" data-intro="' + tag + '">' +
      '<button class="intro-dismiss" type="button" title="Dismiss" aria-label="Dismiss">✕</button>' +
      '<div class="intro-headline">💡 ' + intro.headline + '</div>' +
      '<ol class="intro-steps">' + stepsHtml + '</ol>' +
    '</div>';
  }
  function introDismissed(tag) {
    try { return localStorage.getItem('ha-intro-dismissed-' + tag) === '1'; } catch(e) { return false; }
  }
  function dismissIntro(tag, el) {
    try { localStorage.setItem('ha-intro-dismissed-' + tag, '1'); } catch(e) {}
    var node = el.shadowRoot && el.shadowRoot.querySelector('.intro-banner[data-intro="' + tag + '"]');
    if (node) node.remove();
  }
  function injectAll() {
    SPLIT_TAGS.forEach(function(tag){
      deepFindAll(tag).forEach(function(el){
        // panel_custom auto-init: HA assigns hass/panel/narrow but does not always call setConfig.
        if (typeof el.setConfig === 'function' && !el.config && !el._config) {
          try { el.setConfig({ type: 'custom:' + tag, title: tag }); } catch(e) {}
        }
        if (!el.shadowRoot) return;
        // 0) First-run intro banner (skip if tool has its own native tip)
        var intro = INTROS[tag];
        if (intro && !introDismissed(tag)) {
          var hasOwnTip = el.shadowRoot.querySelector('#tip-banner, .tip-banner');
          var injectedIntro = el.shadowRoot.querySelector('.intro-banner[data-intro="' + tag + '"]');
          if (!hasOwnTip && !injectedIntro) {
            var topCard = el.shadowRoot.querySelector('.card, .card-container, .main-card, [class$="-card"]') || el.shadowRoot.firstElementChild;
            if (topCard) {
              try {
                topCard.insertAdjacentHTML('afterbegin', buildIntroBanner(tag, intro));
                var btn = el.shadowRoot.querySelector('.intro-banner[data-intro="' + tag + '"] .intro-dismiss');
                if (btn) btn.addEventListener('click', function(ev){ ev.stopPropagation(); dismissIntro(tag, el); });
              } catch(e) {}
            }
          }
        }
        // 1) Prereq banner — checked every poll so it disappears when prereq becomes available
        var prereq = PREREQS[tag];
        if (prereq && el._hass) {
          var hassReady = !!el._hass;
          var present = true;
          if (prereq.service) present = !!(el._hass.services && el._hass.services[prereq.service]);
          if (prereq.shellCommand) present = !!(el._hass.services && el._hass.services.shell_command && el._hass.services.shell_command[prereq.shellCommand]);
          var existing = el.shadowRoot.querySelector('.prereq-banner[data-prereq="' + tag + '"]');
          if (!present && hassReady) {
            if (!existing) {
              var top = el.shadowRoot.querySelector('.card, .card-container, .main-card, [class$="-card"]') || el.shadowRoot.firstElementChild || el.shadowRoot;
              try { top.insertAdjacentHTML('afterbegin', buildPrereqBanner(tag, prereq, el._hass)); } catch(e) {}
            }
          } else if (present && existing) {
            existing.remove();
          }
        }
        // 2) Donate footer
        if (el.shadowRoot.querySelector('.donate-section')) return;
        var target = el.shadowRoot.querySelector('.card, .card-container, .main-card, [class$="-card"]') || el.shadowRoot.firstElementChild || el.shadowRoot;
        try { target.insertAdjacentHTML('beforeend', DONATE_HTML); } catch(e) {}
      });
    });
  }
  // Run immediately, then aggressive MutationObserver for late mounts + view switches.
  injectAll();
  setTimeout(injectAll, 250);
  setTimeout(injectAll, 1000);
  setTimeout(injectAll, 3000);
  // MutationObserver catches every new node anywhere in the DOM, including shadow root attachments
  // that are deferred until the user navigates to a view.
  try {
    var obs = new MutationObserver(function(muts){
      // Debounce: schedule a microtask injection
      if (window.__haToolsDonateScheduled) return;
      window.__haToolsDonateScheduled = true;
      setTimeout(function(){ window.__haToolsDonateScheduled = false; injectAll(); }, 100);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  } catch(e) {}
  // Also re-inject on hash/path change (Lovelace view switches)
  window.addEventListener('hashchange', function(){ setTimeout(injectAll, 200); });
  window.addEventListener('popstate', function(){ setTimeout(injectAll, 200); });
  // Backup interval (every 3s for first 5min — handles cases where MutationObserver missed events)
  var pollCount = 0;
  var pollInterval = setInterval(function(){
    injectAll();
    if (++pollCount >= 100) clearInterval(pollInterval);
  }, 3000);
}
/* ============================================================ */

class HASecurityCheck extends HTMLElement {
  static getConfigElement() { return document.createElement('ha-security-check-editor'); }
  getCardSize() { return 8; }

  static getStubConfig() { return { type: 'custom:ha-security-check', title: 'Security Check' }; }
  constructor() {
    super();
    this._toolId = this.tagName.toLowerCase().replace('ha-', '');
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
    this._lang = (navigator.language || '').startsWith('pl') ? 'pl' : 'en';
    this._loading = true;
    this._auditData = null;
    this._lastScan = null;
    this._lastHtml = '';
    this._lastAuditTime = 0;
  }

  // -- Persistence --
  _scKey() { return 'ha-security-check-' + (this._config.storage_key || 'default'); }
  _saveScanData() {
    try {
      const data = { lastScan: this._lastScan ? this._lastScan.toISOString() : null, lastScore: this._lastScore || null };
      localStorage.setItem(this._scKey(), JSON.stringify(data));
    } catch(e) { console.debug('[security-check]', e.message); }
  }
  _loadScanData() {
    try {
      const raw = localStorage.getItem(this._scKey());
      if (raw) {
        const data = JSON.parse(raw);
        if (data.lastScan) this._lastScan = new Date(data.lastScan);
        if (data.lastScore !== undefined) this._lastScore = data.lastScore;
      }
    } catch(e) { console.debug('[security-check]', e.message); }
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
    // Security audit is expensive — only re-run every 5 minutes
    if (now - (this._lastAuditTime || 0) > 300000) {
      this._lastAuditTime = now;
      this._runAudit();
    }
    // Throttle render to 60s — audit results are static
    if (now - (this._lastRenderTime || 0) < 60000) {
      return;
    }
    this._lastRenderTime = now;
  }


  get _t() {
    const T = {
      pl: {
        title: 'Sprawdzanie Bezpieczeństwa',
        loading: 'Wczytywanie...',
        noData: 'Brak danych',
        error: 'Błąd',
        refresh: 'Odśwież',
        save: 'Zapisz',
        cancel: 'Anuluj',
        locale: 'pl-PL',
      },
      en: {
        title: 'Security Check',
        loading: 'Loading...',
        noData: 'No data',
        error: 'Error',
        refresh: 'Refresh',
        save: 'Save',
        cancel: 'Cancel',
        locale: 'en-US',
      },
    };
    return T[this._lang] || T.en;
  }

  setConfig(config) {
    this._config = { title: config.title || 'Security Check', ...config };
    this._loadScanData();
  }

  _sanitize(s) { try { return decodeURIComponent(escape(s)); } catch(e) { return s; } }

  async _runAudit() {
    if (!this._hass) return;
    this._loading = true;
    this._updateContent();

    const checks = [];
    const findings = { critical: [], warning: [], info: [], pass: [] };

    try {
      let hostInfo = null, osInfo = null, supervisorInfo = null, coreInfo = null;
      try { const r = await this._hass.callWS({ type: 'supervisor/api', endpoint: '/host/info', method: 'get' }); hostInfo = r?.data || r; } catch(e) { console.debug('[security-check]', e.message); }
      try { const r = await this._hass.callWS({ type: 'supervisor/api', endpoint: '/os/info', method: 'get' }); osInfo = r?.data || r; } catch(e) { console.debug('[security-check]', e.message); }
      try { const r = await this._hass.callWS({ type: 'supervisor/api', endpoint: '/supervisor/info', method: 'get' }); supervisorInfo = r?.data || r; } catch(e) { console.debug('[security-check]', e.message); }
      try { const r = await this._hass.callWS({ type: 'supervisor/api', endpoint: '/core/info', method: 'get' }); coreInfo = r?.data || r; } catch(e) { console.debug('[security-check]', e.message); }

      // Detect non-supervised HA installation
      if (!hostInfo && !osInfo && !supervisorInfo && !coreInfo) {
        const L = this._lang === 'pl';
        findings.info.push({ id: 'no_supervisor', title: L ? 'Brak Supervisor API' : 'No Supervisor API detected', desc: L ? 'Cz\u0119\u015B\u0107 sprawdze\u0144 bezpiecze\u0144stwa wymaga HA OS lub HA Supervised (aktualizacje systemu, skanowanie dodatk\u00F3w, analiza sieci).' : 'Some security checks require HA OS or Supervised installation (system updates, addon scanning, network analysis).', fix: L ? 'Zainstaluj Home Assistant OS dla pe\u0142nej ochrony' : 'Install HA OS for full security coverage' });
      }

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
        addons = addonList?.addons || addonList?.data?.addons || [];
      } catch(e) { console.debug('[security-check]', e.message); }

      const installedAddons = addons.filter(a => a.installed);

      const outdatedAddons = installedAddons.filter(a => a.update_available);
      if (outdatedAddons.length > 0) {
        findings.warning.push({ id: 'addon_updates', title: `${outdatedAddons.length} addon(s) have updates`, desc: outdatedAddons.map(a => `${this._sanitize(a.name)}: ${a.version} \u2192 ${a.version_latest}`).join(', '), fix: 'Update addons via Settings \u2192 Add-ons' });
      } else if (installedAddons.length > 0) {
        findings.pass.push({ id: 'addon_updates', title: 'All addons up to date', desc: `${installedAddons.length} addon(s) installed` });
      }

      const hostNetAddons = installedAddons.filter(a => a.host_network);
      if (hostNetAddons.length > 0) {
        findings.info.push({ id: 'host_network', title: `${hostNetAddons.length} addon(s) use host networking`, desc: hostNetAddons.map(a => this._sanitize(a.name)).join(', '), fix: 'Verify these addons require host network access' });
      }

      const unprotectedAddons = installedAddons.filter(a => a.protected === false);
      if (unprotectedAddons.length > 0) {
        findings.critical.push({ id: 'unprotected_addons', title: `${unprotectedAddons.length} addon(s) with protection disabled`, desc: unprotectedAddons.map(a => this._sanitize(a.name)).join(', '), fix: 'Enable protection mode in addon settings unless you specifically need it disabled' });
      }

      const noAutoUpdate = installedAddons.filter(a => a.auto_update === false);
      if (noAutoUpdate.length > 3) {
        findings.info.push({ id: 'auto_update', title: `${noAutoUpdate.length} addon(s) without auto-update`, desc: noAutoUpdate.map(a => this._sanitize(a.name)).join(', '), fix: 'Consider enabling auto-update for non-critical addons' });
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

      // K1: Certificate & DNS security checks
      if (externalUrl && externalUrl.startsWith('https://')) {
        try {
          const hostname = new URL(externalUrl).hostname;
          if (hostname.endsWith('.duckdns.org') || hostname.endsWith('.nabu.casa')) {
            findings.pass.push({ id: 'ssl_cert_managed', title: 'SSL certificate is auto-managed', desc: `${hostname} uses managed SSL (auto-renewed)` });
          } else {
            findings.info.push({ id: 'ssl_cert_check', title: 'Verify SSL certificate expiry', desc: `Hostname: ${hostname} — ensure your cert is auto-renewed (Let''s Encrypt, Cloudflare, etc.)`, fix: 'Use certbot with auto-renewal or a Cloudflare tunnel for hassle-free SSL' });
          }
        } catch(e) { console.debug('[security-check]', e.message); }
      }

      // DNS rebinding protection
      try {
        const httpConfig = await this._hass.callWS({ type: 'config/core/info' }).catch(() => null);
        const hasCors = this._hass.config?.components?.includes('cors');
        if (!hasCors) {
          findings.pass.push({ id: 'dns_rebind', title: 'No CORS component detected', desc: 'Lower risk of DNS rebinding attacks' });
        }
      } catch(e) { console.debug('[security-check]', e.message); }


      let users = [];
      try {
        const userList = await this._hass.callWS({ type: 'config/auth/list' });
        users = userList || [];
      } catch(e) { console.debug('[security-check]', e.message); }

      if (users.length > 0) {
        const activeUsers = users.filter(u => u.is_active !== false);
        findings.info.push({ id: 'user_count', title: `${activeUsers.length} active user(s)`, desc: `Total registered: ${users.length}` });

        const owners = users.filter(u => u.is_owner);
        if (owners.length > 1) {
          findings.warning.push({ id: 'multi_owner', title: `${owners.length} owner accounts detected`, desc: owners.map(u => this._sanitize(u.name)).join(', '), fix: 'Limit owner accounts to minimize attack surface. Demote unnecessary owners to admin.' });
        }

        const localOnly = users.filter(u => u.local_only);
        if (localOnly.length > 0) {
          findings.pass.push({ id: 'local_only_users', title: `${localOnly.length} user(s) restricted to local access`, desc: localOnly.map(u => this._sanitize(u.name)).join(', ') });
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
          findings.warning.push({ id: 'ssh_addon', title: 'SSH addon is running', desc: `${this._sanitize(sshAddon.name)} (${sshAddon.version})`, fix: 'Ensure SSH uses key-based auth. Disable if not actively needed.' });
        } else {
          findings.info.push({ id: 'ssh_addon', title: 'SSH addon installed but stopped', desc: this._sanitize(sshAddon.name) });
        }
      }

      const mqttAddon = installedAddons.find(a => a.slug?.includes('mosquitto') || a.name?.toLowerCase().includes('mqtt'));
      if (mqttAddon && mqttAddon.state === 'started') {
        findings.info.push({ id: 'mqtt_broker', title: 'MQTT broker is running', desc: `${this._sanitize(mqttAddon.name)}`, fix: 'Ensure MQTT has authentication enabled and is not exposed to the internet' });
      }

      const automationEntities = allEntities.filter(e => e.startsWith('automation.'));
      const scriptEntities = allEntities.filter(e => e.startsWith('script.'));
      findings.info.push({ id: 'automation_count', title: `${automationEntities.length} automations, ${scriptEntities.length} scripts`, desc: 'Review automations periodically for unintended actions' });

      const riskyAddons = installedAddons.filter(a => {
        const name = (a.name || a.slug || '').toLowerCase();
        return name.includes('ftp') || name.includes('samba') || name.includes('telnet');
      });
      if (riskyAddons.length > 0) {
        findings.warning.push({ id: 'risky_services', title: 'Potentially risky network services', desc: riskyAddons.map(a => `${this._sanitize(a.name)} (${a.state || 'stopped'})`).join(', '), fix: 'Ensure file sharing services are properly secured and only accessible on local network' });
      }

      // Port exposure verification
      const portExposingAddons = installedAddons.filter(a => a.ports && Object.keys(a.ports).some(p => {
        const config = a.ports[p];
        return config && config.host_port !== null && config.host_port !== undefined;
      }));
      if (portExposingAddons.length > 0) {
        findings.info.push({ id: 'port_exposure', title: `${portExposingAddons.length} addon(s) expose host ports`, desc: portExposingAddons.map(a => this._sanitize(a.name) + ': ' + Object.entries(a.ports || {}).filter(([, c]) => c?.host_port).map(([p, c]) => p + '\u2192' + c.host_port).join(', ')).join('; '), fix: 'Verify each exposed port is necessary. Use Ingress when available to avoid port exposure.' });
      }

      // Long-lived access tokens check
      try {
        const llat = await this._hass.callWS({ type: 'auth/long_lived_access_token/list' }).catch(() => []);
        if (llat && llat.length > 5) {
          findings.warning.push({ id: 'many_tokens', title: `${llat.length} long-lived access tokens`, desc: 'Many active access tokens increase attack surface', fix: 'Review and revoke unused tokens at Profile \u2192 Long-lived access tokens' });
        } else if (llat && llat.length > 0) {
          findings.info.push({ id: 'access_tokens', title: `${llat.length} long-lived access token(s)`, desc: 'Review periodically for unused tokens' });
        }
      } catch(e) { console.debug('[security-check]', e.message); }

      // Camera exposure check
      const cameraEntities = allEntities.filter(e => e.startsWith('camera.'));
      if (cameraEntities.length > 0 && externalUrl) {
        findings.info.push({ id: 'camera_exposure', title: `${cameraEntities.length} camera(s) detected with external access`, desc: 'Camera streams may be accessible via external URL', fix: 'Ensure camera streams are not publicly accessible. Use Frigate Privacy or VPN for remote access.' });
      }

      // Webhook check
      const webhookEntities = allEntities.filter(e => e.includes('webhook'));
      if (webhookEntities.length > 0) {
        findings.info.push({ id: 'webhooks', title: `${webhookEntities.length} webhook-related entit(ies)`, desc: 'Webhooks provide URL-based access to HA actions', fix: 'Ensure webhook URLs are kept secret and rotated periodically' });
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
      } catch(e) { console.debug('[security-check]', e.message); }

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
      } catch(e) { console.debug('[security-check]', e.message); }

      // NEW CHECK: IP bans
      try {
        const banData = await this._hass.callApi('GET', 'config/ip_ban');
        if (banData?.banned_ips && banData.banned_ips.length > 0) {
          findings.info.push({ id: 'ip_bans', title: `${banData.banned_ips.length} IP(s) are banned`, desc: 'Failed login attempts have resulted in IP bans', fix: 'Review failed login attempts in the System Log' });
        }
      } catch(e) { console.debug('[security-check]', e.message); }

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
      } catch(e) { console.debug('[security-check]', e.message); }

      // NEW CHECK: Privileged addons
      try {
        const privilegedAddons = installedAddons.filter(a => a.privileged === true);
        if (privilegedAddons.length > 0) {
          findings.warning.push({ id: 'privileged_addons', title: `${privilegedAddons.length} addon(s) with privileged access`, desc: privilegedAddons.map(a => this._sanitize(a.name)).join(', '), fix: 'Privileged addons have root-level access. Verify they are trustworthy and necessary.' });
        }
      } catch(e) { console.debug('[security-check]', e.message); }

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
            return `${this._sanitize(a.name)}${ports ? `:${ports}` : ''}`;
          }).join('; ');
          findings.info.push({ id: 'exposed_addon_ports', title: `${exposedAddons.length} addon(s) expose port(s)`, desc: portList, fix: 'Ensure exposed ports are not accessible from the internet. Use firewall rules if needed.' });
        }
      } catch(e) { console.debug('[security-check]', e.message); }

      // NEW CHECK: Ingress vs exposed addons
      try {
        const nonIngressAddons = installedAddons.filter(a => a.ingress !== true && a.ports && Object.keys(a.ports).length > 0);
        if (nonIngressAddons.length > 0) {
          findings.info.push({ id: 'non_ingress_addons', title: `${nonIngressAddons.length} addon(s) not using Ingress`, desc: nonIngressAddons.map(a => this._sanitize(a.name)).join(', '), fix: 'Consider using Ingress for safer addon access (only through HA UI)' });
        }
      } catch(e) { console.debug('[security-check]', e.message); }

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
      } catch(e) { console.debug('[security-check]', e.message); }

      // NEW CHECK: Long-lived access tokens
      try {
        const tokenCount = users.filter(u => u.refresh_tokens && u.refresh_tokens.length > 0).length;
        if (tokenCount > 0) {
          findings.info.push({ id: 'access_tokens', title: `${tokenCount} user(s) with long-lived access token(s)`, desc: 'Access tokens should be rotated regularly and kept secure', fix: 'Rotate tokens periodically. Remove unused tokens from Settings \u2192 Users' });
        }
      } catch(e) { console.debug('[security-check]', e.message); }

      // NEW CHECK: Camera entities
      try {
        const cameraEntities = allEntities.filter(e => e.startsWith('camera.'));
        if (cameraEntities.length > 0) {
          findings.info.push({ id: 'camera_count', title: `${cameraEntities.length} camera(s) configured`, desc: 'Camera streams should not be exposed directly to the internet', fix: 'Use Secure (SSL/TLS) connection. Do not expose camera ports directly. Use Nabu Casa or tunnel.' });
        }
      } catch(e) { console.debug('[security-check]', e.message); }

      // NEW CHECK: Media source / proxy exposure
      try {
        const mediaEntities = allEntities.filter(e => e.startsWith('media_player.'));
        if (mediaEntities.length > 0) {
          findings.info.push({ id: 'media_exposure', title: `${mediaEntities.length} media player(s) configured`, desc: 'Ensure media sources are not serving public content', fix: 'Use local media libraries. Do not expose media over the internet unless necessary.' });
        }
      } catch(e) { console.debug('[security-check]', e.message); }

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
      } catch(e) { console.debug('[security-check]', e.message); }

      // NEW CHECK: Supervisor security (debug mode)
      try {
        if (supervisorInfo?.debug === true) {
          findings.warning.push({ id: 'supervisor_debug', title: 'Supervisor debug mode is enabled', desc: 'Debug mode exposes additional logs and may reduce security', fix: 'Disable debug mode in Supervisor settings unless troubleshooting' });
        }
        if (supervisorInfo?.debug_block === true) {
          findings.info.push({ id: 'supervisor_debug_block', title: 'Supervisor debug block is enabled', desc: 'This is a development/testing feature', fix: 'Ensure this is intentional and not left enabled in production' });
        }
      } catch(e) { console.debug('[security-check]', e.message); }

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
      } catch(e) { console.debug('[security-check]', e.message); }

      // NEW CHECK: Bluetooth / USB exposure in addons
      try {
        const btUsbAddons = installedAddons.filter(a => {
          const config = a.devices || [];
          return config.some(d => d && (d.includes('bluetooth') || d.includes('usb') || d.includes('/dev/bus/usb')));
        });
        if (btUsbAddons.length > 0) {
          findings.info.push({ id: 'bt_usb_addons', title: `${btUsbAddons.length} addon(s) with Bluetooth/USB access`, desc: btUsbAddons.map(a => this._sanitize(a.name)).join(', '), fix: 'Verify that these addons are trustworthy. USB/Bluetooth access provides direct hardware access.' });
        }
      } catch(e) { console.debug('[security-check]', e.message); }

      // NEW CHECK: Firewall / Network isolation
      try {
        if (hostInfo?.chassis && hostInfo.chassis !== 'embedded') {
          findings.warning.push({ id: 'non_haos', title: 'Running on non-HAOS system', desc: `Detected chassis: ${hostInfo.chassis}. Missing Supervisor network isolation.`, fix: 'Use Home Assistant OS for built-in network security features. Manual firewall configuration required on generic Linux.' });
        }
      } catch(e) { console.debug('[security-check]', e.message); }

      // NEW CHECK: Backup encryption
      try {
        const backups = await this._hass.callWS({ type: 'supervisor/api', endpoint: '/backups', method: 'get' });
        const backupList = backups?.backups || backups?.data?.backups || [];
        if (backupList.length > 0) {
          const unencryptedBackups = backupList.filter(b => b.protected === false);
          if (unencryptedBackups.length > 0) {
            findings.warning.push({ id: 'unencrypted_backups', title: `${unencryptedBackups.length} backup(s) without encryption`, desc: 'Unencrypted backups expose sensitive data', fix: 'Create new backups with a password. Set a backup password in Settings \u2192 System \u2192 Backups' });
          }
        }
      } catch(e) { console.debug('[security-check]', e.message); }

      // NEW CHECK: MQTT anonymous access
      try {
        const mqttAddonRunning = installedAddons.find(a => (a.slug || '').includes('mosquitto') && a.state === 'started');
        if (mqttAddonRunning) {
          try {
            const mqttConfig = await this._hass.callWS({ type: 'supervisor/api', endpoint: `/addons/${mqttAddonRunning.slug}/options`, method: 'get' });
            const opts = mqttConfig?.options || mqttConfig?.data?.options || {};
            if (opts.anonymous === true) {
              findings.critical.push({ id: 'mqtt_anonymous', title: 'MQTT allows anonymous connections', desc: 'Anyone on the network can connect to your MQTT broker without authentication', fix: 'Disable anonymous access in Mosquitto addon configuration and set up proper user credentials' });
            } else {
              findings.pass.push({ id: 'mqtt_anonymous', title: 'MQTT requires authentication', desc: 'Anonymous connections are disabled' });
            }
          } catch(e2) {
            findings.info.push({ id: 'mqtt_config', title: 'Could not verify MQTT configuration', desc: 'Unable to read Mosquitto addon settings', fix: 'Manually verify MQTT authentication settings' });
          }
        }
      } catch(e) { console.debug('[security-check]', e.message); }

      // NEW CHECK: Dangerous template sensors
      try {
        const templateEntities = allEntities.filter(e => e.includes('template') || e.includes('command_line'));
        if (templateEntities.length > 10) {
          findings.info.push({ id: 'template_sensors', title: `${templateEntities.length} template/command_line entities`, desc: 'Large number of template entities may indicate complex configs that need review', fix: 'Periodically review template sensors for security implications' });
        }
      } catch(e) { console.debug('[security-check]', e.message); }

      // NEW CHECK: HTTP configuration (CORS)
      try {
        const httpConfig = this._hass.config;
        if (httpConfig?.components?.includes('cors') || httpConfig?.allowlist_external_urls?.length > 0) {
          findings.info.push({ id: 'cors_config', title: 'CORS or external URL allowlist configured', desc: 'Cross-origin requests or external URLs are permitted', fix: 'Review allowed origins and URLs to ensure they are trusted' });
        }
      } catch(e) { console.debug('[security-check]', e.message); }

      // NEW CHECK: Port 8123 direct exposure
      try {
        const externalUrl = this._hass.config?.external_url || '';
        if (externalUrl && externalUrl.includes(':8123')) {
          findings.warning.push({ id: 'port_exposure', title: 'Default port 8123 exposed externally', desc: `External URL uses default HA port: ${externalUrl}`, fix: 'Use a reverse proxy (NGINX, Caddy) or Nabu Casa instead of direct port forwarding. Change default port if exposing directly.' });
        }
      } catch(e) { console.debug('[security-check]', e.message); }

      // NEW CHECK: Person tracking entities
      try {
        const personEntities = allEntities.filter(e => e.startsWith('person.'));
        if (personEntities.length > 0) {
          findings.info.push({ id: 'person_tracking', title: `${personEntities.length} person(s) tracked`, desc: 'Location data is sensitive PII', fix: 'Ensure only trusted users have access to person entities. Review recorder include/exclude.' });
        }
      } catch(e) { console.debug('[security-check]', e.message); }

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
      let networkInfo = [];
      try {
        const netResp = await this._hass.callWS({ type: 'supervisor/api', endpoint: '/network/info', method: 'get' });
        networkInfo = netResp?.interfaces || netResp?.data?.interfaces || [];
      } catch(ne) { console.debug('[ha-security-check] caught:', e); }
      if (networkInfo.length === 0) {
        try {
          const netWS = await this._hass.callWS({ type: 'network' });
          if (netWS?.adapters) {
            networkInfo = netWS.adapters.filter(a => a.enabled).map(a => ({
              interface: a.name, type: a.name.startsWith('wlan') ? 'wireless' : 'ethernet',
              enabled: a.enabled, connected: a.enabled, mac: '',
              ipv4: { address: a.ipv4 ? a.ipv4.map(ip => ip.address + '/' + ip.network_prefix) : [], method: a.auto ? 'auto' : 'manual', gateway: null, nameservers: [] }
            }));
          }
        } catch(ne2) { console.debug('[ha-security-check] caught:', e); }
      }
      try {
        const infoResp = await this._hass.callWS({ type: 'supervisor/api', endpoint: '/info', method: 'get' });
        hostInfo = infoResp || null;
      } catch(ne3) { console.debug('[ha-security-check] caught:', e); }

      // Fetch config entries (integrations)
      let cfgEntries = [];
      try {
        const entries = await this._hass.callWS({type: 'config_entries/list'});
        cfgEntries = entries || [];
      } catch(e) { console.debug('[security-check]', e.message); }

      this._auditData = { findings, score, critCount, warnCount, passCount, infoCount, totalChecks, users, addons: installedAddons, integrations: cfgEntries, entities: allEntities.length, networkInterfaces: networkInfo, hostInfo: hostInfo };
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
    if (!this._hass) return;
    const html = `
      <style>${window.HAToolsBentoCSS || ""}
/* === HA Tools split — premium banners (donate / intro / prereq) === */

/* Donation footer — diamond top */
.donate-section {  margin: 24px 0 4px; padding: 20px 24px; position: relative; overflow: hidden;  background: linear-gradient(135deg, rgba(99,102,241,0.06), rgba(236,72,153,0.06));  border: 1px solid rgba(99,102,241,0.18); border-radius: var(--bento-radius-md, 18px);  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18px;  font-family: 'Inter', -apple-system, sans-serif;}
.donate-section::before {  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);}
.donate-section .donate-text { flex: 1; min-width: 240px; }
.donate-section h3 {  margin: 0 0 6px; font-size: 16px; font-weight: 700; letter-spacing: -0.02em;  background: linear-gradient(135deg, #6366f1, #ec4899);  -webkit-background-clip: text; background-clip: text; color: transparent;}
.donate-section p { margin: 0; font-size: 13px; line-height: 1.55; color: var(--bento-text-secondary, #57534e); letter-spacing: -0.005em; }
.donate-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
.donate-btn {  display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px;  border-radius: 12px; font-weight: 700; font-size: 13px; letter-spacing: -0.005em;  text-decoration: none; transition: transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s, filter 0.2s;  border: 1px solid transparent;}
.donate-btn:hover { transform: translateY(-2px); filter: brightness(1.05); }
.donate-btn.coffee {  background: linear-gradient(135deg, #FFDD00, #FFC700); color: #000;  box-shadow: 0 4px 14px -2px rgba(255, 221, 0, 0.4);}
.donate-btn.coffee:hover { box-shadow: 0 8px 24px -4px rgba(255, 221, 0, 0.55); }
.donate-btn.paypal {  background: linear-gradient(135deg, #0070ba, #005ea6); color: #fff;  box-shadow: 0 4px 14px -2px rgba(0, 112, 186, 0.45);}
.donate-btn.paypal:hover { box-shadow: 0 8px 24px -4px rgba(0, 112, 186, 0.6); }
@media (prefers-color-scheme: dark) {  .donate-section { background: linear-gradient(135deg, rgba(129,140,248,0.10), rgba(244,114,182,0.10)); border-color: rgba(129,140,248,0.25); }  .donate-section h3 { background: linear-gradient(135deg, #a5b4fc, #f9a8d4); -webkit-background-clip: text; background-clip: text; color: transparent; }  .donate-section p { color: #d6d3d1; } }
@media (max-width: 600px) {  .donate-section { flex-direction: column; text-align: center; padding: 18px; }  .donate-buttons { justify-content: center; width: 100%; } }

/* Prereq banner — premium */
.prereq-banner {  display: flex; align-items: flex-start; gap: 14px; padding: 16px 20px;  border-radius: var(--bento-radius-sm, 12px); margin: 0 0 16px;  font-size: 13px; line-height: 1.55; border: 1px solid;  font-family: 'Inter', sans-serif; letter-spacing: -0.005em;  position: relative; overflow: hidden;}
.prereq-banner::before {  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;}
.prereq-banner.prereq-error { background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.25); color: #991b1b; }
.prereq-banner.prereq-error::before { background: linear-gradient(180deg, #ef4444, #f87171); }
.prereq-banner.prereq-info  { background: rgba(99,102,241,0.06); border-color: rgba(99,102,241,0.25); color: #4338ca; }
.prereq-banner.prereq-info::before  { background: linear-gradient(180deg, #6366f1, #8b5cf6); }
.prereq-banner .prereq-icon { font-size: 22px; line-height: 1; padding-top: 2px; flex-shrink: 0; }
.prereq-banner .prereq-text { flex: 1; min-width: 0; }
.prereq-banner .prereq-text strong { font-weight: 700; letter-spacing: -0.01em; }
.prereq-banner code {  background: rgba(0,0,0,0.06); padding: 1px 7px; border-radius: 5px;  font-size: 12px; font-family: 'JetBrains Mono', ui-monospace, monospace;  border: 1px solid rgba(0,0,0,0.08);}
.prereq-banner .prereq-cta {  display: inline-flex; align-items: center; padding: 8px 16px; border-radius: 10px;  background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff !important;  text-decoration: none; font-weight: 700; font-size: 12.5px; flex-shrink: 0;  letter-spacing: -0.005em;  box-shadow: 0 4px 14px -2px rgba(99,102,241,0.45);  transition: all 0.2s cubic-bezier(0.4,0,0.2,1);}
.prereq-banner .prereq-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px -4px rgba(99,102,241,0.6); }
@media (prefers-color-scheme: dark) {  .prereq-banner.prereq-error { background: rgba(248,113,113,0.10); border-color: rgba(248,113,113,0.30); color: #fca5a5; }  .prereq-banner.prereq-info  { background: rgba(129,140,248,0.10); border-color: rgba(129,140,248,0.30); color: #c7d2fe; }  .prereq-banner code { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.10); } }
@media (max-width: 600px) {  .prereq-banner { flex-direction: column; align-items: stretch; padding-left: 20px; }  .prereq-banner .prereq-cta { align-self: flex-start; } }

/* First-run intro banner — premium */
.intro-banner {  position: relative; padding: 18px 52px 18px 22px; margin: 0 0 18px;  background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.06));  border: 1px solid rgba(99,102,241,0.20);  border-radius: var(--bento-radius-sm, 12px);  font-size: 13px; line-height: 1.55; overflow: hidden;  font-family: 'Inter', sans-serif; letter-spacing: -0.005em;  animation: bentoSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);}
.intro-banner::before {  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);}
.intro-banner .intro-headline {  font-weight: 700; font-size: 14.5px; margin-bottom: 10px; letter-spacing: -0.02em;  background: linear-gradient(135deg, #6366f1, #ec4899);  -webkit-background-clip: text; background-clip: text; color: transparent;  display: flex; align-items: center; gap: 8px;}
.intro-banner .intro-steps {  margin: 8px 0 0; padding: 0; list-style: none; counter-reset: introstep;}
.intro-banner .intro-steps li {  margin-bottom: 8px; line-height: 1.55; color: var(--bento-text, #0c0a09);  padding-left: 32px; position: relative; counter-increment: introstep;  font-size: 12.5px;}
.intro-banner .intro-steps li::before {  content: counter(introstep); position: absolute; left: 0; top: -1px;  width: 22px; height: 22px; border-radius: 50%;  background: var(--bento-card, #fff); border: 1px solid rgba(99,102,241,0.25);  display: flex; align-items: center; justify-content: center;  font-size: 11px; font-weight: 800; color: #6366f1;  font-family: 'JetBrains Mono', ui-monospace, monospace;  font-feature-settings: 'tnum' 1;}
.intro-banner .intro-dismiss {  position: absolute; top: 12px; right: 14px;  background: var(--bento-card, transparent); border: 1px solid var(--bento-border, transparent);  cursor: pointer; font-size: 14px; line-height: 1;  color: var(--bento-text-secondary, #64748B);  padding: 4px 8px; border-radius: 999px;  transition: all 0.15s ease;}
.intro-banner .intro-dismiss:hover {  background: var(--bento-bg-2, #e7e5e4); color: var(--bento-text, #0c0a09);  transform: rotate(90deg);}
@media (prefers-color-scheme: dark) {  .intro-banner { background: linear-gradient(135deg, rgba(129,140,248,0.14), rgba(244,114,182,0.10)); border-color: rgba(129,140,248,0.30); }  .intro-banner .intro-headline { background: linear-gradient(135deg, #a5b4fc, #f9a8d4); -webkit-background-clip: text; background-clip: text; color: transparent; }  .intro-banner .intro-steps li { color: #fafaf9; }  .intro-banner .intro-steps li::before { background: #16161f; border-color: rgba(129,140,248,0.35); color: #a5b4fc; }  .intro-banner .intro-dismiss { background: #16161f; border-color: #27272f; color: #d6d3d1; }  .intro-banner .intro-dismiss:hover { background: #27272f; color: #fafaf9; } }


/* ===== BENTO LIGHT MODE DESIGN SYSTEM ===== */

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
  --bento-bg: var(--primary-background-color, #F8FAFC);
  --bento-card: var(--card-background-color, #FFFFFF);
  --bento-border: var(--divider-color, #E2E8F0);
  --bento-text: var(--primary-text-color, #1E293B);
  --bento-text-secondary: var(--secondary-text-color, #64748B);
  --bento-text-muted: var(--disabled-text-color, #94A3B8);
  --bento-radius-xs: 6px;
  --bento-radius-sm: 10px;
  --bento-radius-md: 16px;
  --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04);
  --bento-shadow-lg: 0 8px 25px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04);
  --bento-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
@media (prefers-color-scheme: dark) {
  :host {
    --bento-bg: var(--primary-background-color, #1a1a2e);
    --bento-card: var(--card-background-color, #16213e);
    --bento-text: var(--primary-text-color, #e2e8f0);
    --bento-text-secondary: var(--secondary-text-color, #94a3b8);
    --bento-border: var(--divider-color, #334155);
    --bento-success: #34d399;
    --bento-warning: #fbbf24;
    --bento-error: #f87171;
  }
}
:host-context([data-themes]) {
  --bento-bg: var(--lovelace-background, var(--primary-background-color, #F8FAFC));
  --bento-card: var(--card-background-color, var(--ha-card-background, #FFFFFF));
  --bento-text: var(--primary-text-color, #1E293B);
  --bento-text-secondary: var(--secondary-text-color, #64748B);
  --bento-border: var(--divider-color, #E2E8F0);
}

/* Card */
.card, .ha-card, ha-card, .main-card, .exporter-card, .card, .reports-card, .storage-card, .chore-card, .cry-card, .backup-card, .network-card, .sentence-card, .energy-card, .panel-card {
  background: var(--bento-card) !important;
  border: 1px solid var(--bento-border) !important;
  border-radius: var(--bento-radius-md) !important;
  box-shadow: var(--bento-shadow-sm) !important;
  font-family: 'Inter', sans-serif !important;
  color: var(--bento-text) !important;
  overflow: visible;
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
.tab, .tab-btn, .tab-btn {
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
.tab:hover, .tab-btn:hover, .tab-btn:hover {
  color: var(--bento-primary);
  background: var(--bento-primary-light);
}
.tab.active, .tab-btn.active, .tab-btn.active {
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



:host {
  --bento-bg: var(--primary-background-color, #F8FAFC);
  --bento-card: var(--card-background-color, #FFFFFF);
  --bento-primary: #3B82F6;
  --bento-primary-hover: #2563EB;
  --bento-text: var(--primary-text-color, #1E293B);
  --bento-text-secondary: var(--secondary-text-color, #64748B);
  --bento-border: var(--divider-color, #E2E8F0);
  --bento-success: #10B981;
  --bento-warning: #F59E0B;
  --bento-error: #EF4444;
  --bento-radius-sm: 10px;
  --bento-radius-xs: 6px;
  --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.06);
  --bento-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: block;
  color-scheme: light dark;
}
* { box-sizing: border-box; }

.card, .card-container, .reports-card, .export-card {
  background: var(--bento-card); border-radius: var(--bento-radius-sm); box-shadow: var(--bento-shadow-sm);
  padding: 28px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--bento-text); border: 1px solid var(--bento-border); animation: fadeSlideIn 0.4s ease-out;
}
.card-header { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: var(--bento-text); letter-spacing: -0.01em; display: flex; justify-content: space-between; align-items: center; }
.card-header h2 { font-size: 20px; font-weight: 700; color: var(--bento-text); margin: 0; letter-spacing: -0.01em; }
.card-title, .title, .header-title, .pan-title { font-size: 20px; font-weight: 700; color: var(--bento-text); letter-spacing: -0.01em; }
.header, .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--bento-border); margin-bottom: 24px; overflow-x: auto; padding-bottom: 0; }
.tab, .tab-btn, .tab-btn { padding: 10px 20px; border: none; background: transparent; color: var(--bento-text-secondary); cursor: pointer; font-size: 14px; font-weight: 500; border-bottom: 2px solid transparent; transition: var(--bento-transition); white-space: nowrap; margin-bottom: -2px; border-radius: 8px 8px 0 0; font-family: 'Inter', sans-serif; }
.tab.active, .tab-btn.active, .tab-btn.active { color: var(--bento-primary); border-bottom-color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
.tab:hover, .tab-btn:hover, .tab-btn:hover { color: var(--bento-primary); background: rgba(59, 130, 246, 0.04); }
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
.alert-item:hover { box-shadow: var(--bento-shadow-sm); }
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
  .score-section { gap: 16px; flex-wrap: wrap; }
  .score-ring { width: 100px; height: 100px; }
  .score-ring svg { width: 100px; height: 100px; }
  .score-num { font-size: 22px; }
  .score-summary h3 { font-size: 13px; }
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


        /* === MOBILE FIX === */
        @media (max-width: 768px) {
          .tabs { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; gap: 2px; }
          .tab, .tab-btn, .tab-btn { padding: 6px 10px; font-size: 12px; white-space: nowrap; }
          .card, .card-container { padding: 14px; }
          .stats, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .stat-val, .kpi-val, .metric-val { font-size: 18px; }
          .stat-lbl, .kpi-lbl, .metric-lbl { font-size: 10px; }
          .panels, .board { flex-direction: column; }
          .column { min-width: unset; }
          h2 { font-size: 18px; }
          h3 { font-size: 15px; }
        }
        @media (max-width: 480px) {
          .tabs { gap: 1px; }
          .tab, .tab-btn, .tab-btn { padding: 5px 8px; font-size: 11px; }
          .stats, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid { grid-template-columns: 1fr 1fr; }
          .stat-val, .kpi-val, .metric-val { font-size: 16px; }
          .score-section { flex-direction: column; align-items: center; text-align: center; }
          .score-ring { width: 90px; height: 90px; }
          .score-ring svg { width: 90px; height: 90px; }
          .score-num { font-size: 20px; }
          .summary-row { justify-content: center; }
        }
      

</style>
      
        <div class="card">
          <div class="card-header">
            <h2>${_esc(this._config.title || '')}</h2>
            <!-- Refresh handled by panel toolbar -->
          </div>
          <div class="tabs">
            <button class="tab-button ${this._activeTab === 'overview' ? 'active' : ''}" data-tab="overview">Overview</button>
            <button class="tab-button ${this._activeTab === 'critical' ? 'active' : ''}" data-tab="critical">Findings</button>
            <button class="tab-button ${this._activeTab === 'addons' ? 'active' : ''}" data-tab="addons">Addons & Integrations</button>
            <button class="tab-button ${this._activeTab === 'network' ? 'active' : ''}" data-tab="network">Network</button>
            <button class="tab-button ${this._activeTab === 'users' ? 'active' : ''}" data-tab="users">Users</button>
            <button class="tab-button ${this._activeTab === 'tips' ? 'active' : ''}" data-tab="tips">Tips</button>
          </div>
          <div id="content"></div>
        
        <!-- Support / Donation -->
        <div class="donate-section" data-source="ha-tools-split">
          <div class="donate-text">
            <h3>❤️ ${this._lang === 'pl' ? 'Wesprzyj rozwój HA Tools' : 'Support HA Tools Development'}</h3>
            <p>${this._lang === 'pl' ? 'Jeśli to narzędzie ułatwia Ci życie z Home Assistant, rozważ wsparcie projektu. Każda kawa motywuje do dalszego rozwoju!' : 'If this tool makes your Home Assistant life easier, consider supporting the project. Every coffee motivates further development!'}</p>
          </div>
          <div class="donate-buttons">
            <a class="donate-btn coffee" href="https://buymeacoffee.com/macsiem" target="_blank" rel="noopener noreferrer">☕ Buy Me a Coffee</a>
            <a class="donate-btn paypal" href="https://www.paypal.com/donate/?hosted_button_id=Y967H4PLRBN8W" target="_blank" rel="noopener noreferrer">💳 PayPal</a>
          </div>
        </div>
        </div>
      
    `;
    if (this._lastHtml === html) return;
    this._lastHtml = html;
    this.shadowRoot.innerHTML = html;

    this.shadowRoot.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.shadowRoot.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._activeTab = btn.dataset.tab;
        history.replaceState(null, '', location.pathname + '#' + this._toolId + '/' + this._activeTab);
        this._updateContent();
      });
    });

    // Score explainer toggle listener
    const toggle = this.shadowRoot.querySelector('.score-explainer-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const body = this.shadowRoot.querySelector('.score-explainer-body');
        const arrow = this.shadowRoot.querySelector('.score-explainer-arrow');
        if (body) {
          const isHidden = body.style.display === 'none';
          body.style.display = isHidden ? 'block' : 'none';
          if (arrow) arrow.style.transform = isHidden ? 'rotate(180deg)' : '';
        }
      });
    }

    // Refresh now handled by panel toolbar (removed internal Re-scan button)
  }

  _updateContent() {
    const content = this.shadowRoot.getElementById('content');
    if (!content) return;
    if (this._loading) { content.innerHTML = '<div class="loading"><div class="spinner"></div>Running security audit...</div>'; return; }
    if (!this._auditData || this._auditData.error) { content.innerHTML = `<div class="error">\u26A0\uFE0F ${_esc(this._auditData?.error || 'Audit failed')}</div>`; return; }
    const d = this._auditData;
    switch (this._activeTab) {
      case 'overview': content.innerHTML = this._renderOverview(d); break;
      case 'critical': content.innerHTML = this._renderFindings(d); break;
      case 'addons': content.innerHTML = this._renderAddonsAndIntegrations(d); break;
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
    const noSupervisor = d.findings?.info?.some(f => f.id === 'no_supervisor');
    const addonsDisplay = noSupervisor && d.addons.length === 0 ? 'N/A' : String(d.addons.length);
    const integrationsDisplay = d.integrations?.length || 0;
    html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:16px"><div style="padding:10px;background:var(--bento-bg);border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700">${addonsDisplay}</div><div style="font-size:11px;color:var(--bento-text-secondary)">${noSupervisor && d.addons.length === 0 ? 'Addons (HA OS only)' : 'Addons installed'}</div></div><div style="padding:10px;background:var(--bento-bg);border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700">${integrationsDisplay}</div><div style="font-size:11px;color:var(--bento-text-secondary)">Integrations</div></div><div style="padding:10px;background:var(--bento-bg);border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700">${d.users.length}</div><div style="font-size:11px;color:var(--bento-text-secondary)">User accounts</div></div><div style="padding:10px;background:var(--bento-bg);border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700">${d.entities}</div><div style="font-size:11px;color:var(--bento-text-secondary)">Entities</div></div><div style="padding:10px;background:var(--bento-bg);border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700">${d.totalChecks}</div><div style="font-size:11px;color:var(--bento-text-secondary)">Checks run</div></div></div>`;
    if (d.critCount > 0) { html += '<div class="section-title">\u{1F6A8} Critical Issues</div>'; d.findings.critical.forEach(f => { html += this._renderFinding(f, 'critical'); }); }
    if (d.warnCount > 0) { html += '<div class="section-title">\u26A0\uFE0F Warnings</div>'; d.findings.warning.forEach(f => { html += this._renderFinding(f, 'warning'); }); }
    // Scoring methodology explanation - collapsible
    const scoringL = this._lang === 'pl';
    html += `<div style="margin-top:16px;padding:14px;background:var(--bento-bg);border:1px solid var(--bento-border);border-radius:var(--bento-radius-sm);">
      <div class="score-explainer-toggle" style="font-size:13px;font-weight:600;color:var(--bento-text);cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
        <span>${scoringL ? '\u{1F4CA} Jak obliczany jest wynik?' : '\u{1F4CA} How is the score calculated?'}</span>
        <span class="score-explainer-arrow" style="transition:transform 0.2s;font-size:12px;">\u25BC</span>
      </div>
      <div class="score-explainer-body" style="display:none;margin-top:8px;">
        <div style="font-size:12px;color:var(--bento-text-secondary);line-height:1.6;">
          ${scoringL ? 'Wynik startowy: <b>100 punkt\u00F3w</b>' : 'Starting score: <b>100 points</b>'}<br>
          \u{1F6A8} ${scoringL ? 'Krytyczne' : 'Critical'}: <b>-15 ${scoringL ? 'pkt za ka\u017Cdy' : 'pts each'}</b> (${scoringL ? 'np. brak SSL, wy\u0142\u0105czona ochrona addon' : 'e.g. no SSL, disabled addon protection'})<br>
          \u26A0\uFE0F ${scoringL ? 'Ostrze\u017Cenia' : 'Warnings'}: <b>-5 ${scoringL ? 'pkt za ka\u017Cde' : 'pts each'}</b> (${scoringL ? 'np. nieaktualne addony, wiele kont Owner' : 'e.g. outdated addons, multiple owner accounts'})<br>
          \u2139\uFE0F Info: <b>-0.5 ${scoringL ? 'pkt za ka\u017Cde' : 'pts each'}</b> (${scoringL ? 'np. shell commands, MQTT' : 'e.g. shell commands, MQTT broker'})<br>
          \u2705 ${scoringL ? 'Spe\u0142nione' : 'Passed'}: ${scoringL ? 'bez kary' : 'no penalty'}
        </div>
        <div style="font-size:12px;color:var(--bento-text-secondary);margin-top:8px;">
          ${scoringL ? '<b>Sprawdzane:</b> aktualizacje Core/OS/Supervisor, SSL/HTTPS, ochrona addon\u00F3w, auto-update, host networking, u\u017Cytkownicy i uprawnienia, SSH/MQTT/FTP/Samba, trusted networks, legacy API password, IP bans, HACS repos, DNS rebinding, CORS' : '<b>Checks:</b> Core/OS/Supervisor updates, SSL/HTTPS, addon protection, auto-update, host networking, users & permissions, SSH/MQTT/FTP/Samba, trusted networks, legacy API password, IP bans, HACS repos, DNS rebinding, CORS'}
        </div>
      </div>
    </div>`;
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

  _renderAddonsAndIntegrations(d) {
    let html = '';
    // Addons section
    html += this._renderAddonsSection(d);
    // Integrations section
    html += this._renderIntegrationsSection(d);
    return html;
  }

  _renderAddonsSection(d) {
    if (!d.addons.length) {
      const noSupervisor = d.findings?.info?.some(f => f.id === 'no_supervisor');
      if (noSupervisor) return `<div class="empty-msg">\u2139\uFE0F ${this._lang === 'pl' ? 'Addony wymagaj\u0105 HA OS lub Supervised. Brak Supervisor API na tej instalacji.' : 'Addons require HA OS or Supervised. No Supervisor API detected on this installation.'}</div>`;
      return '<div class="empty-msg">No addons installed</div>';
    }
    return `<div class="table-container"><table class="entity-table"><thead><tr><th>Addon</th><th>Version</th><th>State</th><th>Protection</th><th>Auto-update</th><th>Host Network</th></tr></thead><tbody>${d.addons.map(a => { const prot = a.protected !== false; const autoUp = a.auto_update !== false; const hostNet = a.host_network === true; const updateAvail = a.update_available; return `<tr><td>${this._sanitize(a.name || a.slug)}${updateAvail ? ' \u2B06\uFE0F' : ''}</td><td>${a.version || '-'}${updateAvail ? ` \u2192 ${a.version_latest}` : ''}</td><td><span class="status-dot" style="background:${a.state === 'started' ? '#4caf50' : '#9e9e9e'}"></span>${a.state || 'stopped'}</td><td style="color:${prot ? '#4caf50' : '#f44336'}">${prot ? '\u2713 On' : '\u2717 Off'}</td><td style="color:${autoUp ? '#4caf50' : '#ff9800'}">${autoUp ? '\u2713 On' : '\u2717 Off'}</td><td style="color:${hostNet ? '#ff9800' : 'var(--bento-text-secondary)'}">${hostNet ? '\u26A0 Yes' : 'No'}</td></tr>`; }).join('')}</tbody></table></div>`;
  }

  _renderUsers(d) {
    if (!d.users.length) return '<div class="empty-msg">Could not retrieve user list</div>';
    return `<div class="table-container"><table class="entity-table"><thead><tr><th>User</th><th>Role</th><th>Active</th><th>Local Only</th><th>System</th></tr></thead><tbody>${d.users.map(u => `<tr><td>${this._sanitize(u.name || 'Unnamed')}</td><td>${u.is_owner ? '\u{1F451} Owner' : u.group_ids?.includes('system-admin') ? 'Admin' : 'User'}</td><td style="color:${u.is_active !== false ? '#4caf50' : '#9e9e9e'}">${u.is_active !== false ? '\u2713 Active' : 'Inactive'}</td><td>${u.local_only ? '\u2713 Yes' : 'No'}</td><td>${u.system_generated ? '\u{1F916} Yes' : 'No'}</td></tr>`).join('')}</tbody></table></div>`;
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
    const hi = d.hostInfo || {};
    if (hi.hostname) html += `<span style="font-weight:600;color:var(--bento-text-secondary)">Hostname</span><span>${hi.hostname}</span>`;
    if (hi.operating_system) html += `<span style="font-weight:600;color:var(--bento-text-secondary)">OS</span><span>${hi.operating_system}</span>`;
    if (hi.supervisor) html += `<span style="font-weight:600;color:var(--bento-text-secondary)">Supervisor</span><span>${hi.supervisor}</span>`;
    html += `<span style="font-weight:600;color:var(--bento-text-secondary)">Time zone</span><span>${haConfig.time_zone || 'N/A'}</span>`;
    const integrationCount = d.integrations?.length || (haConfig.components || []).length;
    const componentCount = (haConfig.components || []).length;
    html += `<span style="font-weight:600;color:var(--bento-text-secondary)">Integrations</span><span>${integrationCount > 0 ? integrationCount + ' entries' : componentCount > 0 ? componentCount + ' components' : 'N/A'}</span>`;
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
        html += `<tr><td>${this._sanitize(a.name)}</td><td style="color:${color}">${hasIngress ? '\u2713 Yes' : '\u2717 No'}</td><td><code style="font-size:12px;background:var(--bento-bg);padding:4px 8px;border-radius:4px">${ports}</code></td><td><span class="status-dot" style="background:${a.state === 'started' ? '#4caf50' : '#9e9e9e'}"></span>${a.state || 'stopped'}</td></tr>`;
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

  _renderIntegrations(d) { return this._renderIntegrationsSection(d); }

  _renderIntegrationsSection(d) {
    if (!d.integrations || !d.integrations.length) return '<div class="empty-msg">No integrations configured</div>';
    const hacsInts = d.integrations.filter(e => e.source === 'hacs' || e.source === 'custom');
    const coreInts = d.integrations.filter(e => e.source !== 'hacs' && e.source !== 'custom');
    const errorInts = d.integrations.filter(e => e.state === 'setup_error');
    let html = `<div style="margin-top:20px"><h3 style="margin:0 0 12px;font-size:15px;color:var(--bento-text);">\u{1F50C} Integrations (${d.integrations.length})</h3>`;
    html += `<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">`;
    html += `<div style="padding:4px 10px;background:rgba(33,150,243,0.08);border-radius:6px;font-size:11px;color:var(--bento-text-secondary);">\u{1F4E6} Core: ${coreInts.length}</div>`;
    html += `<div style="padding:4px 10px;background:rgba(255,152,0,0.08);border-radius:6px;font-size:11px;color:var(--bento-text-secondary);">\u{1F3EA} HACS: ${hacsInts.length}</div>`;
    if (errorInts.length > 0) html += `<div style="padding:4px 10px;background:rgba(244,67,54,0.08);border-radius:6px;font-size:11px;color:#f44336;">\u26A0 Errors: ${errorInts.length}</div>`;
    html += `</div>`;
    html += `<div class="table-container"><table class="entity-table"><thead><tr><th>Integration</th><th>Domain</th><th>Source</th><th>Status</th></tr></thead><tbody>`;
    d.integrations.forEach(e => {
      const statusColor = e.state === 'loaded' ? '#4caf50' : e.state === 'setup_error' ? '#f44336' : e.state === 'not_loaded' ? '#ff9800' : '#9e9e9e';
      const isHacs = e.source === 'hacs' || e.source === 'custom';
      html += `<tr><td>${this._sanitize(e.title || e.domain)}</td><td style="font-family:monospace;font-size:12px">${e.domain}</td>`;
      html += `<td><span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500;background:${isHacs ? 'rgba(255,152,0,0.1);color:#f57c00' : 'rgba(33,150,243,0.1);color:#1976d2'}">${isHacs ? '\u{1F3EA} HACS' : '\u{1F4E6} Core'}</span></td>`;
      html += `<td style="color:${statusColor};font-weight:600">\u25CF ${e.state || 'unknown'}</td></tr>`;
    });
    html += '</tbody></table></div></div>';
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

  disconnectedCallback() {
    // Cleanup any active event listeners or timers
  }

  setActiveTab(tabId) {
    this._activeTab = tabId;
    this._render();
  }
}

if (!customElements.get('ha-security-check')) {
  customElements.define('ha-security-check', HASecurityCheck);
}

console.info(
  '%c  HA-SECURITY-CHECK  %c v1.0.0 ',
  'background: #f44336; color: white; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;',
  'background: #ffebee; color: #f44336; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;'
);

class HaSecurityCheckEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }
  _dispatch() {
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
            :host { display:block; padding:16px; }
            h3 { margin:0 0 16px; font-size:15px; font-weight:600; color:var(--bento-text, var(--primary-text-color,#1e293b)); }
            input { outline:none; transition:border-color .2s; }
            input:focus { border-color:var(--bento-primary, var(--primary-color,#3b82f6)); }
        </style>
      <h3>Security Check</h3>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">Title</label>
              <input type="text" id="cf_title" value="${_esc(this._config?.title || 'Security Check')}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
            </div>
    `;
        const f_title = this.shadowRoot.querySelector('#cf_title');
        if (f_title) f_title.addEventListener('input', (e) => {
          this._config = { ...this._config, title: e.target.value };
          this._dispatch();
        });
  }
  connectedCallback() { this._render(); }
}
if (!customElements.get('ha-security-check-editor')) { customElements.define('ha-security-check-editor', HaSecurityCheckEditor); }

})();

window.customCards = window.customCards || [];
window.customCards.push({ type: 'ha-security-check', name: 'Security Check', description: 'Security audit tool for Home Assistant', preview: true });
