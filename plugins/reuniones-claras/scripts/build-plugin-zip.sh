#!/usr/bin/env bash
# Genera el ZIP del plugin para subirlo al portal de OpenAI.
# Los archivos van en la RAÍZ del ZIP (sin carpeta contenedora) y se excluyen
# __MACOSX y .DS_Store: OpenAI rechaza ZIPs con más de una raíz de plugin.
set -euo pipefail

cd "$(dirname "$0")/../plugin"
VERSION="$(python3 -c "import json; print(json.load(open('plugin.json'))['version'])")"
mkdir -p ../dist
OUT="../dist/reuniones-claras-${VERSION}.zip"

zip -r -X -FS "$OUT" . -x '*.DS_Store' '__MACOSX/*' '*/__MACOSX/*'

echo
echo "Creado: plugins/reuniones-claras/dist/reuniones-claras-${VERSION}.zip"
unzip -l "$OUT"
