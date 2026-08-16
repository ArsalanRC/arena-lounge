# Deploying Arena Lounge to a Decentraland World

Judges open the World in the Decentraland mobile app, so the scene has to be
published to a **World** (not LAND) and stay online from submission until the
end of judging (11 Sept 2026). Publishing is free; you only need to own a name.

## 1. Own a name (one-time, ~10 minutes)

Two options. Pick one.

| Option | Cost | Storage cap | Where |
|--------|------|-------------|-------|
| **Decentraland NAME** (recommended) | 100 MANA (~$6.50 at Aug 2026 prices) + Ethereum gas | 100 MB per NAME | https://decentraland.org/marketplace/names/claim |
| ENS domain | ~$5/year + Ethereum gas | 36 MB fixed | https://app.ens.domains |

Our scene is ~1 MB, so either works. The NAME gives the nicer URL
(`arenalounge.dcl.eth`) and shows up in Decentraland Places automatically.

Steps for the NAME:

1. Use the **same account you use in the Creator Hub / Explorer**. If that
   account is an email login, it already has a wallet behind it; if it is
   MetaMask, use that wallet. The name must be owned by the wallet that signs
   the deployment.
2. Get ~110 MANA and ~0.003 ETH (gas) onto that wallet **on Ethereum mainnet**
   (Coinbase, Kraken or Binance: buy MANA, withdraw to your wallet address,
   network "Ethereum"). Send a little ETH the same way for gas.
3. Open https://decentraland.org/marketplace/names/claim, sign in, type
   `arenalounge` (or another free name, letters/numbers only, max 15 chars),
   click Claim, confirm the two transactions (approve MANA, mint).
4. If you picked a different name, change `worldConfiguration.name` in
   `scene.json` to `<yourname>.dcl.eth`.

## 2. Publish

From the project folder:

```bash
pnpm build
pnpm deploy -- --target-content https://worlds-content-server.decentraland.org
```

`deploy` rebuilds the bundle in production mode itself (about 0.7 MB
minified; the dev bundle in `bin/` is 7 MB with sourcemaps, so never judge
size from that). `pnpm build:prod` produces the same bundle for a size check.
`.dclignore` keeps tools, docs and the spec out of the upload; the GLBs in
`models/` (tower 0.65 MB, canopy 25 KB) and the PNGs in `images/` go up.

A browser tab opens; connect the wallet that owns the name and click
**Sign and Deploy** (a signature, no gas). Uploading + asset conversion takes a
few minutes; the scene is playable after stage 2 of 3.

Or from the Creator Hub: SCENES → Import → pick this folder → Publish →
**Publish to World** → choose the name.

## 3. Verify

- Desktop: `decentraland://?realm=arenalounge.dcl.eth`
- Mobile app: Discover / search "Arena Lounge", or open the same realm link
  on the phone.
- Check the World is listed on https://decentraland.org/places (Worlds tab).

## 4. Redeploys

Every redeploy overwrites the previous scene in the World; state (seats and
boards) is live-only and resets, which is fine. Keep the last deploy before
the DoraHacks deadline (4 Sept 2026 02:00) and do not redeploy anything risky
during judging (5 to 11 Sept).

## Troubleshooting

- "No names found": the wallet signing the deploy does not own the NAME. Sign
  out and back in with the right account.
- Storage errors: check remaining budget in Creator Hub → Manage.
- Scene loads but looks broken right after deploy: asset conversion still
  running, wait ~15 minutes.
