/* ── Data Loader Module ──────────────────────────────────────────── */
const DataLoader = {
  cache: {},
  activePeriod: null,
  periods: [],

  async init() {
    try {
      const resp = await fetch('data/periods.json');
      if (resp.ok) {
        this.periods = await resp.json();
      }
    } catch (e) {
      console.error('Error loading periods.json:', e);
    }
    
    // Determine active period
    const saved = localStorage.getItem('hcdn_active_period');
    if (saved && this.periods.find(p => p.year === saved)) {
      this.activePeriod = saved;
    } else if (this.periods.length > 0) {
      // Default to most recent (highest year)
      const sorted = [...this.periods].sort((a, b) => b.year.localeCompare(a.year));
      this.activePeriod = sorted[0].year;
    } else {
      this.activePeriod = '2025'; // Fallback
    }
  },

  getActivePeriod() {
    return this.activePeriod;
  },

  setActivePeriod(year) {
    if (this.activePeriod !== year) {
      this.activePeriod = year;
      localStorage.setItem('hcdn_active_period', year);
      this.cache = {}; // Clear cache on period change
      return true;
    }
    return false;
  },
  
  async load(filename) {
    if (this.cache[filename]) return this.cache[filename];
    
    // Wait for init if not done
    if (!this.activePeriod) await this.init();

    try {
      const resp = await fetch(`data/${this.activePeriod}/${filename}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      this.cache[filename] = data;
      return data;
    } catch(e) {
      console.error(`Error loading ${filename} for period ${this.activePeriod}:`, e);
      return null;
    }
  },

  async loadStats()       { return this.load('stats.json'); },
  async loadProyectos()   { return this.load('proyectos_index.json'); },
  async loadDetalles()    { return this.load('proyectos_detalle.json'); },
  async loadComisiones()  { return this.load('comisiones.json'); },
  async loadBloques()     { return this.load('bloques.json'); },
  async loadBloquesComp() { return this.load('bloques_composicion.json'); },
  async loadDiputados()   { return this.load('diputados.json'); },
  async loadGiros()       { return this.load('giros_por_comision.json'); },
};
