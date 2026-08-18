-- Suggestions and bug reports from the box at the entrance (18 Aug 2026). Written only by the
-- Edge Function `feedback` (service role) after verifying the Decentraland signature; nobody
-- can read the table with the public key. Five notes per wallet per day.

create table if not exists public.lounge_feedback (
  id          bigserial primary key,
  address     text not null,
  name        text not null default '',
  text        text not null,
  lang        text not null default '',
  place       text not null default '',   -- floor / spot the note was written from
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists lounge_feedback_time_idx on public.lounge_feedback (created_at desc);
alter table public.lounge_feedback enable row level security;
revoke all on table public.lounge_feedback from anon, authenticated;

create or replace function public.submit_feedback(p_address text, p_name text, p_text text, p_lang text, p_where text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_addr text := lower(trim(p_address));
  v_recent integer;
  v_id bigint;
begin
  if v_addr !~ '^0x[0-9a-f]{40}$' then raise exception 'bad address'; end if;
  if length(trim(p_text)) < 3 then raise exception 'empty'; end if;
  select count(*) into v_recent from public.lounge_feedback f where f.address = v_addr and f.created_at > now() - interval '1 day';
  if v_recent >= 5 then raise exception 'daily limit'; end if;
  insert into public.lounge_feedback (address, name, text, lang, place)
  values (v_addr, left(coalesce(p_name, ''), 40), left(p_text, 600), left(coalesce(p_lang, ''), 8), left(coalesce(p_where, ''), 40))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.submit_feedback(text, text, text, text, text) from public, anon, authenticated;
