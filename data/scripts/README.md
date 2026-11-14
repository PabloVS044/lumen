# Scripts de datos

| Script                           | Owner | Qué hace                                         |
| -------------------------------- | ----- | ------------------------------------------------ |
| `download_kernels.sh`            | R3    | Kernels SPICE → `services/engine/kernels/`       |
| `prepare_dem.py`                 | R2    | Descarga Site01 5 m y polar 80 m, convierte Site01 a COG y genera `index.json` |
| `precompute_regional_map.py`     | R2    | Genera COG regional de % iluminación o visibilidad terrestre (M16 experimental) |
| `precompute_catalog_horizons.py` | R2    | Materializa máscaras del catálogo para warmup local; R1 podrá cargarlas en su caché |

Los datos pesados viven en `data/local/` (ignorado por git) en dev y en object storage en prod.

Desde la raíz, después de `uv sync --all-extras` en `services/engine`:

```bash
services/engine/.venv/bin/python data/scripts/prepare_dem.py
# Windows: services/engine/.venv/Scripts/python.exe data/scripts/prepare_dem.py
```

Se descargan productos [PGDA Site01](https://pgda.gsfc.nasa.gov/products/78) y
[PGDA polar 80S](https://pgda.gsfc.nasa.gov/products/90). El DEM Site01, los mapas LDEC y pendiente
son GeoTIFF de 5 m; el polar de 80 m ya es COG. El script comprueba el tamaño remoto, el CRS y la
resolución antes de generar el índice. No se suben rasters ni `index.json` al repositorio.

`--global` añade el [PDS LOLA LDEM_128.JP2](https://imbrium.mit.edu/DATA/LOLA_GDR/CYLINDRICAL/JP2/)
(647 MB, 128 píxeles/grado ≈ 237 m/píxel) como respaldo para el resto de la Luna. Se lee
directamente del JP2 por ventanas; su etiqueta PDS especifica 0.5 m por valor entero respecto a
la esfera de 1 737 400 m. El índice guarda esa escala para que los cálculos usen metros. Cerca
del polo sur se prefiere el DEM polar de 80 m. Con `--skip-download --global`, el JP2 debe estar
ya en `data/local/dem/`.

Para la banda experimental de incertidumbre, `--clones 20` descarga los primeros 20 clones de
Site01 (archivos grandes); `lumen_engine.horizon.uncertainty.clone_envelope` calcula p5, p50 y p95
del horizonte y, si se pasan efemérides, de las métricas. Las efemérides se comparten entre los
clones porque todos corresponden al mismo sitio.

Mapa experimental, por ejemplo: `python data/scripts/precompute_regional_map.py --radius-km 2
--spacing-m 500 --output data/local/dem/site01_illumination.tif`. Las celdas intermedias son una
aproximación al candidato evaluado más cercano; los valores no sirven para decidir un aterrizaje real.

Para precalcular el catálogo: `python data/scripts/precompute_catalog_horizons.py`. El script omite
sitios sin cobertura suficiente y guarda JSON en `data/local/horizons/`, con la advertencia de
precisión de coordenadas del catálogo. Para una prueba rápida usar `--site-id pgda-site01`.
