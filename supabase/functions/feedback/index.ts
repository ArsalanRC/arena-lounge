// Arena Lounge: suggestions and bug reports from the box at the entrance (Supabase Edge Function).
// Signed with Decentraland's signedFetch, so every note carries the wallet that wrote it and one
// wallet cannot flood the table (five notes per day, see submit_feedback). Read them with
// tools/dev/supa-sql supabase/list-feedback.sql. Deploy with --no-verify-jwt.
import { createClient } from "npm:@supabase/supabase-js@2";
import { cors, json, verifySignedRequest } from "../_shared/dcl-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return cors();
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const who = await verifySignedRequest(req);
  if ("error" in who) return json({ error: who.error }, who.status);

  let body: { name?: unknown; text?: unknown; lang?: unknown; where?: unknown };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const text = String(body.text ?? "").replace(/\s+/g, " ").trim().slice(0, 600);
  if (text.length < 3) return json({ error: "empty" }, 400);
  const name = String(body.name ?? "").slice(0, 40);
  const lang = String(body.lang ?? "").slice(0, 8);
  const where = String(body.where ?? "").slice(0, 40);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc("submit_feedback", { p_address: who.address, p_name: name, p_text: text, p_lang: lang, p_where: where });
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true, id: data });
});
