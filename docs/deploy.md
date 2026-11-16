# Despliegue (motor y web en Fly.io)

Owner: R1. Decisiones: ADR-13 a ADR-15 del doc técnico y sección 15.2. Un solo motor con un volumen de datos
(sin R2 ni Postgres para la demo).

```
Navegador ──HTTPS──► Fly `lumen-web` (Next.js + BFF /api/engine) ──red privada (6PN) + x-lumen-secret──► Fly `lumen-engine` (volumen /data)
```

| Pieza     | Dónde                                                                     | Notas                                                           |
| --------- | ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Web + BFF | Fly.io, app `lumen-web`, `shared-cpu-1x` 1 GB                             | imagen `infra/fly/Dockerfile.web`, config `fly.web.toml`        |
| Motor     | Fly.io, 1 máquina `shared-cpu-2x` 4 GB (con 2 GB hubo OOM; ver "Memoria") | imagen `infra/fly/Dockerfile`, config `fly.engine.toml`         |
| Datos     | Volumen Fly `lumen_data` montado en `/data`                               | `/data/dem` (COGs + `index.json`), `/data/kernels` (SPICE)      |
| Caché     | En memoria del motor (`STORE=memory`)                                     | Postgres solo si hace falta (`STORE=postgres` + `DATABASE_URL`) |

Costo orientativo (confirmar en https://fly.io/docs/about/pricing/): máquina compartida de 4 GB ≈ 25 USD/mes (2 GB ≈ 13)
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
flyctl secrets set ENGINE_SHARED_SECRET="$(openssl rand -hex 32)" -a lumen-engine   # guarda el valor: lo necesita la web
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

## 2. Web en Fly (`lumen-web`)

La web habla con el motor por la red privada de Fly: `ENGINE_URL = http://lumen-engine.internal:8000` (ya en
`fly.web.toml`, sin TLS: el tráfico no sale de la red privada de la organización). Solo la web necesita ser pública.

```bash
flyctl apps create lumen-web                                 # si el nombre está ocupado, cámbialo aquí y en fly.web.toml
flyctl secrets set ENGINE_SHARED_SECRET="<el mismo del motor>" -a lumen-web   # defensa en profundidad
# Los NEXT_PUBLIC_* se incrustan en build: se pasan como --build-arg (valores de apps/web/.env; el token no se versiona)
flyctl deploy -c fly.web.toml \
  --build-arg NEXT_PUBLIC_CESIUM_ION_TOKEN="$(grep ^NEXT_PUBLIC_CESIUM_ION_TOKEN= apps/web/.env | cut -d= -f2-)" \
  --build-arg NEXT_PUBLIC_CESIUM_MOON_ASSET_ID="$(grep ^NEXT_PUBLIC_CESIUM_MOON_ASSET_ID= apps/web/.env | cut -d= -f2-)"
```

| Variable                                                            | Dónde / valor                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `ENGINE_URL`                                                        | runtime, `[env]` de `fly.web.toml` (`http://lumen-engine.internal:8000`) |
| `ENGINE_SHARED_SECRET`                                              | runtime, `flyctl secrets` (el mismo que en el motor)                     |
| `RATE_LIMIT_PER_MIN`                                                | runtime, opcional (30 por defecto)                                       |
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` / `NEXT_PUBLIC_CESIUM_MOON_ASSET_ID` | **build** (`--build-arg`), los de `apps/web/.env`                        |
| `NEXT_PUBLIC_ENGINE_MOCK`                                           | **build**, `0` (ya en `[build.args]`)                                    |

`ENGINE_URL`, `ENGINE_SHARED_SECRET` y `RATE_LIMIT_PER_MIN` se leen en cada arranque, no se incrustan en la
imagen. Cambiar un `NEXT_PUBLIC_*` exige redesplegar. Restringe el token de Cesium al dominio (`lumen-web.fly.dev`)
en el panel de ion. La imagen usa `output: "standalone"` (ver `apps/web/next.config.ts`) y corre como usuario no root.

Probar la imagen en local (contra un motor en `localhost:8000`):

```bash
docker build -f infra/fly/Dockerfile.web -t lumen-web:test --build-arg NEXT_PUBLIC_ENGINE_MOCK=0 .
docker run --rm --network host -e PORT=3300 -e ENGINE_URL=http://localhost:8000 lumen-web:test
```

### Motor sin exposición pública (opcional)

El motor conserva por ahora su servicio HTTP público (`[http_service]` en `fly.engine.toml`) y sigue protegido por
`x-lumen-secret`; la web usa solo la dirección `.internal`. Una vez confirmado que la web funciona contra
`.internal`, se pueden quitar las IPs públicas del motor para que solo sea alcanzable por la red privada:

```bash
flyctl ips list -a lumen-engine                 # revisar antes de tocar nada
flyctl ips release <ip> -a lumen-engine         # por cada IP pública, solo tras confirmar
```

Sin IPs públicas, `https://lumen-engine.fly.dev` deja de responder (los `curl` de la sección 1 pasan a
`flyctl proxy 8000 -a lumen-engine`). La web no se ve afectada: el tráfico `.internal` no usa IPs públicas.
⚠️ VERIFICAR en la primera ejecución real que el servicio interno responde con el puerto 8000.

## 3. Operación

```bash
flyctl logs -a lumen-engine
flyctl logs -a lumen-web
flyctl status -a lumen-engine
flyctl scale memory 4096 -a lumen-engine        # si hay OOM (no se ha medido el consumo todavía)
flyctl machine stop <id> -a lumen-engine        # fuera de la demo: solo se cobra el volumen
```

Actualizar el DEM: regenerar en local y repetir `seed-volume.sh`. Actualizar código: `flyctl deploy -c fly.engine.toml`.

## Despliegue automático (GitHub Actions)

`.github/workflows/deploy.yml` despliega cuando el CI (`engine` o `web`) termina bien **en un push a `main`**, y
solo la app cuyo código cambió en ese merge (el motor se reinicia y recalienta al desplegar, así que no se toca
en merges que solo cambian la web). También se puede lanzar a mano: _Actions → deploy → Run workflow_.

Secretos del repositorio que debe crear un **admin** (_Settings → Secrets and variables → Actions_):

| Secreto                                                             | Cómo obtenerlo                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------- |
| `FLY_API_TOKEN_ENGINE`                                              | `flyctl tokens create deploy -a lumen-engine -x 2160h`  |
| `FLY_API_TOKEN_WEB`                                                 | `flyctl tokens create deploy -a lumen-web -x 2160h`     |
| `NEXT_PUBLIC_CESIUM_ION_TOKEN` / `NEXT_PUBLIC_CESIUM_MOON_ASSET_ID` | los de `apps/web/.env` (el token es público por diseño) |

Los tokens de despliegue solo pueden desplegar esa app (no leen secretos ni tocan otras apps) y caducan: renovarlos
antes (aquí 90 días). El `ENGINE_SHARED_SECRET` ya vive en Fly, no en GitHub. El volumen de datos no se redespliega:
actualizar DEM o kernels sigue siendo manual con `seed-volume.sh`.

## Memoria y límites conocidos

- Con 2 GB el motor murió por OOM (`oom_killed=true`) al arrancar y analizar con el DEM global: por eso son 4 GB.
- Con `STORE=memory` la caché se pierde al reiniciar (un análisis nuevo cuesta ~2.5 s con DEM polar).
- El rate limit del BFF es por instancia (memoria): en Fly con varias máquinas es un límite blando.
- Los scripts `seed-volume.sh`, `fly.engine.toml` y `fly.web.toml` se escribieron sin sesión de Fly: la primera ejecución real
  puede requerir ajustes (corrígelos aquí).
