#!/bin/bash
# Minimal MCP-over-HTTP client for the Decentraland explorer.
# usage: mcp.sh <method> '<params-json>'
URL=http://127.0.0.1:8123/unity-explorer-mcp
SID_FILE=${DEV_TMP:-/tmp/arena-dev}/mcp.sid; mkdir -p "$(dirname "$SID_FILE")"
if [ ! -s "$SID_FILE" ]; then
  curl -s -D - -o /dev/null -X POST $URL -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"claude-code","version":"1.0"}}}' \
    | grep -i "Mcp-Session-Id" | awk '{print $2}' | tr -d '\r' > "$SID_FILE"
  curl -s -o /dev/null -X POST $URL -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -H "Mcp-Session-Id: $(cat $SID_FILE)" \
    -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'
fi
SID=$(cat "$SID_FILE")
METHOD=$1; PARAMS=${2:-{\}}
curl -s -X POST $URL -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -H "Mcp-Session-Id: $SID" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"$METHOD\",\"params\":$PARAMS}"
