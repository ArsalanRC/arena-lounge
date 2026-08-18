-- Run once after 001 (18 Aug 2026): drop table privileges for the public roles and remove the test row.
-- tighten: the public roles need no table privileges at all (RLS already hides rows; this makes reads 401 too)
revoke all on table public.lounge_players, public.lounge_results from anon, authenticated;
-- remove the connectivity test row
delete from public.lounge_results where address = '0x00000000000000000000000000000000000000aa';
delete from public.lounge_players where address = '0x00000000000000000000000000000000000000aa';
