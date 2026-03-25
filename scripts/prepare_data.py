"""
Monitor HCDN - Data Pipeline
Preprocesses raw HCDN data into optimized JSONs for the frontend.
Filters only 2025 data.
"""
import json
import os
from collections import Counter, defaultdict
from datetime import datetime

BASE_RAW = r"c:\Users\dante\Desktop\Laboratorio Colossus\Pipeline OpenArg\datos_hcdn"
BASE_OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

os.makedirs(BASE_OUT, exist_ok=True)

def load_json(rel_path):
    path = os.path.join(BASE_RAW, rel_path)
    with open(path, 'r', encoding='utf-8-sig') as f:
        return json.load(f)

def save_json(data, filename):
    path = os.path.join(BASE_OUT, filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    size_kb = os.path.getsize(path) / 1024
    print(f"  ✓ {filename}: {size_kb:.1f} KB")

def is_2025(fecha):
    if not fecha:
        return False
    return fecha.startswith("2025")

# ─── 1. Load raw data ───────────────────────────────────────────────
print("Loading raw data...")
proyectos_raw = load_json("proyectos-parlamentarios/proyectos_parlamentarios.json")
giros_raw = load_json("giro-a-comisiones/giro_comisiones.json")
movimientos_raw = load_json("movimientos-de-proyectos/movimientos_proyectos.json")
comisiones_raw = load_json("comisiones/comisiones.json")
bloques_comp = load_json("bloques-interbloques-e-integracion/composicion_actual_bloques3.4.json")
listado_bloques = load_json("bloques-interbloques-e-integracion/listado_actual_bloques3.4.json")
diputados_actual = load_json("legisladores/diputadosa.json")
dictamenes_raw = load_json("comisiones/dictamenesleyes2.1.json")
leyes_sancionadas = load_json("leyes-sancionadas/leyes_sancionadas.json")

print(f"  Raw: {len(proyectos_raw)} proyectos, {len(giros_raw)} giros, {len(movimientos_raw)} movimientos")

# ─── 2. Filter 2025 projects ────────────────────────────────────────
print("\nFiltering 2025 projects...")
proyectos_2025 = [p for p in proyectos_raw if is_2025(p.get("publicacion_fecha"))]
proyecto_ids_2025 = {p["proyecto_id"] for p in proyectos_2025}
print(f"  Projects 2025: {len(proyectos_2025)}")

# ─── 3. Build giros index (proyecto_id -> comisiones) ───────────────
print("\nBuilding giros index...")
giros_por_proyecto = defaultdict(list)
for g in giros_raw:
    pid = g.get("proyecto_id")
    if pid in proyecto_ids_2025:
        giros_por_proyecto[pid].append({
            "comision": g.get("comision"),
            "orden": g.get("orden")
        })

# ─── 4. Build movimientos index ─────────────────────────────────────
print("Building movimientos index...")
movimientos_por_proyecto = defaultdict(list)
for m in movimientos_raw:
    pid = m.get("proyecto_id")
    if pid in proyecto_ids_2025 and m.get("movimiento"):
        movimientos_por_proyecto[pid].append({
            "fecha": m.get("fecha"),
            "movimiento": m.get("movimiento"),
            "orden": m.get("orden")
        })

# Sort movimientos by orden
for pid in movimientos_por_proyecto:
    movimientos_por_proyecto[pid].sort(key=lambda x: x.get("orden") or 0)

# ─── 5. Generate proyectos_index.json ───────────────────────────────
print("\nGenerating output files...")

# Determine primary comision for each project
def get_primary_comision(pid):
    giros = giros_por_proyecto.get(pid, [])
    if giros:
        sorted_giros = sorted(giros, key=lambda g: g.get("orden") or 999)
        return sorted_giros[0].get("comision", "")
    return ""

# Determine the last known state
def get_estado(pid):
    movs = movimientos_por_proyecto.get(pid, [])
    if movs:
        return movs[-1].get("movimiento", "EN TRÁMITE")
    return "EN TRÁMITE"

# Map author to bloque
autor_a_bloque = {}
for b in bloques_comp:
    full_name = f"{b['apellido']}, {b['nombres']}".upper()
    autor_a_bloque[full_name] = b.get("bloque", "")
    # Also just last name for fuzzy match
    autor_a_bloque[b['apellido'].upper()] = b.get("bloque", "")

def get_bloque_autor(autor_str):
    if not autor_str:
        return ""
    autor_upper = autor_str.upper().strip()
    if autor_upper in autor_a_bloque:
        return autor_a_bloque[autor_upper]
    # Try last name only
    last_name = autor_upper.split(",")[0].strip()
    return autor_a_bloque.get(last_name, "")

proyectos_index = []
for p in proyectos_2025:
    pid = p["proyecto_id"]
    proyectos_index.append({
        "id": pid,
        "t": p.get("titulo", ""),
        "tipo": p.get("tipo", ""),
        "autor": p.get("autor", ""),
        "fecha": p.get("publicacion_fecha", "")[:10] if p.get("publicacion_fecha") else "",
        "exp": p.get("exp_diputados", ""),
        "com": get_primary_comision(pid),
        "bloque": get_bloque_autor(p.get("autor", "")),
        "estado": get_estado(pid),
        "cam": p.get("camara_origen", "")
    })

# Sort by date desc
proyectos_index.sort(key=lambda x: x["fecha"], reverse=True)
save_json(proyectos_index, "proyectos_index.json")

# ─── 6. Generate proyecto details (movimientos + giros per project) ─
proyecto_detalles = {}
for pid in proyecto_ids_2025:
    proyecto_detalles[pid] = {
        "giros": giros_por_proyecto.get(pid, []),
        "movimientos": movimientos_por_proyecto.get(pid, [])
    }
save_json(proyecto_detalles, "proyectos_detalle.json")

# ─── 7. Comisiones with stats ───────────────────────────────────────
# Count projects per comision (from giros 2025)
comision_count = Counter()
comision_tipos = defaultdict(Counter)
for p in proyectos_index:
    if p["com"]:
        comision_count[p["com"]] += 1
        comision_tipos[p["com"]][p["tipo"]] += 1

comisiones_out = []
for c in comisiones_raw:
    nombre = c.get("nombre", "")
    comisiones_out.append({
        "id": c.get("id", ""),
        "nombre": nombre,
        "tipo": c.get("tipo_de_comision", ""),
        "proyectos": comision_count.get(nombre, 0),
        "tipos": dict(comision_tipos.get(nombre, {}))
    })

# Also add comisiones that appear in giros but not in comisiones_raw
known_names = {c["nombre"] for c in comisiones_out}
for com_name, count in comision_count.items():
    if com_name not in known_names:
        comisiones_out.append({
            "id": "",
            "nombre": com_name,
            "tipo": "",
            "proyectos": count,
            "tipos": dict(comision_tipos.get(com_name, {}))
        })

comisiones_out.sort(key=lambda x: x["proyectos"], reverse=True)
save_json(comisiones_out, "comisiones.json")

# ─── 8. Giros grouped by comision ───────────────────────────────────
giros_por_comision = defaultdict(list)
for p in proyectos_index:
    pid = p["id"]
    for g in giros_por_proyecto.get(pid, []):
        com = g.get("comision", "")
        if com:
            giros_por_comision[com].append(pid)
save_json(dict(giros_por_comision), "giros_por_comision.json")

# ─── 9. Bloques with stats ──────────────────────────────────────────
bloque_stats = Counter()
bloque_tipos = defaultdict(Counter)
for p in proyectos_index:
    if p["bloque"]:
        bloque_stats[p["bloque"]] += 1
        bloque_tipos[p["bloque"]][p["tipo"]] += 1

bloques_out = []
for b in listado_bloques:
    nombre = b.get("bloque", "")
    bloques_out.append({
        "nombre": nombre,
        "presidente_nombre": b.get("diputado_nombre", ""),
        "presidente_apellido": b.get("diputado_apellido", ""),
        "cargo": b.get("cargo", ""),
        "cantidad": b.get("cantidad", 0),
        "proyectos": bloque_stats.get(nombre, 0),
        "tipos": dict(bloque_tipos.get(nombre, {}))
    })

bloques_out.sort(key=lambda x: x["cantidad"], reverse=True)
save_json(bloques_out, "bloques.json")

# Composicion de bloques (diputados por bloque)
bloques_composicion = defaultdict(list)
for b in bloques_comp:
    bloques_composicion[b.get("bloque", "")].append({
        "apellido": b.get("apellido", ""),
        "nombres": b.get("nombres", ""),
        "distrito": b.get("distrito", "")
    })
save_json(dict(bloques_composicion), "bloques_composicion.json")

# ─── 10. Diputados actuales ─────────────────────────────────────────
save_json(diputados_actual, "diputados.json")

# ─── 11. Stats / KPIs ───────────────────────────────────────────────
# Projects by type
tipos_count = Counter(p["tipo"] for p in proyectos_index)

# Projects by month
meses_count = Counter()
for p in proyectos_index:
    if p["fecha"]:
        mes = p["fecha"][:7]  # YYYY-MM
        meses_count[mes] += 1

# Top authors
autores_count = Counter(p["autor"] for p in proyectos_index if p["autor"])
top_autores = autores_count.most_common(20)

# Top comisiones
top_comisiones = comision_count.most_common(15)

stats = {
    "total_proyectos": len(proyectos_index),
    "total_por_tipo": dict(tipos_count),
    "por_mes": dict(sorted(meses_count.items())),
    "top_autores": [{"autor": a, "count": c} for a, c in top_autores],
    "top_comisiones": [{"comision": c, "count": n} for c, n in top_comisiones],
    "total_comisiones_activas": len([c for c in comisiones_out if c["proyectos"] > 0]),
    "total_bloques": len(listado_bloques),
    "total_diputados": len(diputados_actual),
    "fecha_min": min((p["fecha"] for p in proyectos_index if p["fecha"]), default=""),
    "fecha_max": max((p["fecha"] for p in proyectos_index if p["fecha"]), default=""),
    "bloques_productividad": [{"bloque": b["nombre"], "proyectos": b["proyectos"], "diputados": b["cantidad"]} for b in bloques_out[:10]]
}
save_json(stats, "stats.json")

# ─── Summary ─────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"Pipeline completed!")
print(f"  Proyectos 2025: {len(proyectos_index)}")
print(f"  Tipos: {dict(tipos_count)}")
print(f"  Comisiones con proyectos: {stats['total_comisiones_activas']}")
print(f"  Bloques: {len(listado_bloques)}")
print(f"  Date range: {stats['fecha_min']} to {stats['fecha_max']}")
print(f"  Output dir: {BASE_OUT}")
