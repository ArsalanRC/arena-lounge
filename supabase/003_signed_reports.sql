-- Signed, confirmed reports (18 Aug 2026). The Edge Function `report` verifies the
-- Decentraland signature and calls submit_report with the SERVICE role; the public key
-- can no longer call record_result. A round counts for a player only once another
-- participant of the same round has reported a consistent outcome.

create table if not exists public.lounge_reports (
  id          bigserial primary key,
  round_key   text not null,                 -- "<table>:<round>:<dealtAt ms>", shared by all clients of that round
  address     text not null,
  name        text not null default '',
  game        text not null default '',
  result      text not null check (result in ('win', 'loss', 'draw')),
  opponents   text[] not null default '{}',  -- the other human seats of that round
  applied     boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (round_key, address)
);
create index if not exists lounge_reports_round_idx on public.lounge_reports (round_key);
create index if not exists lounge_reports_addr_time_idx on public.lounge_reports (address, created_at desc);
alter table public.lounge_reports enable row level security;
revoke all on table public.lounge_reports from anon, authenticated;

-- Apply one confirmed report to lounge_players (idempotent through reports.applied).
create or replace function public.apply_report(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.lounge_reports%rowtype;
begin
  select * into r from public.lounge_reports where id = p_id for update;
  if not found or r.applied then return; end if;
  update public.lounge_reports set applied = true where id = p_id;
  insert into public.lounge_results (address, game, result) values (r.address, r.game, r.result);
  insert into public.lounge_players as p (address, name, wins, losses, draws, streak, best_streak, games, last_game, updated_at)
  values (
    r.address, r.name,
    case when r.result = 'win' then 1 else 0 end,
    case when r.result = 'loss' then 1 else 0 end,
    case when r.result = 'draw' then 1 else 0 end,
    case when r.result = 'win' then 1 else 0 end,
    case when r.result = 'win' then 1 else 0 end,
    1, r.game, now())
  on conflict (address) do update set
    name        = case when r.name <> '' then r.name else p.name end,
    wins        = p.wins   + case when r.result = 'win'  then 1 else 0 end,
    losses      = p.losses + case when r.result = 'loss' then 1 else 0 end,
    draws       = p.draws  + case when r.result = 'draw' then 1 else 0 end,
    streak      = case when r.result = 'win' then p.streak + 1 when r.result = 'loss' then 0 else p.streak end,
    best_streak = greatest(p.best_streak, case when r.result = 'win' then p.streak + 1 else p.streak end),
    games       = p.games + 1,
    last_game   = r.game,
    updated_at  = now();
end;
$$;

-- Called only by the Edge Function (service role). Stores the report, confirms it against the
-- other participants' reports of the same round, applies whatever became confirmed, and
-- returns the caller's totals.
create or replace function public.submit_report(p_address text, p_name text, p_game text, p_result text, p_round_key text, p_opponents text[])
returns table (wins integer, losses integer, draws integer, streak integer, best_streak integer, games integer, confirmed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_addr text := lower(trim(p_address));
  v_id bigint;
  v_recent integer;
  v_daily integer;
  v_other public.lounge_reports%rowtype;
  v_confirmed boolean := false;
begin
  if v_addr !~ '^0x[0-9a-f]{40}$' then raise exception 'bad address'; end if;
  if p_result not in ('win', 'loss', 'draw') then raise exception 'bad result'; end if;
  if p_round_key !~ '^\d{1,4}:\d{1,9}:\d{10,16}$' then raise exception 'bad round'; end if;
  -- pace: at most one report per 8 s and 120 per day per address
  select count(*) into v_recent from public.lounge_reports r where r.address = v_addr and r.created_at > now() - interval '8 seconds';
  if v_recent > 0 then raise exception 'too fast'; end if;
  select count(*) into v_daily from public.lounge_reports r where r.address = v_addr and r.created_at > now() - interval '1 day';
  if v_daily >= 120 then raise exception 'daily limit'; end if;

  insert into public.lounge_reports (round_key, address, name, game, result, opponents)
  values (p_round_key, v_addr, left(coalesce(p_name, ''), 40), left(coalesce(p_game, ''), 32), p_result, p_opponents)
  on conflict (round_key, address) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.lounge_reports r where r.round_key = p_round_key and r.address = v_addr;
  end if;

  -- confirmation: another participant of the same round, named by me and naming me, within ten
  -- minutes, with a consistent outcome (no two winners; a draw only with a draw)
  for v_other in
    select * from public.lounge_reports r
    where r.round_key = p_round_key and r.address <> v_addr
      and r.address = any (p_opponents) and v_addr = any (r.opponents)
      and r.created_at > now() - interval '10 minutes'
  loop
    if (p_result = 'win' and v_other.result = 'win') then continue; end if;
    if ((p_result = 'draw') <> (v_other.result = 'draw')) then continue; end if;
    v_confirmed := true;
    perform public.apply_report(v_other.id);
  end loop;
  if v_confirmed then perform public.apply_report(v_id); end if;

  return query
    select coalesce(p.wins, 0), coalesce(p.losses, 0), coalesce(p.draws, 0), coalesce(p.streak, 0), coalesce(p.best_streak, 0), coalesce(p.games, 0), v_confirmed
    from (select 1) x left join public.lounge_players p on p.address = v_addr;
end;
$$;

-- Supabase's default privileges grant execute to anon + authenticated on new public functions: take it back
revoke all on function public.apply_report(bigint) from public, anon, authenticated;
revoke all on function public.submit_report(text, text, text, text, text, text[]) from public, anon, authenticated;
-- the public key loses the direct, unverified path; the Edge Function reaches submit_report as service role
revoke execute on function public.record_result(text, text, text, text) from anon, authenticated;
