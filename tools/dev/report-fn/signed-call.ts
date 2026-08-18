// Dev helper: call the `report` Edge Function the way the Explorer's signedFetch does (ADR-44),
// with a throwaway identity, so the signature path can be exercised without a scene.
//   deno run --allow-net --allow-env tools/dev/report-fn/signed-call.ts <url> [result] [roundKey] [opponent]
import { Authenticator } from "npm:@dcl/crypto@3";
import { createUnsafeIdentity } from "npm:@dcl/crypto@3/dist/crypto.js";

const [url, result = "win", roundKey = `1:1:${Date.now()}`, opponent = "0x00000000000000000000000000000000000000bb", ownerKey = ""] = Deno.args;
const owner = ownerKey ? { privateKey: ownerKey, address: Deno.env.get("OWNER_ADDR") ?? "", publicKey: "" } : createUnsafeIdentity();
const ephemeral = createUnsafeIdentity();
const identity = await Authenticator.initializeAuthChain(owner.address, ephemeral, 60, async (msg: string) => Authenticator.createSignature(owner, msg));

const path = new URL(url).pathname;
const timestamp = String(Date.now() - (Deno.env.get("STALE") ? 600_000 : 0));
const metadata = JSON.stringify({ origin: "dev-helper" });
const payload = `post:${path}:${timestamp}:${metadata}`.toLowerCase();
const chain = Authenticator.signPayload(identity, payload);
const headers: Record<string, string> = { "content-type": "application/json", "x-identity-timestamp": timestamp, "x-identity-metadata": metadata };
chain.forEach((link, i) => (headers[`x-identity-auth-chain-${i}`] = JSON.stringify(link)));
if (Deno.env.get("APIKEY")) headers["apikey"] = Deno.env.get("APIKEY")!;
// TAMPER=1 changes the timestamp after signing (must be rejected); STALE=1 signs a 10-minute-old timestamp
if (Deno.env.get("TAMPER")) headers["x-identity-timestamp"] = String(Number(timestamp) + 1);

const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ name: "Dev Helper", game: "tictactoe", result, round_key: roundKey, opponents: [opponent] }) });
console.log("signer", owner.address.toLowerCase());
console.log(res.status, await res.text());
