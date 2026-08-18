// Arena Lounge: signed result reports (Supabase Edge Function, Deno).
//
// The scene calls this with Decentraland's signedFetch (ADR-44): the request carries an
// auth chain that proves which wallet (or guest identity) sent it. We verify the chain,
// take the signer as the player address (the body may not name anyone else), and hand
// the report to the database function `submit_report`, which counts a round only when
// a second participant of the same round has reported a consistent outcome.
//
// Deploy with --no-verify-jwt: the scene authenticates with the DCL signature, not with a
// Supabase JWT (the publishable key is not a JWT).
import { createClient } from "npm:@supabase/supabase-js@2";
import { Authenticator } from "npm:@dcl/crypto@3";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });

const ADDRESS = /^0x[0-9a-f]{40}$/;
const ROUND_KEY = /^\d{1,4}:\d{1,9}:\d{10,16}$/;
const MAX_SKEW_MS = 2 * 60 * 1000;

// Only EIP-1271 (contract wallet) signatures need a chain provider; we do not support those.
const noProvider = { send: () => Promise.reject(new Error("contract wallets not supported")) } as unknown as Parameters<typeof Authenticator.validateSignature>[2];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST, OPTIONS" } });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
  const chain: unknown[] = [];
  for (let i = 0; ; i++) {
    const h = headers[`x-identity-auth-chain-${i}`];
    if (!h) break;
    try { chain.push(JSON.parse(h)); } catch { return json({ error: "bad auth chain" }, 401); }
  }
  const timestamp = headers["x-identity-timestamp"];
  const metadata = headers["x-identity-metadata"] ?? "";
  if (chain.length === 0 || !timestamp) return json({ error: "unsigned" }, 401);
  if (Math.abs(Date.now() - Number(timestamp)) > MAX_SKEW_MS) return json({ error: "stale" }, 401);

  // ADR-44 payload: method:path:timestamp:metadata, lower-cased. The path the client signed is
  // the URL path it called; behind the functions gateway we may see it with or without /functions/v1.
  const pathname = new URL(req.url).pathname;
  const candidates = new Set([pathname, pathname.replace(/^\/functions\/v1/, ""), `/functions/v1${pathname.replace(/^\/functions\/v1/, "")}`]);
  let signer = "";
  for (const p of candidates) {
    const payload = `post:${p}:${timestamp}:${metadata}`.toLowerCase();
    try {
      // deno-lint-ignore no-explicit-any
      const r = await Authenticator.validateSignature(payload, chain as any, noProvider, Date.now());
      if (r.ok) { signer = Authenticator.ownerAddress(chain as any).toLowerCase(); break; }
    } catch (_e) { /* try the next path form */ }
  }
  if (!ADDRESS.test(signer)) return json({ error: "signature" }, 401);

  let body: { name?: unknown; game?: unknown; result?: unknown; round_key?: unknown; opponents?: unknown };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const result = String(body.result ?? "");
  const roundKey = String(body.round_key ?? "");
  const opponents = Array.isArray(body.opponents) ? body.opponents.map((a) => String(a).toLowerCase()).filter((a) => ADDRESS.test(a) && a !== signer).slice(0, 3) : [];
  if (!["win", "loss", "draw"].includes(result)) return json({ error: "bad result" }, 400);
  if (!ROUND_KEY.test(roundKey)) return json({ error: "bad round" }, 400);
  if (opponents.length === 0) return json({ error: "no opponents" }, 400);
  const name = String(body.name ?? "").slice(0, 40);
  const game = String(body.game ?? "").slice(0, 32);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc("submit_report", { p_address: signer, p_name: name, p_game: game, p_result: result, p_round_key: roundKey, p_opponents: opponents });
  if (error) return json({ error: error.message }, 400);
  return json(Array.isArray(data) ? data[0] ?? null : data);
});
