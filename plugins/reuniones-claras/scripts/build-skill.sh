#!/usr/bin/env bash
# Genera dist/reuniones-claras.skill para subirlo a Claude (Settings → Capabilities → Skills).
# Es la misma Skill que viaja en el ZIP del plugin de OpenAI: un único SKILL.md como fuente.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILL_DIR="$ROOT/plugin/skills/reuniones-claras"
OUT="$ROOT/dist/reuniones-claras.skill"

[ -f "$SKILL_DIR/SKILL.md" ] || { echo "No existe $SKILL_DIR/SKILL.md" >&2; exit 1; }
head -n 1 "$SKILL_DIR/SKILL.md" | grep -qx -- '---' || { echo "SKILL.md sin encabezado YAML" >&2; exit 1; }
grep -q '^name: reuniones-claras$' "$SKILL_DIR/SKILL.md" || { echo "SKILL.md: name distinto de reuniones-claras" >&2; exit 1; }
grep -q '^description: ' "$SKILL_DIR/SKILL.md" || { echo "SKILL.md sin description" >&2; exit 1; }

mkdir -p "$ROOT/dist"
rm -f "$OUT"
(cd "$ROOT/plugin/skills" && zip -r -X -q "$OUT" reuniones-claras -x '*.DS_Store' '__MACOSX/*' '*/__MACOSX/*')

echo "Creado: plugins/reuniones-claras/dist/reuniones-claras.skill"
unzip -l "$OUT"
