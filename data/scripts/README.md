# Scripts de datos

| Script                           | Owner | Qué hace                                         |
| -------------------------------- | ----- | ------------------------------------------------ |
| `download_kernels.sh`            | R3    | Kernels SPICE → `services/engine/kernels/`       |
| `dem_to_cog.sh` (por crear)      | R2    | GeoTIFF LOLA → COG con overviews (sección 8.1)   |
| `build_dem_index.py` (por crear) | R2    | `index.json` de capas, bbox, resolución, versión |

Los datos pesados viven en `data/local/` (ignorado por git) en dev y en object storage en prod.
