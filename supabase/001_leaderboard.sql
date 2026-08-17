-- Arena Lounge leaderboard (Supabase project "arena-lounge", personal account)
-- Run once in the SQL editor. The scene calls two RPCs with the publishable key:
--   record_result(p_address, p_name, p_game, p_result)  -> upserts one player row
--   leaderboard(p_limit)                                 -> ranked rows for the boards
-- Everything else is locked by row-level security: no direct table access for anon.

create table if not exists public.lounge_players (
  address      text primary key,               -- lower-cased wallet address
  name         text not null default '',
  wins         integer not null default 0,
  losses       integer not null default 0,
  draws        integer not null default 0,
  streak       integer not null default 0,     -- current win streak
  best_streak  integer not null default 0,
  games        integer not null default 0,
  last_game    text not null default '',       -- last game id played
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create table if not exists public.lounge_results (
  id          bigserial primary key,
  address     text not null,
  game        text not null,
  result      text not null check (result in ('win', 'loss', 'draw')),
  created_at  timestamptz not null default now()
);
create index if not exists lounge_results_address_idx on public.lounge_results (address, created_at desc);

alter table public.lounge_players enable row level security;
alter table public.lounge_results enable row level security;
-- no policies on purpose: anon and authenticated cannot touch the tables directly

-- One finished round for one player. Self-reported by the player's own client, so the
-- function only accepts sane values and at most one result every 8 seconds per address.
create or replace function public.record_result(p_address text, p_name text, p_game text, p_result text)
returns table (wins integer, losses integer, draws integer, streak integer, best_streak integer, games integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_addr text := lower(trim(p_address));
  v_name text := left(trim(coalesce(p_name, '')), 40);
  v_game text := left(trim(coalesce(p_game, '')), 32);
  v_last timestamptz;
begin
  if v_addr !~ '^0x[0-9a-f]{40}$' then
    raise exception 'bad address';
  end if;
  if p_result not in ('win', 'loss', 'draw') then
    raise exception 'bad result';
  end if;
  select max(created_at) into v_last from public.lounge_results r where r.address = v_addr;
  if v_last is not null and v_last > now() - interval '8 seconds' then
    raise exception 'too fast';
  end if;
  insert into public.lounge_results (address, game, result) values (v_addr, v_game, p_result);
  insert into public.lounge_players as p (address, name, wins, losses, draws, streak, best_streak, games, last_game, updated_at)
  values (
    v_addr, v_name,
    case when p_result = 'win' then 1 else 0 end,
    case when p_result = 'loss' then 1 else 0 end,
    case when p_result = 'draw' then 1 else 0 end,
    case when p_result = 'win' then 1 else 0 end,
    case when p_result = 'win' then 1 else 0 end,
    1, v_game, now())
  on conflict (address) do update set
    name        = case when v_name <> '' then v_name else p.name end,
    wins        = p.wins   + case when p_result = 'win'  then 1 else 0 end,
    losses      = p.losses + case when p_result = 'loss' then 1 else 0 end,
    draws       = p.draws  + case when p_result = 'draw' then 1 else 0 end,
    streak      = case when p_result = 'win' then p.streak + 1 when p_result = 'loss' then 0 else p.streak end,
    best_streak = greatest(p.best_streak, case when p_result = 'win' then p.streak + 1 else p.streak end),
    games       = p.games + 1,
    last_game   = v_game,
    updated_at  = now();
  return query
    select p.wins, p.losses, p.draws, p.streak, p.best_streak, p.games
    from public.lounge_players p where p.address = v_addr;
end;
$$;

-- Ranked board: most wins first, then best streak, then fewest games (efficiency), newest last.
create or replace function public.leaderboard(p_limit integer default 10)
returns table (rank integer, name text, address text, wins integer, streak integer, best_streak integer, games integer)
language sql
security definer
set search_path = public
stable
as $$
  select row_number() over (order by p.wins desc, p.best_streak desc, p.games asc, p.updated_at asc)::integer as rank,
         case when p.name = '' then left(p.address, 6) || '…' || right(p.address, 4) else p.name end as name,
         left(p.address, 6) || '…' || right(p.address, 4) as address,
         p.wins, p.streak, p.best_streak, p.games
  from public.lounge_players p
  where p.games > 0
  order by p.wins desc, p.best_streak desc, p.games asc, p.updated_at asc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

-- One player's totals (for the "You: ..." line), address only, no name lookup.
create or replace function public.my_stats(p_address text)
returns table (wins integer, losses integer, draws integer, streak integer, best_streak integer, games integer)
language sql
security definer
set search_path = public
stable
as $$
  select p.wins, p.losses, p.draws, p.streak, p.best_streak, p.games
  from public.lounge_players p
  where p.address = lower(trim(p_address));
$$;

revoke all on function public.my_stats(text) from public;
grant execute on function public.my_stats(text) to anon, authenticated;

revoke all on function public.record_result(text, text, text, text) from public;
revoke all on function public.leaderboard(integer) from public;
grant execute on function public.record_result(text, text, text, text) to anon, authenticated;
grant execute on function public.leaderboard(integer) to anon, authenticated;
