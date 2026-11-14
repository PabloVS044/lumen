#!/usr/bin/env bash
# Reinstala las skills del proyecto en .claude/skills desde sus repos de origen (docs/team/SKILLS.md).
# Uso: bash scripts/update-skills.sh   → revisar el diff antes de commitear.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/.claude/skills"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

clone() { git clone --depth 1 -q "https://github.com/$1.git" "$TMP/$2"; }

clone obra/superpowers superpowers
clone rand/cc-polymath cc-polymath
clone leonxlnx/taste-skill taste-skill
clone nextlevelbuilder/ui-ux-pro-max-skill ui-ux-pro-max-skill
clone pbakaus/impeccable impeccable

install() { # <src dir> <nombre> <archivo LICENSE>
  rm -rf "${DEST:?}/$2"
  cp -R "$1" "$DEST/$2"
  [[ -f "$3" ]] && cp "$3" "$DEST/$2/LICENSE.upstream"
  return 0
}

mkdir -p "$DEST"
for d in "$TMP"/superpowers/skills/*/; do
  install "$d" "$(basename "$d")" "$TMP/superpowers/LICENSE"
done
install "$TMP/cc-polymath/skills/anti-slop" anti-slop "$TMP/cc-polymath/LICENSE"
install "$TMP/taste-skill/skills/taste-skill" taste-skill "$TMP/taste-skill/LICENSE"
for d in "$TMP"/ui-ux-pro-max-skill/.claude/skills/*/; do
  install "$d" "$(basename "$d")" "$TMP/ui-ux-pro-max-skill/LICENSE"
done
install "$TMP/impeccable/.claude/skills/impeccable" impeccable "$TMP/impeccable/LICENSE"

{
  echo "# Generado por scripts/update-skills.sh — $(date -u +%Y-%m-%dT%H:%MZ)"
  for r in superpowers cc-polymath taste-skill ui-ux-pro-max-skill impeccable; do
    echo "$r $(git -C "$TMP/$r" rev-parse HEAD)"
  done
} > "$DEST/SOURCES.lock"

echo "Skills instaladas en $DEST"
