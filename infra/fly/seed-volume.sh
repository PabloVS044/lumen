#!/usr/bin/env bash
# Siembra el volumen /data del motor en Fly con los kernels SPICE y el DEM ya descargados en local.
# Se ejecuta UNA vez (y cada vez que cambie el DEM). Owner: R1. Uso, desde la raíz del repo:
#   bash infra/fly/seed-volume.sh [APP] [DEM_DIR]
# APP por defecto: lumen-engine. DEM_DIR por defecto: data/local/dem_cog si existe, si no data/local/dem.
# Requiere flyctl con sesión iniciada y la máquina corriendo (flyctl deploy ya hecho).
set -euo pipefail

APP="${1:-lumen-engine}"
DEM_DIR="${2:-}"
FLY="${FLYCTL:-flyctl}"
command -v "$FLY" >/dev/null || FLY="$HOME/.fly/bin/flyctl"

if [ -z "$DEM_DIR" ]; then
  if [ -f data/local/dem_cog/index.json ]; then DEM_DIR=data/local/dem_cog; else DEM_DIR=data/local/dem; fi
fi
KERNELS_DIR=services/engine/kernels
[ -f "$DEM_DIR/index.json" ] || { echo "Falta $DEM_DIR/index.json (corre data/scripts/prepare_dem.py)"; exit 1; }
ls "$KERNELS_DIR"/*.bsp >/dev/null 2>&1 || { echo "Faltan kernels (bash data/scripts/download_kernels.sh)"; exit 1; }

# Archivos que el índice referencia (capa, LDEC, pendiente) + el propio índice
mapfile -t DEM_FILES < <(python3 - "$DEM_DIR" <<'PY'
import json, sys
d = sys.argv[1]
idx = json.load(open(f"{d}/index.json"))
names = {"index.json"}
for layer in idx["layers"]:
    for k in ("file", "ldec_file", "slope_file"):
        if layer.get(k):
            names.add(layer[k])
print("\n".join(sorted(names)))
PY
)

put() { # put <local> <remote>
  echo "-> $2"
  "$FLY" ssh sftp put "$1" "$2" -a "$APP"
}

"$FLY" ssh console -a "$APP" -C "mkdir -p /data/dem /data/kernels"
for f in "${DEM_FILES[@]}"; do put "$DEM_DIR/$f" "/data/dem/$f"; done
for f in "$KERNELS_DIR"/*.bsp "$KERNELS_DIR"/*.bpc "$KERNELS_DIR"/*.tls "$KERNELS_DIR"/*.tf "$KERNELS_DIR"/*.tpc; do
  [ -f "$f" ] && put "$f" "/data/kernels/$(basename "$f")"
done

echo "Reiniciando la máquina para recargar kernels e índice…"
"$FLY" apps restart "$APP"
echo "Listo. Comprueba:  curl -s https://$APP.fly.dev/healthz   y el Check de salud (docs/deploy.md)."
