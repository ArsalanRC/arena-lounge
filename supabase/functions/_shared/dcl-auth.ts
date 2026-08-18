// Shared by the Edge Functions: verify a Decentraland signedFetch request (ADR-44) and return the
// signer address (lower-case), or null. The Explorer signs `method:path:timestamp:metadata` (lower-cased)
// with the player's identity chain and sends it as x-identity-auth-chain-N / x-identity-timestamp /
// x-identity-metadata headers. Only EOA / ephemeral chains are accepted (no EIP-1271 contract wallets).
import { Authenticator } from "npm:@dcl/crypto@3";

const ADDRESS = /^0x[0-9a-f]{40}$/;
const MAX_SKEW_MS = 2 * 60 * 1000;
const noProvider = { send: () => Promise.reject(new Error("contract wallets not supported")) } as unknown as Parameters<typeof Authenticator.validateSignature>[2];

export type Verified = { address: string; metadata: string } | { error: string; status: number };

export async function verifySignedRequest(req: Request): Promise<Verified> {
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
  const chain: unknown[] = [];
  for (let i = 0; ; i++) {
    const h = headers[`x-identity-auth-chain-${i}`];
    if (!h) break;
    try { chain.push(JSON.parse(h)); } catch { return { error: "bad auth chain", status: 401 }; }
  }
  const timestamp = headers["x-identity-timestamp"];
  const metadata = headers["x-identity-metadata"] ?? "";
  if (chain.length === 0 || !timestamp) return { error: "unsigned", status: 401 };
  if (Math.abs(Date.now() - Number(timestamp)) > MAX_SKEW_MS) return { error: "stale", status: 401 };
  const pathname = new URL(req.url).pathname;
  const bare = pathname.replace(/^\/functions\/v1/, "");
  const candidates = new Set([pathname, bare, `/functions/v1${bare}`]);
  for (const p of candidates) {
    const payload = `${req.method}:${p}:${timestamp}:${metadata}`.toLowerCase();
    try {
      // deno-lint-ignore no-explicit-any
      const r = await Authenticator.validateSignature(payload, chain as any, noProvider, Date.now());
      if (r.ok) {
        // deno-lint-ignore no-explicit-any
        const address = Authenticator.ownerAddress(chain as any).toLowerCase();
        if (ADDRESS.test(address)) return { address, metadata };
      }
    } catch (_e) { /* try the next path form */ }
  }
  return { error: "signature", status: 401 };
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });

export const cors = () => new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" } });
