-- Weighted points + anti-farm cap (20 Aug 2026). A confirmed WIN scores points by game
-- depth: quick / luck games 1, deeper boards 2, the long games 3. Only the first 5 scoring
-- wins per rolling 24 h against the same rival set score (farming a quick game with one
-- friend stops paying after five rounds; games/wins keep counting). Ranking: points first.
-- The board was empty when this was applied, so no backfill is needed.

alter table public.lounge_players add column if not exists points integer not null default 0;
alter table public.lounge_reports add column if not exists points integer not null default 0;

create or replace function public.game_points(p_game text)
returns integer
language sql
immutable
as $$
  select case p_game
    when 'chess' then 3 when 'ludo' then 3 when 'backgammon' then 3
    when 'reversi' then 2 when 'checkers' then 2 when 'supertictactoe' then 2 when 'seastrike' then 2
    else 1
  end;
$$;
revoke all on function public.game_points(text) from public, anon, authenticated;

-- apply_report now also scores points (replace keeps the existing grants/revocations)
create or replace function public.apply_report(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.lounge_reports%rowtype;
  v_pts integer := 0;
  v_scored integer;
begin
  select * into r from public.lounge_reports where id = p_id for update;
  if not found or r.applied then return; end if;
  if r.result = 'win' then
    v_pts := public.game_points(r.game);
    select count(*) into v_scored
    from public.lounge_reports q
    where q.address = r.address and q.applied and q.points > 0
      and q.created_at > now() - interval '24 hours'
      and (select array_agg(o order by o) from unnest(q.opponents) o)
        = (select array_agg(o order by o) from unnest(r.opponents) o);
    if v_scored >= 5 then v_pts := 0; end if;
  end if;
  update public.lounge_reports set applied = true, points = v_pts where id = p_id;
  insert into public.lounge_results (address, game, result) values (r.address, r.game, r.result);
  insert into public.lounge_players as p (address, name, wins, losses, draws, streak, best_streak, games, points, last_game, updated_at)
  values (
    r.address, r.name,
    case when r.result = 'win' then 1 else 0 end,
    case when r.result = 'loss' then 1 else 0 end,
    case when r.result = 'draw' then 1 else 0 end,
    case when r.result = 'win' then 1 else 0 end,
    case when r.result = 'win' then 1 else 0 end,
    1, v_pts, r.game, now())
  on conflict (address) do update set
    name        = case when r.name <> '' then r.name else p.name end,
    wins        = p.wins   + case when r.result = 'win'  then 1 else 0 end,
    losses      = p.losses + case when r.result = 'loss' then 1 else 0 end,
    draws       = p.draws  + case when r.result = 'draw' then 1 else 0 end,
    streak      = case when r.result = 'win' then p.streak + 1 when r.result = 'loss' then 0 else p.streak end,
    best_streak = greatest(p.best_streak, case when r.result = 'win' then p.streak + 1 else p.streak end),
    games       = p.games + 1,
    points      = p.points + v_pts,
    last_game   = r.game,
    updated_at  = now();
end;
$$;

-- return type gains `points`, so drop + recreate + restore the exact 001 grants
drop function public.leaderboard(integer);
create function public.leaderboard(p_limit integer default 10)
returns table (rank integer, name text, address text, points integer, wins integer, streak integer, best_streak integer, games integer)
language sql
security definer
set search_path = public
stable
as $$
  select row_number() over (order by p.points desc, p.wins desc, p.best_streak desc, p.games asc, p.updated_at asc)::integer as rank,
         case when p.name = '' then left(p.address, 6) || '…' || right(p.address, 4) else p.name end as name,
         left(p.address, 6) || '…' || right(p.address, 4) as address,
         p.points, p.wins, p.streak, p.best_streak, p.games
  from public.lounge_players p
  where p.games > 0
  order by p.points desc, p.wins desc, p.best_streak desc, p.games asc, p.updated_at asc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;
revoke all on function public.leaderboard(integer) from public;
grant execute on function public.leaderboard(integer) to anon, authenticated;
