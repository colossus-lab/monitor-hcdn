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

  // Nav - highlight active link
  initNav() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(a => {
      const href = a.getAttribute('href');
      if (href === page || (page === '' && href === 'index.html')) {
        a.classList.add('active');
      }
    });

    // Mobile toggle
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => links.classList.toggle('open'));
    }

    // Update alert badge count
    this.updateAlertBadge();
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

  // Render nav HTML
  navHTML(alertBadge = true) {
    return `
    <div class="top-bar">
      <div class="top-bar-inner">
        <span>Honorable Cámara de Diputados de la Nación Argentina</span>
        <div>
          <a href="https://www.hcdn.gob.ar" target="_blank">Institucional</a>
          <a href="https://datos.hcdn.gob.ar" target="_blank">Datos Abiertos</a>
          <a href="https://www.hcdn.gob.ar/secparl/dtaqam/index.html" target="_blank">Transparencia</a>
        </div>
      </div>
    </div>
    <nav class="nav">
      <div class="nav-inner">
        <a href="index.html" class="nav-brand">
          <div class="icon">🏛️</div>
          <div class="brand-text">
            Monitor HCDN
            <span class="brand-sub">Diputados Argentina</span>
          </div>
        </a>
        <button class="nav-toggle" aria-label="Menu">☰</button>
        <ul class="nav-links">
          <li><a href="index.html">Dashboard</a></li>
          <li><a href="proyectos.html">Proyectos</a></li>
          <li><a href="comisiones.html">Comisiones</a></li>
          <li><a href="bloques.html">Bloques</a></li>
          <li><a href="alertas.html">Alertas${alertBadge ? '<span class="nav-alert-badge" style="display:none">0</span>' : ''}</a></li>
        </ul>
      </div>
    </nav>`;
  },

  footerHTML() {
    return `
    <footer class="footer">
      <p style="font-size:14px;font-weight:600;margin-bottom:6px">🏛️ Monitor HCDN · Congreso de la Nación Argentina</p>
      <p>Datos abiertos de <a href="https://datos.hcdn.gob.ar" target="_blank">datos.hcdn.gob.ar</a> · Período 143 · Año 2025</p>
      <p style="margin-top:4px;opacity:0.5">Laboratorio Colossus</p>
    </footer>`;
  }
};
