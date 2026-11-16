# Roles, ownership y asignación

> Basado en la sección 16.1 del documento técnico, ampliado a 7 roles (el doc indica duplicar
> Frontend Charts cuando hay más integrantes). **No hay jerarquía:** todos los roles valen lo mismo.
> **Owner** = quien revisa y aprueba cambios en su carpeta. Cualquiera puede proponer cambios fuera de su
> área, pero vía PR con review del owner. Lo compartido es de todo el equipo (ver abajo).

## Asignación

> Asignación inicial. Cualquier cambio se hace aquí **y** en `.github/CODEOWNERS` en el mismo PR.

| Rol                        | Persona (GitHub)                          | Backup |
| -------------------------- | ----------------------------------------- | ------ |
| R1 · Backend/Infra         | @bcastillo-2022474                        | R3     |
| R2 · Geo/Datos             | @carlosaltan18                            | R1     |
| R3 · Efemérides/Ciencia    | @PabloVS044                               | R2     |
| R4 · Frontend 3D           | @asanabria-2021067                        | R5     |
| R5 · Frontend Charts/UX    | @JonathanTubac                            | R6     |
| R6 · Frontend Analysis     | @PabloVS044, por partes (issues `rol:R6`) | R5     |
| R7 · Producto/Diseño/Pitch | @24750Montenegro                          | R1     |

## Qué posee cada rol

### R1 · Backend/Infra

- **Carpetas:** `proto/lumen/v1/{health,sites,analysis,jobs,export}.proto`, `services/engine/lumen_engine/{main.py,rpc/,services/{health,sites,analysis,jobs,export,stubs}.py,analysis/,core/,jobs/,db/,catalog/}`, `apps/web/app/api/` (BFF), `infra/`, `services/engine/Dockerfile`.
- **Módulos:** pipeline `AnalysisService.Analyze` (9.1), caché (11), jobs (ADR-06), BFF, despliegue (15), M14 Exportación (backend).

### R2 · Geo/Datos

- **Carpetas:** `proto/lumen/v1/{terrain,horizon,search}.proto` (con R1), `lumen_engine/{dem,horizon,search}/`, `services/{terrain,horizon,search}.py`, `data/scripts/` (DEM), `data/notebooks/` (geo), `tests/unit/test_geometry.py`, tests de horizonte.
- **Módulos:** descarga y conversión de DEM a COG, índice de capas, máscara de horizonte (9.3), M12 buscador de mejor punto (9.10), M16 mapa regional, incertidumbre con clones (9.12).
- **Primer entregable (Fase 1):** notebook con horizonte de Connecting ridge o Malapert validado con DEM sintético (14.2).

### R3 · Efemérides/Ciencia

- **Carpetas:** `proto/lumen/v1/{ephemeris,power,whatif,validation}.proto` y `Metrics` en `analysis.proto` (con R1), `lumen_engine/{ephem,visibility,metrics,power}/`, `services/{ephemeris,power,whatif,validation}.py`, `tests/validation/`, `data/scripts/download_kernels.sh`, `docs/methodology.md`, `docs/validation.md`.
- **Módulos:** SPICE (9.4), fracción de disco y eclipses (9.5), métricas y eventos (9.6), score (9.7), simulador de batería (9.8), what-if (9.9), M15 validación contra Horizons (14.1).
- **Responsabilidad extra:** revisa toda afirmación científica en UI, catálogo y pitch (riesgo R11).

### R4 · Frontend 3D

- **Carpetas:** `apps/web/components/{globe,terrain,time-controls}/`, `apps/web/app/explore/`, `apps/web/scripts/copy-cesium-assets.mjs`.
- **Módulos:** M4 Globo Cesium (luz solar real, terminador, marcadores), M10 terreno local 3D, `<TimeControls />` (play, velocidad, ir a próximo evento), fallback three.js.
- **Primer entregable (Fase 0):** Cesium Moon renderizando en `/explore` con token de ion (riesgo R5/R6).

### R5 · Frontend Charts/UX

- **Carpetas:** `apps/web/components/{horizon,timeline,metrics,site-picker}/`, `apps/web/app/site/`, `apps/web/lib/coords.ts`, `apps/web/lib/format.ts`.
- **Módulos:** M1 selector de sitio, M2 polar + desplegado, M3 heatmap, M7 métricas y contadores.
- **Primer entregable:** `<HorizonPolar />` con `NEXT_PUBLIC_ENGINE_MOCK=1` (mocks del SDK).

### R6 · Frontend Analysis

> **Se toma por partes:** cada módulo es un issue con la etiqueta `rol:R6` (#38–#43). Su dueño es quien
> tenga el issue asignado. Si una parte no se termina, se reasigna el issue sin cambiar este archivo.
> Hoy: @PabloVS044 (R3) toma las partes en orden: M8 → M9 → M5/M6 → M12 → M13 → M14.

- **Carpetas:** `apps/web/components/{compare,power,whatif}/`, `apps/web/app/{compare,search}/`, UI de exportación.
- **Módulos:** M5/M6 comparador sitios/fechas, M8 simulador (UI), M9 what-if (UI), M12 UI de búsqueda, M13 escenarios compartibles, M14 exportación (UI).

### R7 · Producto/Diseño/Pitch

- **Carpetas:** `apps/web/app/{(marketing),learn,about,validation}/`, `apps/web/components/{layout,learn,ui}/`, `apps/web/app/globals.css` (tokens), `data/catalog/sites.yaml`, `docs/pitch/`, `docs/submission.md`.
- **Módulos:** identidad (18), sistema de diseño y tokens, M11 modo Explorar + tours, M17 i18n, catálogo curado (13, verificación de coordenadas), entrega en Space Apps (3), video y pitch.
- **Primer entregable (Fase 0):** leer Participant Guide 2026 y actualizar sección 3 del doc.

## Archivos compartidos (de todo el equipo)

No tienen un dueño único: en CODEOWNERS figuran todos. Reglas para cambiarlos:

- PR con label `contract` y aviso en el canal del equipo.
- **2 aprobaciones** de personas distintas al autor, y una de ellas de un rol afectado (quien produce o consume ese contrato).
- Nadie mergea su propio PR de contrato.

| Archivo                                                                  | Por qué es crítico         |
| ------------------------------------------------------------------------ | -------------------------- |
| `buf.yaml`, `buf.gen.yaml`, `packages/sdk/**` (salvo mocks de cada área) | Tooling y SDK del contrato |
| `.github/**`, configs raíz, `CLAUDE.md`, `docs/team/**`, `docs/adr/**`   | Reglas del equipo y CI     |

| `proto/**` | Contrato motor ↔ frontend (ADR-0012) |
| `packages/sdk/src/gen/**`, `services/engine/gen/**` | Generado del contrato (`pnpm proto:gen`); nunca a mano |
| `packages/sdk/src/mocks/**` | Único lugar con datos de ejemplo; cada área amplía su generador |
| `apps/web/lib/api/transport.ts`, `apps/web/app/providers.tsx` | Transporte único (real o mock) |
| `apps/web/stores/scenario-store.ts`, `apps/web/lib/url-state.ts` | Estado global sincronizado (6.2) |
| `apps/web/app/globals.css` | Tokens de marca (owner R7, aviso a todos) |
| `docs/LUMEN_documento_tecnico.md` | Fuente única de verdad |
