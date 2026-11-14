#!/usr/bin/env bash
# Descarga los kernels SPICE de la sección 8.2 a services/engine/kernels. Owner: R3.
# ⚠️ VERIFICAR versiones vigentes (LSK y FK lunar) en NAIF antes de fijarlas.
set -euo pipefail

BASE="https://naif.jpl.nasa.gov/pub/naif/generic_kernels"
DEST="$(cd "$(dirname "$0")/../.." && pwd)/services/engine/kernels"
mkdir -p "$DEST"

KERNELS=(
  "lsk/naif0012.tls"
  "spk/planets/de440s.bsp"
  "pck/moon_pa_de440_200625.bpc"
  "fk/satellites/moon_de440_220930.tf"
  "pck/pck00011.tpc"
)

for k in "${KERNELS[@]}"; do
  f="$DEST/$(basename "$k")"
  if [[ -f "$f" ]]; then
    echo "ok    $(basename "$k")"
  else
    echo "fetch $k"
    curl -fsSL --retry 3 -o "$f" "$BASE/$k"
  fi
done
