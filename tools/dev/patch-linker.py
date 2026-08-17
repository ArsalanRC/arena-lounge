#!/usr/bin/env python3
"""
Idempotent local patch for @dcl/sdk-commands 7.26.0's deploy linker (node_modules,
so it has to be re-applied after every install; `pnpm deploy:world` runs it first).

The linker proxies the browser's requests to decentraland.org/auth and spreads
`ctx.request.headers` (a node-fetch Headers) into the outgoing header record; the
spread leaks the object's Symbol(map) key and undici (Node 22+) rejects it:
"Proxy error: Key Symbol(map) in undefined.headers is a symbol, which cannot be
converted to a ByteString". Seen 17 Aug 2026 on Node 25 when Arsalan clicked
CONNECT WALLET. Copying the header entries into a plain object fixes it.
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
TARGET = ROOT / 'node_modules/@dcl/sdk-commands/dist/linker-dapp/routes.js'
OLD = """            const resp = await components.fetch.fetch(url, {
                method: ctx.request.method, // Ensure the correct method (GET in this case).
                headers: {
                    ...ctx.request.headers,
                    Host: domain,"""
NEW = """            // local patch (tools/dev/patch-linker.py): ctx.request.headers is a node-fetch Headers whose
            // spread leaks its Symbol(map) key, which undici rejects ("cannot be converted to a ByteString").
            const incomingHeaders = typeof ctx.request.headers?.entries === 'function' ? Object.fromEntries(ctx.request.headers.entries()) : { ...ctx.request.headers };
            const resp = await components.fetch.fetch(url, {
                method: ctx.request.method, // Ensure the correct method (GET in this case).
                headers: {
                    ...incomingHeaders,
                    Host: domain,"""

if not TARGET.exists():
    sys.exit(f'linker not found at {TARGET}; run pnpm install first')
src = TARGET.read_text()
if 'incomingHeaders' in src:
    print('linker already patched')
elif OLD in src:
    TARGET.write_text(src.replace(OLD, NEW, 1))
    print('linker patched')
else:
    sys.exit('linker source changed (new sdk-commands?), patch not applied; check whether it is still needed')
