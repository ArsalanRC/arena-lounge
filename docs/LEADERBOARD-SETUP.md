# Leaderboard setup (Supabase) — to do once, by Arsalan

The scene keeps a persistent leaderboard (wins against real players, streaks) in a
Supabase project. Everything on the scene side is written and merged; it stays
hidden until the two values in `src/lounge/config.ts` (`LEADERBOARD.url` and
`LEADERBOARD.key`) are filled. This page is the checklist for the part only you
can do. Ten minutes.

## 1. Create the project (personal account, not the company one)

1. https://supabase.com → sign in with GitHub as **ArsalanRC** (or your personal
   email). Free plan is fine (two projects included).
2. **New project**: organisation = your personal one, name `arena-lounge`,
   region **eu-central-1 (Frankfurt)**, database password = anything strong.
   Keep the password in your password manager. We never use it in the scene.
3. Wait until the project shows as healthy (about two minutes).

## 2. Run the migration

1. Left menu → **SQL Editor** → **New query**.
2. Paste the whole file `supabase/001_leaderboard.sql` from this repo, click **Run**.
3. Expected: "Success. No rows returned". Table Editor now lists `lounge_players`
   and `lounge_results`; both with row-level security on and no policies, so the
   public key cannot touch them directly. Only the three functions are callable:
   `record_result`, `leaderboard`, `my_stats`.

## 3. Copy the two public values for the scene

Project Settings → **API**:
- **Project URL**, looks like `https://abcdefghijklmnop.supabase.co`
- **Publishable key** (`sb_publishable_...`) or, if only that exists, the legacy
  **anon public** key (`eyJ...`). Either works. NOT the `service_role` key.

Paste both to Claude. They go into `src/lounge/config.ts`:

```ts
export const LEADERBOARD = {
  url: 'https://....supabase.co',
  key: 'sb_publishable_...',
  ...
}
```

Both values are public by design (they ship in every client of every Supabase
app), so they can live in the public repo. What protects the data is the
row-level security from step 2, not the secrecy of the key.

## 4. Never share

- the database password,
- the `service_role` key,
- the JWT secret.

## What happens then (Claude)

- Plug the values in, run a two-identity round on desktop, watch a row appear in
  `lounge_players`, then redeploy (your signature).
- Rooftop: the "leaderboard later" note becomes a real board (top 10, refreshed
  while someone is up there); the "?" panel gets a Leaderboard tab with your own
  totals; results are reported by each player's own client only for rounds with
  a human opponent, at most one per player every 8 seconds.

## Later, if wanted

- Reset the board: SQL Editor → `truncate public.lounge_results, public.lounge_players;`
- Rate limit or names: edit the functions in `supabase/001_leaderboard.sql` and
  re-run only the changed `create or replace function` block.
