"""
Monitor HCDN - Data Pipeline
Preprocesses raw HCDN data into optimized JSONs for the frontend.
Generates data per period (2025, 2026) and a periods.json index.
"""
import json
import os
import shutil
from collections import Counter, defaultdict

BASE_RAW = r"c:\Users\dante\Desktop\Laboratorio Colossus\Pipeline OpenArg\datos_hcdn"
BASE_OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

os.makedirs(BASE_OUT, exist_ok=True)

# Define target periods
PERIODS = [
    {"year": "2025", "periodo": "143", "label": "Período 143 — 2025"},
    {"year": "2026", "periodo": "144", "label": "Período 144 — 2026"}
]

def load_json(rel_path):
    path = os.path.join(BASE_RAW, rel_path)
    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8-sig') as f:
        return json.load(f)

def save_json(data, year_folder, filename):
    folder = os.path.join(BASE_OUT, year_folder) if year_folder else BASE_OUT
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    size_kb = os.path.getsize(path) / 1024
    print(f"  ✓ {year_folder}/{filename} if {year_folder} else {filename}: {size_kb:.1f} KB")

# Helper to get field case-insensitively since v2.0 uses UPPERCASE
def get_field(item, field):
    if field in item: return item[field]
    if field.upper() in item: return item[field.upper()]
    return ""

def is_year(fecha, target_year):
    if not fecha: return False
    return fecha.startswith(target_year)

# ─── 1. Load raw data ───────────────────────────────────────────────
print("Loading raw data...")
# Try v2.0 files first, fallback to v1
proyectos_raw = load_json(r"proyectos-parlamentarios\proyectos_parlamentarios2.0.json") or load_json(r"proyectos-parlamentarios\proyectos_parlamentarios.json")
giros_raw = load_json(r"giro-a-comisiones\giro_comisiones.json")
movimientos_raw = load_json(r"movimientos-de-proyectos\movimientos_proyectos2.5.json") or load_json(r"movimientos-de-proyectos\movimientos_proyectos.json")
comisiones_raw = load_json(r"comisiones\comisiones2.6.json") or load_json(r"comisiones\comisiones.json")
bloques_comp = load_json(r"bloques-interbloques-e-integracion\composicion_actual_bloques3.4.json")
listado_bloques = load_json(r"bloques-interbloques-e-integracion\listado_actual_bloques3.4.json")
diputados_actual = load_json(r"legisladores\diputadosa.json")
leyes_sancionadas = load_json(r"leyes-sancionadas\leyes_sancionadas2.7.json") or load_json(r"leyes-sancionadas\leyes_sancionadas.json")

print(f"  Raw: {len(proyectos_raw)} proyectos, {len(giros_raw)} giros, {len(movimientos_raw)} movimientos")

# Map author to bloque
autor_a_bloque = {}
for b in bloques_comp:
    apellido = get_field(b, "apellido")
    nombres = get_field(b, "nombres")
    bloque_nombre = get_field(b, "bloque")
    full_name = f"{apellido}, {nombres}".upper()
    autor_a_bloque[full_name] = bloque_nombre
    autor_a_bloque[apellido.upper()] = bloque_nombre

def get_bloque_autor(autor_str):
    if not autor_str: return ""
    autor_upper = autor_str.upper().strip()
    if autor_upper in autor_a_bloque: return autor_a_bloque[autor_upper]
    last_name = autor_upper.split(",")[0].strip()
    return autor_a_bloque.get(last_name, "")

periods_meta = []

for period in PERIODS:
    year = period["year"]
    print(f"\n{'='*40}\nProcessing Year {year}...\n{'='*40}")

    # ─── 2. Filter projects for year ───────────────────────────────────────
    proyectos_year = [p for p in proyectos_raw if is_year(get_field(p, "publicacion_fecha"), year)]
    proyecto_ids_year = {get_field(p, "proyecto_id") for p in proyectos_year}
    print(f"  Projects {year}: {len(proyectos_year)}")

    # ─── 3. Build giros index ──────────────────────────────────────────────
    giros_por_proyecto = defaultdict(list)
    for g in giros_raw:
        pid = get_field(g, "proyecto_id")
        if pid in proyecto_ids_year:
            giros_por_proyecto[pid].append({
                "comision": get_field(g, "comision"),
                "orden": get_field(g, "orden")
            })

    # ─── 4. Build movimientos index ────────────────────────────────────────
    movimientos_por_proyecto = defaultdict(list)
    for m in movimientos_raw:
        pid = get_field(m, "proyecto_id")
        mov = get_field(m, "movimiento")
        if pid in proyecto_ids_year and mov:
            movimientos_por_proyecto[pid].append({
                "fecha": get_field(m, "fecha"),
                "movimiento": mov,
                "orden": get_field(m, "orden")
            })

    for pid in movimientos_por_proyecto:
        movimientos_por_proyecto[pid].sort(key=lambda x: x.get("orden") or 0)

    # ─── 5. Generate proyectos_index.json ──────────────────────────────────
    def get_primary_comision(pid):
        giros = giros_por_proyecto.get(pid, [])
        if giros:
            sorted_giros = sorted(giros, key=lambda g: g.get("orden") or 999)
            return sorted_giros[0].get("comision", "")
        return ""

    def get_estado(pid):
        movs = movimientos_por_proyecto.get(pid, [])
        if movs:
            return movs[-1].get("movimiento", "EN TRÁMITE")
        return "EN TRÁMITE"

    proyectos_index = []
    for p in proyectos_year:
        pid = get_field(p, "proyecto_id")
        fecha = get_field(p, "publicacion_fecha")
        proyectos_index.append({
            "id": pid,
            "t": get_field(p, "titulo"),
            "tipo": get_field(p, "tipo"),
            "autor": get_field(p, "autor"),
            "fecha": fecha[:10] if fecha else "",
            "exp": get_field(p, "exp_diputados"),
            "com": get_primary_comision(pid),
            "bloque": get_bloque_autor(get_field(p, "autor")),
            "estado": get_estado(pid),
            "cam": get_field(p, "camara_origen")
        })

    proyectos_index.sort(key=lambda x: x["fecha"], reverse=True)
    save_json(proyectos_index, year, "proyectos_index.json")

    # ─── 6. Generate proyecto details ──────────────────────────────────────
    proyecto_detalles = {}
    for pid in proyecto_ids_year:
        proyecto_detalles[pid] = {
            "giros": giros_por_proyecto.get(pid, []),
            "movimientos": movimientos_por_proyecto.get(pid, [])
        }
    save_json(proyecto_detalles, year, "proyectos_detalle.json")

    # ─── 7. Comisiones ─────────────────────────────────────────────────────
    comision_count = Counter()
    comision_tipos = defaultdict(Counter)
    for p in proyectos_index:
        if p["com"]:
            comision_count[p["com"]] += 1
            comision_tipos[p["com"]][p["tipo"]] += 1

    comisiones_out = []
    for c in comisiones_raw:
        nombre = get_field(c, "nombre")
        comisiones_out.append({
            "id": get_field(c, "id"),
            "nombre": nombre,
            "tipo": get_field(c, "tipo_de_comision"),
            "proyectos": comision_count.get(nombre, 0),
            "tipos": dict(comision_tipos.get(nombre, {}))
        })

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
    save_json(comisiones_out, year, "comisiones.json")

    # ─── 8. Giros ──────────────────────────────────────────────────────────
    giros_por_comision = defaultdict(list)
    for p in proyectos_index:
        pid = p["id"]
        for g in giros_por_proyecto.get(pid, []):
            com = g.get("comision", "")
            if com: giros_por_comision[com].append(pid)
    save_json(dict(giros_por_comision), year, "giros_por_comision.json")

    # ─── 9. Bloques ────────────────────────────────────────────────────────
    bloque_stats = Counter()
    bloque_tipos = defaultdict(Counter)
    for p in proyectos_index:
        if p["bloque"]:
            bloque_stats[p["bloque"]] += 1
            bloque_tipos[p["bloque"]][p["tipo"]] += 1

    bloques_out = []
    for b in listado_bloques:
        nombre = get_field(b, "bloque")
        bloques_out.append({
            "nombre": nombre,
            "presidente_nombre": get_field(b, "diputado_nombre"),
            "presidente_apellido": get_field(b, "diputado_apellido"),
            "cargo": get_field(b, "cargo"),
            "cantidad": get_field(b, "cantidad") or 0,
            "proyectos": bloque_stats.get(nombre, 0),
            "tipos": dict(bloque_tipos.get(nombre, {}))
        })

    bloques_out.sort(key=lambda x: int(x["cantidad"]) if str(x["cantidad"]).isdigit() else 0, reverse=True)
    save_json(bloques_out, year, "bloques.json")

    bloques_composicion = defaultdict(list)
    for b in bloques_comp:
        bloques_composicion[get_field(b, "bloque")].append({
            "apellido": get_field(b, "apellido"),
            "nombres": get_field(b, "nombres"),
            "distrito": get_field(b, "distrito")
        })
    save_json(dict(bloques_composicion), year, "bloques_composicion.json")

    # ─── 10. Diputados ─────────────────────────────────────────────────────
    save_json(diputados_actual, year, "diputados.json")

    # ─── 11. Stats ─────────────────────────────────────────────────────────
    tipos_count = Counter(p["tipo"] for p in proyectos_index)
    meses_count = Counter()
    for p in proyectos_index:
        if p["fecha"]:
            mes = p["fecha"][:7]
            meses_count[mes] += 1

    autores_count = Counter(p["autor"] for p in proyectos_index if p["autor"])
    top_autores = [{"autor": a, "count": c} for a, c in autores_count.most_common(20)]
    top_comisiones = [{"comision": c, "count": n} for c, n in comision_count.most_common(15)]

    stats = {
        "total_proyectos": len(proyectos_index),
        "total_por_tipo": dict(tipos_count),
        "por_mes": dict(sorted(meses_count.items())),
        "top_autores": top_autores,
        "top_comisiones": top_comisiones,
        "total_comisiones_activas": len([c for c in comisiones_out if c.get("tipo") == "P" or c.get("proyectos", 0) > 0]),
        "total_comisiones_permanentes": len([c for c in comisiones_out if c.get("tipo") == "P"]),
        "total_comisiones_especiales": len([c for c in comisiones_out if c.get("tipo") == "E"]),
        "total_bloques": len(listado_bloques),
        "total_diputados": len(diputados_actual),
        "fecha_min": min((p["fecha"] for p in proyectos_index if p["fecha"]), default=""),
        "fecha_max": max((p["fecha"] for p in proyectos_index if p["fecha"]), default=""),
        "bloques_productividad": [{"bloque": b["nombre"], "proyectos": b["proyectos"], "diputados": b["cantidad"]} for b in bloques_out[:10]]
    }
    save_json(stats, year, "stats.json")

    # Save to global periods meta
    periods_meta.append({
        "year": year,
        "periodo": period["periodo"],
        "label": period["label"],
        "proyectos": len(proyectos_index)
    })

# Write the common periods.json at the root of /data
save_json(periods_meta, "", "periods.json")

print("\nPipeline fully completed!")
