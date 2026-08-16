#!/bin/bash
# usage: shot.sh <outfile.jpg> [maxWidth]
OUT=$1; W=${2:-1400}
DIR=${DEV_TMP:-/tmp/arena-dev}; mkdir -p "$DIR"
$(dirname "$0")/mcp.sh tools/call "{\"name\":\"screenshot\",\"arguments\":{\"maxWidth\":$W,\"quality\":\"jpg\"}}" > "$DIR/_shot.json"
python3 - "$OUT" "$DIR/_shot.json" <<'PY'
import json,base64,sys
d=json.load(open(sys.argv[2]))
for c in d['result']['content']:
    if c.get('type')=='image':
        open(sys.argv[1],'wb').write(base64.b64decode(c['data'])); print('saved', sys.argv[1])
    else:
        print(c.get('text','')[:200])
PY
