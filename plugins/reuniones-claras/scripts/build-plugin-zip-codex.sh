#!/usr/bin/env bash
# Variante EXPERIMENTAL del ZIP en formato Codex (.codex-plugin/plugin.json + .mcp.json).
# Se genera a partir del paquete portable (plugin/), que sigue siendo la fuente de verdad.
# Úsala solo si el portal de OpenAI no habilita "Connect" con el formato portable.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/plugin"
VERSION="$(python3 -c "import json; print(json.load(open('$SRC/plugin.json'))['version'])")"
OUT="$ROOT/dist/reuniones-claras-${VERSION}-codex.zip"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$WORK/.codex-plugin" "$ROOT/dist"
cp -R "$SRC/skills" "$SRC/assets" "$SRC/README.md" "$WORK/"

python3 - "$SRC" "$WORK" <<'PY'
import json, sys
src, work = sys.argv[1], sys.argv[2]
p = json.load(open(f"{src}/plugin.json"))
m = json.load(open(f"{src}/mcp.json"))
oai = p["extensions"]["com.openai"]

interface = dict(oai["interface"])
interface.setdefault("capabilities", [])

codex = {k: p[k] for k in ("name", "version", "description", "author") if k in p}
codex["skills"] = "./skills/"
codex["mcpServers"] = "./.mcp.json"
codex["interface"] = interface
codex["extensions"] = {"com.openai": {k: v for k, v in oai.items() if k != "interface"}}

servers = {}
for name, s in m["mcpServers"].items():
    servers[name] = {"url": s["url"]}
mcp = {"mcpServers": servers}

json.dump(codex, open(f"{work}/.codex-plugin/plugin.json", "w"), ensure_ascii=False, indent=2)
json.dump(mcp, open(f"{work}/.mcp.json", "w"), ensure_ascii=False, indent=2)

assert "$schema" not in codex
assert codex["mcpServers"] == "./.mcp.json" and len(servers) == 1
assert all(v["url"].startswith("https://") for v in servers.values())
assert "interface" not in codex["extensions"]["com.openai"]
PY

rm -f "$OUT"
(cd "$WORK" && zip -r -X -q "$OUT" . -x '*.DS_Store' '__MACOSX/*' '*/__MACOSX/*')
echo "Creado: ${OUT#"$ROOT/../../"}"
unzip -l "$OUT"
