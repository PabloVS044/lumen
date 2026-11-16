# Imagen del motor para Fly.io. Contexto = raíz del repo (`flyctl deploy -c fly.engine.toml`). Owner: R1.
# Solo código y catálogo: los kernels SPICE y el DEM viven en el volumen /data (se siembran una vez con
# infra/fly/seed-volume.sh), así el build nunca depende de los servidores de NASA.
FROM ghcr.io/osgeo/gdal:ubuntu-small-3.10.0

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv

WORKDIR /app
COPY services/engine/pyproject.toml services/engine/uv.lock* services/engine/.python-version services/engine/README.md ./
RUN uv sync --all-extras --no-dev --no-install-project

COPY services/engine/gen ./gen
COPY services/engine/lumen_engine ./lumen_engine
COPY data/catalog/sites.yaml ./catalog/sites.yaml
RUN uv sync --all-extras --no-dev

# Rutas en producción (el volumen se monta en /data)
ENV CATALOG_PATH=/app/catalog/sites.yaml \
    KERNELS_DIR=/data/kernels \
    DEM_BASE_URL=/data/dem \
    DEM_INDEX_URL=/data/dem/index.json \
    STORE=memory

# Proxy público por IPv4 y `.internal` por IPv6: lumen_engine.serve abre un socket para cada familia
EXPOSE 8000
CMD ["uv", "run", "--no-sync", "python", "-m", "lumen_engine.serve"]
