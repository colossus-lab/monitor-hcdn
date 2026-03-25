# Monitor HCDN 🏛️

**Monitor HCDN** es una plataforma interactiva de visualización de datos diseñada para monitorear y analizar la actividad legislativa de la Honorable Cámara de Diputados de la Nación Argentina (HCDN). Permite consultar fácilmente estadísticas de productividad, labor de comisiones, desempeño de bloques políticos y autorías de proyectos, navegando dinámicamente a través de múltiples períodos legislativos (ej. 2025, 2026).

---

## 🌟 Características Principales

- **Dashboard KPI en Tiempo Real**: Visualización rápida del total de proyectos, comisiones activas, bloques y diputados en función.
- **Soporte Multi-Período**: Cambia instantáneamente entre años legislativos desde la barra de navegación (ej. Período 143 - 2025 vs. Período 144 - 2026).
- **Manejo de Estados Vacíos (Empty States)**: Interfaz inteligente que explica y se adapta cuando un período legislativo recién comienza y aún no hay proyectos asignados.
- **Motor de Búsqueda de Proyectos**: Explora expedientes filtrando por comisiones, autores o bloques.
- **Pipeline de Datos Automático**: Script en Python que procesa los archivos JSON/CSV crudos del Portal de Datos Abiertos de la HCDN y genera los archivos livianos y estructurados que consume la aplicación web.

---

## 🛠️ Requisitos Previos

1. **Python 3.8+** (Para ejecutar el script de procesamiento de datos).
2. **Node.js / Servidor Web Básico** (Para servir los archivos estáticos HTML/JS/CSS).
3. **Datos Abiertos de la HCDN** (Los archivos `JSON` crudos almacenados en la carpeta `Pipeline OpenArg/datos_hcdn`).

---

## 🚀 Guía de Usuario: Cómo levantar el entorno local

### 1. Servir la Aplicación
Dado que el Monitor HCDN funciona con **Vanilla JavaScript y HTML/CSS estático**, no necesitas instalar dependencias complicadas por `npm` para levantar el front. Sin embargo, para que el navegador cargue los archivos JSON correctamente sin restricciones de CORS, **debes correr un servidor web local**.

Abrí tu terminal en la carpeta principal del proyecto (`Monitor HCDN`) y ejecutá:
```bash
python -m http.server 8080
```
Luego, abrí tu navegador y navegá a: `http://localhost:8080`

---

## 🔄 Guía de Mantenimiento: Cómo actualizar los datos

El Monitor HCDN se alimenta de *Datos Abiertos*. A medida que avanza el año parlamentario, querrás actualizar la información para reflejar los nuevos proyectos, leyes sancionadas o cambios en comisiones.

### Paso 1: Obtener los Datos Crudos
Asegúrate de haber descargado la versión más reciente de los datasets desde el **Portal de Datos Abiertos de la HCDN** (ej. mediante un pipeline automatizado) y guardarlos en el directorio configurado como origen, típicamente `C:\Users\...\Pipeline OpenArg\datos_hcdn`.

### Paso 2: Ejecutar el Pipeline de Carga 
Abrí tu terminal en el directorio raíz del proyecto y corré el script de preparación:
```bash
python scripts/prepare_data.py
```

**¿Qué hace este script?**
1. Busca los JSON crudos más pesados (como `proyectos_parlamentarios2.0.json`, `giro_comisiones.json`, etc.).
2. Cruza expedientes, comisiones y bloques.
3. Clasifica toda la información **separándola por año** (ej. metiendo todo en carpetas limpias como `/data/2025/`, `/data/2026/`).
4. Genera índices optimizados (`stats.json`, `proyectos_index.json`, `comisiones.json`) para que la web cargue los gráficos en cuestión de milisegundos.

Si terminal dice `Pipeline fully completed!`, tus tablas y gráficos en la web se habrán actualizado solos. Actualiza la página con F5 para ver los cambios.

---

## 📁 Arquitectura del Proyecto

```text
Monitor HCDN/
├── index.html            # Dashboard Principal
├── proyectos.html        # Buscador y filtro de legislaciones
├── comisiones.html       # Analytics de Comisiones Permanentes/Especiales
├── bloques.html          # Analytics y productividad de Bloques y Diputados
├── css/
│   └── styles.css        # Sistema de diseño, tokens y utilidades
├── js/
│   ├── app.js            # Lógica global, UI, navegación y setup de Charts
│   └── data-loader.js    # Motor de peticiones AJAX y gestión del estado Multi-Período
├── scripts/
│   └── prepare_data.py   # El corazón del backend / ETL local (Python)
└── data/                 # Los JSON listos, generados automáticamente
    ├── periods.json      # Catálogo central de períodos activos
    ├── 2025/             # DB del Año Parlamentario 2025
    └── 2026/             # DB del Año Parlamentario 2026
```

---

## 💡 Uso Avanzado: Explorando la Interfaz

- **Selector de Período**: Ubicado en el encabezado (Header) interactivo. Al hacer click y elegir un período distinto, todo el Monitor "viaja en el tiempo" sin recargar la página gracias a la persistencia por `localStorage`. Todos los expedientes en pantalla se resetean hacia ese año seleccionado.
- **Comisiones Permanentes**: Aunque un año recién empiece y hayan *cero proyectos girados*, el monitor te listará siempre las famosas "46 Comisiones Permanentes" de manera que puedas seguir revisiendo autoridades, mostrando un mensaje informando que aún no hay actividad visible.
- **Gráficos Dinámicos**: Puedes aislar categorías apagando leyendas (ej. ocultar 'Declaración' y 'Resolución' clickeando esos botones en la leyenda superior del gráfico apilado, dejando solo las vistas de tipo 'Ley').

---

## 🤝 Soporte y Contribución

Si querés seguir mejorándolo, las vistas HTML y los estilos (Vanilla CSS puro con variables `:root`) se editan transparentemente. Toda la lógica dura de datos reside íntegramente en `scripts/prepare_data.py`. Modificar cómo la aplicación consume las tablas simplemente se basa en mapear una nueva ruta y cargar un nuevo JSON pre-generado.

*¡Desarrollado en el Laboratorio Colossus!*
