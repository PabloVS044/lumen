# Despliegue (motor en Fly.io, web en Vercel)

Owner: R1. Decisiones: ADR-13 a ADR-15 del doc técnico y sección 15.2. Un solo motor con un volumen de datos
(sin R2 ni Postgres para la demo).

```
Navegador ──► Vercel (Next.js + BFF /api/engine) ──HTTPS + x-lumen-secret──► Fly (motor, volumen /data)
```

| Pieza     | Dónde                                                             | Notas                                                           |
| --------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| Web + BFF | Vercel                                                            | `ENGINE_URL`, `ENGINE_SHARED_SECRET`, token de Cesium           |
| Motor     | Fly.io, 1 máquina `shared-cpu-2x` 2 GB (sin medir; ver "Memoria") | imagen `infra/fly/Dockerfile`, config `fly.engine.toml`         |
| Datos     | Volumen Fly `lumen_data` montado en `/data`                       | `/data/dem` (COGs + `index.json`), `/data/kernels` (SPICE)      |
| Caché     | En memoria del motor (`STORE=memory`)                             | Postgres solo si hace falta (`STORE=postgres` + `DATABASE_URL`) |

Costo orientativo (confirmar en https://fly.io/docs/about/pricing/): máquina compartida de 2 GB ≈ 13 USD/mes
mientras corre; volumen 0.15 USD/GB/mes; Fly pide tarjeta. Una máquina parada solo cobra el volumen.

## 0. Antes de nada (en local)

```bash
bash data/scripts/download_kernels.sh                       # kernels
services/engine/.venv/bin/python data/scripts/prepare_dem.py --global   # DEM (ver data/scripts/README.md)
# Recomendado antes de subir: capa global como COG (lectura en frío mucho más rápida)
services/engine/.venv/bin/python infra/fly/make_global_cog.py --help
```

## 1. Primer despliegue

```bash
flyctl auth login                                           # abre el navegador; pide tarjeta
flyctl apps create lumen-engine                             # si el nombre está ocupado, cámbialo aquí y en fly.engine.toml (app = "...")
flyctl volumes create lumen_data --size 3 --region iad -a lumen-engine
flyctl secrets set ENGINE_SHARED_SECRET="$(openssl rand -hex 32)" -a lumen-engine   # guarda el valor: lo necesita Vercel
flyctl deploy -c fly.engine.toml                            # desde la raíz del repo
bash infra/fly/seed-volume.sh lumen-engine                  # sube kernels + DEM al volumen y reinicia
```

Tras el `deploy` el motor arranca **degradado** (sin datos); tras sembrar el volumen debe pasar a OK.

```bash
curl -s https://lumen-engine.fly.dev/healthz                # vivo
# Con secreto activo, los RPC exigen la cabecera:
curl -s -H "x-lumen-secret: <secreto>" -H 'content-type: application/json' -d '{}' \
  https://lumen-engine.fly.dev/lumen.v1.HealthService/Check # status OK, 5 kernels, capas DEM
```

El calentamiento (`WARMUP=1`) calcula en segundo plano el horizonte de los sitios del catálogo; el primer
análisis de cada sitio sale entonces de caché de horizonte.

## 2. Web en Vercel

Variables de entorno del proyecto (Production y Preview):

| Variable                                                            | Valor                          |
| ------------------------------------------------------------------- | ------------------------------ |
| `ENGINE_URL`                                                        | `https://lumen-engine.fly.dev` |
| `ENGINE_SHARED_SECRET`                                              | el mismo secreto que en Fly    |
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` / `NEXT_PUBLIC_CESIUM_MOON_ASSET_ID` | los de `apps/web/.env`         |
| `NEXT_PUBLIC_ENGINE_MOCK`                                           | `0`                            |
| `RATE_LIMIT_PER_MIN`                                                | opcional (30 por defecto)      |

Directorio raíz del proyecto: `apps/web`. Restringe el token de Cesium al dominio en el panel de ion.

## 3. Operación

```bash
flyctl logs -a lumen-engine
flyctl status -a lumen-engine
flyctl scale memory 4096 -a lumen-engine        # si hay OOM (no se ha medido el consumo todavía)
flyctl machine stop <id> -a lumen-engine        # fuera de la demo: solo se cobra el volumen
```

Actualizar el DEM: regenerar en local y repetir `seed-volume.sh`. Actualizar código: `flyctl deploy -c fly.engine.toml`.

## Memoria y límites conocidos

- El consumo de memoria del motor con el DEM global y numba **no está medido**; 2 GB es una estimación.
- Con `STORE=memory` la caché se pierde al reiniciar (un análisis nuevo cuesta ~2.5 s con DEM polar).
- El rate limit del BFF es por instancia (memoria): en Vercel es un límite blando.
- Los scripts `seed-volume.sh` y `fly.engine.toml` se escribieron sin sesión de Fly: la primera ejecución real
  puede requerir ajustes (corrígelos aquí).
