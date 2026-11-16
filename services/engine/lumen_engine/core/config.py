"""Configuración del motor (variables de entorno, ver .env.example en la raíz)."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ENGINE_ROOT = Path(__file__).resolve().parents[2]
# En el contenedor el motor vive en /app (sin abuelo): las rutas se fijan por variables de entorno.
REPO_ROOT = ENGINE_ROOT.parents[1] if len(ENGINE_ROOT.parents) > 1 else ENGINE_ROOT


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=REPO_ROOT / ".env", extra="ignore")

    database_url: str = "postgresql://lumen:lumen@localhost:5432/lumen"
    # "memory" (por proceso) o "postgres" (caché persistente, sección 11). Sin Redis: atajo.
    store: str = "memory"
    redis_url: str = "redis://localhost:6379/0"
    dem_base_url: str = str(REPO_ROOT / "data" / "local" / "dem")
    dem_index_url: str = str(REPO_ROOT / "data" / "local" / "dem" / "index.json")
    kernels_dir: Path = ENGINE_ROOT / "kernels"
    catalog_path: Path = REPO_ROOT / "data" / "catalog" / "sites.yaml"
    max_range_days: int = 730
    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
