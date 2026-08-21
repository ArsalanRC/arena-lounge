-- Serialise same-round report calls (21 Aug 2026). Both clients report the instant a round
-- ends; two concurrent transactions could not see each other's uncommitted report, so BOTH
-- rows ended applied=false and nothing confirmed (seen live: round 11:1, reports 6+7).
-- pg_advisory_xact_lock(hashtext(round_key)) makes the second caller wait until the first
-- commits, so its confirm scan sees the partner row. Everything else is unchanged from 003.

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
  -- both participants report within the same instant: serialise per round so the second
  -- transaction sees the first one's committed row in the confirm scan below
  perform pg_advisory_xact_lock(hashtext(p_round_key));
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
-- create-or-replace keeps 003's revocations (service role only)

-- Round 11:1 from the live test (reports 6 + 7, win/loss verified consistent above) was
-- stranded by exactly this race: apply it now so the winner reaches the board.
select public.apply_report(7);
select public.apply_report(6);
