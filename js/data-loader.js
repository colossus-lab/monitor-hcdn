/* ── Data Loader Module ──────────────────────────────────────────── */
const DataLoader = {
  cache: {},
  
  async load(filename) {
    if (this.cache[filename]) return this.cache[filename];
    try {
      const resp = await fetch(`data/${filename}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      this.cache[filename] = data;
      return data;
    } catch(e) {
      console.error(`Error loading ${filename}:`, e);
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
