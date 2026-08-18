// Dev helper: call the `report` Edge Function the way the Explorer's signedFetch does (ADR-44),
// with throwaway identities, so the signature + confirmation path can be exercised without a scene.
//   deno run --node-modules-dir=none --allow-net --allow-env tools/dev/report-fn/signed-call.ts <url> [result] [roundKey] [opponent]
//   PAIR=1     two identities report the same round (win / loss) naming each other: the second call must confirm
//   TAMPER=1   change the timestamp after signing (must be rejected)      STALE=1  sign a ten-minute-old timestamp
//   APIKEY=... adds the publishable key header like the scene does
//   FEEDBACK="text"  posts a suggestion-box note instead of a result (url = .../functions/v1/feedback)
import { Authenticator } from "npm:@dcl/crypto@3";
import { createUnsafeIdentity } from "npm:@dcl/crypto@3/dist/crypto.js";

const [url, result = "win", roundKey = `1:1:${Date.now()}`, opponentArg = "0x00000000000000000000000000000000000000bb"] = Deno.args;

async function makeIdentity() {
  const owner = createUnsafeIdentity();
  const ephemeral = createUnsafeIdentity();
  const identity = await Authenticator.initializeAuthChain(owner.address, ephemeral, 60, async (msg: string) => Authenticator.createSignature(owner, msg));
  return { address: owner.address.toLowerCase(), identity };
}

async function send(who: Awaited<ReturnType<typeof makeIdentity>>, body: Record<string, unknown>) {
  const path = new URL(url).pathname;
  const timestamp = String(Date.now() - (Deno.env.get("STALE") ? 600_000 : 0));
  const metadata = JSON.stringify({ origin: "dev-helper" });
  const payload = `post:${path}:${timestamp}:${metadata}`.toLowerCase();
  const chain = Authenticator.signPayload(who.identity, payload);
  const headers: Record<string, string> = { "content-type": "application/json", "x-identity-timestamp": timestamp, "x-identity-metadata": metadata };
  chain.forEach((link, i) => (headers[`x-identity-auth-chain-${i}`] = JSON.stringify(link)));
  if (Deno.env.get("APIKEY")) headers["apikey"] = Deno.env.get("APIKEY")!;
  if (Deno.env.get("TAMPER")) headers["x-identity-timestamp"] = String(Number(timestamp) + 1);
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  console.log(who.address, res.status, await res.text());
}

const a = await makeIdentity();
if (Deno.env.get("FEEDBACK")) {
  await send(a, { name: "Dev Helper", text: Deno.env.get("FEEDBACK"), lang: "en", where: "dev" });
} else if (Deno.env.get("PAIR")) {
  const b = await makeIdentity();
  const key = `2:1:${Date.now()}`;
  await send(a, { name: "Dev A", game: "tictactoe", result: "win", round_key: key, opponents: [b.address] });
  await send(b, { name: "Dev B", game: "tictactoe", result: "loss", round_key: key, opponents: [a.address] });
  // a second, inconsistent claim by A on a new round without B's report changes nothing
  await send(a, { name: "Dev A", game: "tictactoe", result: "win", round_key: `2:2:${Date.now()}`, opponents: [b.address] });
} else {
  await send(a, { name: "Dev Helper", game: "tictactoe", result, round_key: roundKey, opponents: [opponentArg] });
}
