/* ── Shared Utilities ────────────────────────────────────────────── */
const App = {
  // Badge class for project type
  badgeClass(tipo) {
    const map = {
      'LEY': 'badge-ley',
      'RESOLUCION': 'badge-resolucion',
      'RESOLUCIÓN': 'badge-resolucion',
      'DECLARACION': 'badge-declaracion',
      'DECLARACIÓN': 'badge-declaracion',
      'MENSAJE': 'badge-mensaje',
      'MENSAJE Y PROYECTO DE LEY': 'badge-mensaje',
    };
    return map[tipo] || 'badge-ley';
  },

  // Format date
  formatDate(dateStr) {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  },

  // Number with dots
  formatNum(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },

  // Truncate text
  truncate(text, maxLen = 120) {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '…' : text;
  },

  // Title case
  titleCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/(?:^|\s|[-/])\S/g, c => c.toUpperCase());
  },

  // Navigate to project detail
  goToProject(id) {
    window.location.href = `proyecto-detalle.html?id=${id}`;
  },

  // Navigate to comision
  goToComision(name) {
    window.location.href = `comisiones.html?com=${encodeURIComponent(name)}`;
  },

  // Navigate to bloque
  goToBloque(name) {
    window.location.href = `bloques.html?bloque=${encodeURIComponent(name)}`;
  },

  // Get URL param
  getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  },

  // Global Init
  async initGlobals() {
    await DataLoader.init();
    const nav = document.getElementById('nav-container');
    const ftr = document.getElementById('footer-container');
    if (nav) nav.innerHTML = this.navHTML();
    if (ftr) ftr.innerHTML = this.footerHTML();
    this.initNav();
  },

  // Replace any [data-icon="name"] placeholder with the matching inline SVG
  hydrateIcons(root = document) {
    root.querySelectorAll('[data-icon]').forEach(el => {
      if (el.dataset.iconDone) return;
      const svg = this.SVG[el.getAttribute('data-icon')];
      if (svg) { el.insertAdjacentHTML('afterbegin', svg); el.dataset.iconDone = '1'; }
    });
  },

  // Nav - highlight active link
  initNav() {
    let page = window.location.pathname.split('/').pop();
    if (!page || page === 'index.html') page = 'dashboard.html'; // Default nav active state if somehow included
    
    document.querySelectorAll('.nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      if (href === page) {
        a.classList.add('active');
      }
    });

    // Theme toggle
    const themeBtn = document.querySelector('.theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Mobile drawer toggle (with Esc + outside click + aria state)
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    if (toggle && links) {
      const setOpen = (open) => {
        links.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      };
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(!links.classList.contains('open'));
      });
      // Close on link click
      links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && links.classList.contains('open')) setOpen(false);
      });
      // Close on outside click
      document.addEventListener('click', (e) => {
        if (links.classList.contains('open') && !links.contains(e.target) && !toggle.contains(e.target)) {
          setOpen(false);
        }
      });
    }

    // Period selector logic
    const periodSelect = document.getElementById('period-selector');
    if (periodSelect && DataLoader.periods) {
      DataLoader.periods.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.year;
        opt.textContent = p.year; // e.g. "2026"
        if (p.year === DataLoader.getActivePeriod()) opt.selected = true;
        periodSelect.appendChild(opt);
      });
      
      periodSelect.addEventListener('change', (e) => {
        if (DataLoader.setActivePeriod(e.target.value)) {
          window.location.reload();
        }
      });
    }

    // Global Search logic
    const globalSearch = document.getElementById('global-search-input');
    if (globalSearch) {
      globalSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          const val = e.target.value.trim();
          if (val) {
            window.location.href = `proyectos.html?q=${encodeURIComponent(val)}`;
          }
        }
      });
    }

    // Update alert badge count
    this.updateAlertBadge();

    // Hydrate any [data-icon] placeholders on the page
    this.hydrateIcons();
  },

  // Alerts system (localStorage)
  getAlerts() {
    try {
      return JSON.parse(localStorage.getItem('hcdn_alerts') || '[]');
    } catch { return []; }
  },

  saveAlerts(alerts) {
    localStorage.setItem('hcdn_alerts', JSON.stringify(alerts));
  },

  getLastSeen() {
    return localStorage.getItem('hcdn_last_seen') || '2025-01-01';
  },

  setLastSeen(date) {
    localStorage.setItem('hcdn_last_seen', date);
  },

  updateAlertBadge() {
    const badge = document.querySelector('.nav-alert-badge');
    if (!badge) return;
    const alerts = this.getAlerts();
    if (alerts.length === 0) { badge.style.display = 'none'; return; }
    // We'll count matching projects async
    DataLoader.loadProyectos().then(proyectos => {
      if (!proyectos) return;
      const lastSeen = this.getLastSeen();
      const count = this.countAlertMatches(proyectos, alerts, lastSeen);
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'inline';
      } else {
        badge.style.display = 'none';
      }
    });
  },

  countAlertMatches(proyectos, alerts, afterDate) {
    let count = 0;
    for (const p of proyectos) {
      if (p.fecha <= afterDate) continue;
      for (const a of alerts) {
        if (this.projectMatchesAlert(p, a)) { count++; break; }
      }
    }
    return count;
  },

  projectMatchesAlert(p, alert) {
    if (alert.keyword) {
      const kw = alert.keyword.toLowerCase();
      if (!p.t.toLowerCase().includes(kw) && 
          !p.autor.toLowerCase().includes(kw) &&
          !p.exp.toLowerCase().includes(kw)) return false;
    }
    if (alert.tipo && p.tipo !== alert.tipo) return false;
    if (alert.comision && p.com !== alert.comision) return false;
    if (alert.bloque && p.bloque !== alert.bloque) return false;
    return true;
  },

  // Inline SVG icon set (decorative unless given aria-label)
  SVG: {
    landmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>',
    sun: '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
    moon: '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    alertOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="11" y1="8" x2="11" y2="12"/><line x1="11" y1="15" x2="11.01" y2="15"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    seed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 20h10"/><path d="M12 20c0-6 0-9 5-12-5 0-9 1-9 7"/><path d="M12 20c0-4-1-7-5-8 1 4 2 6 5 8"/></svg>',
    pie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>',
    trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
    bars: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
  },

  // Small inline icon helper: App.icon('user') → '<span class="i-ico">…svg…</span>'
  icon(name, cls = 'i-ico') {
    const svg = this.SVG[name];
    return svg ? `<span class="${cls}" aria-hidden="true">${svg}</span>` : '';
  },

  // ── Theme (dark default + light toggle) ──────────────────────────
  getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('hcdn_theme', theme); } catch {}
    const tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute('content', theme === 'light' ? '#F5F5F7' : '#06090F');
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.setAttribute('aria-label', theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro');
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  },

  toggleTheme() {
    this.setTheme(this.getTheme() === 'light' ? 'dark' : 'light');
  },

  // Render nav HTML
  navHTML(alertBadge = true) {
    const theme = this.getTheme();
    return `
    <div class="top-bar">
      <div class="top-bar-inner">
        <span>Honorable Cámara de Diputados de la Nación Argentina</span>
        <div>
          <a href="https://www.hcdn.gob.ar" target="_blank" rel="noopener">Institucional</a>
          <a href="https://datos.hcdn.gob.ar" target="_blank" rel="noopener">Datos Abiertos</a>
          <a href="https://www.hcdn.gob.ar/secparl/dtaqam/index.html" target="_blank" rel="noopener">Transparencia</a>
        </div>
      </div>
    </div>
    <nav class="nav" aria-label="Navegación principal">
      <div class="nav-inner">
        <a href="index.html" class="nav-brand" title="Volver a la selección de Período">
          <div class="icon" role="img" aria-label="Monitor HCDN">${this.SVG.landmark}</div>
          <div class="brand-text">
            Monitor HCDN
            <span class="brand-sub">Cambiar Período →</span>
          </div>
        </a>
        <button class="nav-toggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">☰</button>
        <ul class="nav-links" id="nav-links">
          <li><a href="dashboard.html">Dashboard</a></li>
          <li><a href="proyectos.html">Proyectos</a></li>
          <li><a href="comisiones.html">Comisiones</a></li>
          <li><a href="bloques.html">Bloques</a></li>
          <li><a href="alertas.html">Alertas${alertBadge ? '<span class="nav-alert-badge" style="display:none">0</span>' : ''}</a></li>

          <li class="nav-selector" style="display:flex;align-items:center;gap:12px;margin-left:12px;">
             <div class="global-search-container">
               <label for="global-search-input" class="visually-hidden">Buscar proyecto o autor</label>
               <input type="text" id="global-search-input" class="global-search-input" placeholder="Buscar proyecto, autor..." aria-label="Buscador global">
             </div>

             <div style="display:flex;align-items:center;gap:6px">
               <label for="period-selector" style="font-size:12px;opacity:0.75;font-weight:600">PERÍODO:</label>
               <select id="period-selector" class="period-select" aria-label="Seleccionar período legislativo"></select>
             </div>

             <button class="theme-toggle" type="button"
                     aria-label="${theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}">
               ${this.SVG.sun}${this.SVG.moon}
             </button>
          </li>
        </ul>
      </div>
    </nav>`;
  },

  footerHTML() {
    const active = DataLoader.periods?.find(p => p.year === DataLoader.getActivePeriod());
    const label = active ? active.label : 'Período 143 · Año 2025';
    return `
    <footer class="footer">
      <p style="font-size:14px;font-weight:600;margin-bottom:6px;display:flex;align-items:center;justify-content:center;gap:8px"><span style="display:inline-flex;width:18px;height:18px;color:var(--celeste)">${this.SVG.landmark}</span> Monitor HCDN · Congreso de la Nación Argentina</p>
      <p>Datos abiertos de <a href="https://datos.hcdn.gob.ar" target="_blank" rel="noopener">datos.hcdn.gob.ar</a> · ${label}</p>
      <p style="margin-top:4px;opacity:0.6">Laboratorio Colossus</p>
    </footer>`;
  },

  // ── Reusable empty / error state ────────────────────────────────
  emptyState(target, { icon = 'search', title = '', message = '', isError = false, actionLabel = '', actionHref = '', actionOnclick = '' } = {}) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    const iconSvg = this.SVG[icon] || this.SVG.search;
    let action = '';
    if (actionLabel) {
      if (actionHref) action = `<a class="btn-primary empty-action" href="${actionHref}">${actionLabel}</a>`;
      else action = `<button class="btn-primary empty-action" type="button" onclick="${actionOnclick}">${actionLabel}</button>`;
    }
    el.innerHTML = `
      <div class="empty-state${isError ? ' is-error' : ''}">
        <div class="empty-icon">${iconSvg}</div>
        ${title ? `<div class="empty-title">${title}</div>` : ''}
        ${message ? `<p>${message}</p>` : ''}
        ${action}
      </div>`;
  },

  // ── Chart.js theming ────────────────────────────────────────────
  BLOC_COLORS: [
    '#74ACDF','#F6B40E','#A78BFA','#34D399','#60A5FA',
    '#FB923C','#F472B6','#22D3EE','#FBBF24','#818CF8',
    '#2DD4BF','#FCA5A5','#93C5F8','#C4B5FD','#FDE047',
    '#5EEAD4','#FDBA74','#86EFAC','#F0ABFC','#7DD3FC'
  ],

  chartTheme() {
    const cs = getComputedStyle(document.documentElement);
    const v = (n, fb) => (cs.getPropertyValue(n).trim() || fb);
    const light = this.getTheme() === 'light';
    return {
      celeste: v('--celeste', '#74ACDF'),
      celesteMuted: v('--celeste-muted', '#5A8FBD'),
      sol: v('--sol', '#F6B40E'),
      text: v('--text-secondary', '#8892A8'),
      grid: light ? 'rgba(74,138,191,0.14)' : 'rgba(116,172,223,0.10)',
      axis: v('--chart-axis', '#6B7280'),
      tooltipBg: light ? '#FFFFFF' : '#1A1F35',
      tooltipText: light ? '#1A1D26' : '#F0F4FC',
      tooltipBorder: 'rgba(116,172,223,0.25)',
      font: "'JetBrains Mono', monospace",
      typeColors: ['#74ACDF', '#A78BFA', '#34D399', '#F6B40E'],
    };
  },

  applyChartDefaults() {
    if (typeof Chart === 'undefined') return;
    const t = this.chartTheme();
    Chart.defaults.color = t.text;
    Chart.defaults.font.family = t.font;
    Chart.defaults.font.size = 11;
    Chart.defaults.borderColor = t.grid;
    Chart.defaults.plugins.tooltip.backgroundColor = t.tooltipBg;
    Chart.defaults.plugins.tooltip.titleColor = t.tooltipText;
    Chart.defaults.plugins.tooltip.bodyColor = t.tooltipText;
    Chart.defaults.plugins.tooltip.borderColor = t.tooltipBorder;
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
  },

  // Pages register a render fn; we re-run it (and refresh defaults) on theme change
  onThemeRenderCharts(renderFn) {
    this._chartRenderer = renderFn;
    window.addEventListener('themechange', () => {
      this.applyChartDefaults();
      if (typeof this._chartRenderer === 'function') this._chartRenderer();
    });
  }
};
