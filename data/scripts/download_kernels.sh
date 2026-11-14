#!/usr/bin/env bash
# Descarga los kernels SPICE de la sección 8.2 a services/engine/kernels y verifica su SHA-256.
# Owner: R3. Versiones verificadas en NAIF el 2026-11-14:
#   - LSK naif0012.tls sigue siendo la vigente.
#   - FK lunar vigente: moon_de440_250416.tf (reemplaza a moon_de440_220930.tf, ya no publicado).
#     Define MOON_ME -> MOON_ME_DE440_ME421 y MOON_PA -> MOON_PA_DE440.
# Para actualizar un kernel: cambiar nombre + hash aquí en el mismo PR (CI cachea por el hash de este archivo).
set -euo pipefail

BASE="https://naif.jpl.nasa.gov/pub/naif/generic_kernels"
DEST="${KERNELS_DIR:-$(cd "$(dirname "$0")/../.." && pwd)/services/engine/kernels}"
mkdir -p "$DEST"

# ruta-en-NAIF  sha256
KERNELS=(
  "lsk/naif0012.tls 678e32bdb5a744117a467cd9601cd6b373f0e9bc9bbde1371d5eee39600a039b"
  "spk/planets/de440s.bsp c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2"
  "pck/moon_pa_de440_200625.bpc 60cd55aa401ea2ea97360636f567554bfe4e37bb829f901b4460a455dfaf783f"
  "fk/satellites/moon_de440_250416.tf a47c71e9c9f33796bdafb2c9d69a7ee447b6016ecad80f71cd6f3e479f9cf768"
  "pck/pck00011.tpc 3dff7b1dbeceaa01f25467767d3fa25816051c85d162d1edf04acb310ee28bb1"
)

for entry in "${KERNELS[@]}"; do
  read -r path sha <<<"$entry"
  f="$DEST/$(basename "$path")"
  if [[ ! -f "$f" ]]; then
    echo "fetch $path"
    curl -fsSL --retry 3 -o "$f.part" "$BASE/$path"
    mv "$f.part" "$f"
  fi
  if ! echo "$sha  $f" | sha256sum --check --status; then
    echo "error: SHA-256 no coincide para $(basename "$path")" >&2
    exit 1
  fi
  echo "ok    $(basename "$path")"
done
