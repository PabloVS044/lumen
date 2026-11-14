# Imagen con GDAL para rasterio. Owner: Backend/Infra (ver docs/team/ROLES.md)
FROM ghcr.io/osgeo/gdal:ubuntu-small-3.10.0

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv

WORKDIR /app
COPY pyproject.toml uv.lock* .python-version ./
RUN uv sync --all-extras --no-dev --no-install-project

COPY gen ./gen
COPY lumen_engine ./lumen_engine
RUN uv sync --all-extras --no-dev

EXPOSE 8000
CMD ["uv", "run", "--no-sync", "uvicorn", "lumen_engine.main:app", "--host", "0.0.0.0", "--port", "8000"]
