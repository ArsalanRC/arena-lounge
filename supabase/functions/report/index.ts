// Arena Lounge: signed result reports (Supabase Edge Function, Deno).
//
// The scene calls this with Decentraland's signedFetch (ADR-44); _shared/dcl-auth.ts verifies the
// chain and the signer becomes the player address (the body may not name anyone else). The report
// goes to the database function `submit_report`, which counts a round only when a second participant
// of the same round has reported a consistent outcome.
//
// Deploy with --no-verify-jwt: the scene authenticates with the DCL signature, not with a
// Supabase JWT (the publishable key is not a JWT).
import { createClient } from "npm:@supabase/supabase-js@2";
import { cors, json, verifySignedRequest } from "../_shared/dcl-auth.ts";

const ADDRESS = /^0x[0-9a-f]{40}$/;
const ROUND_KEY = /^\d{1,4}:\d{1,9}:\d{10,16}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return cors();
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const who = await verifySignedRequest(req);
  if ("error" in who) return json({ error: who.error }, who.status);
  const signer = who.address;

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
