-- Newest notes from the suggestion box:  tools/dev/supa-sql supabase/list-feedback.sql
select id, to_char(created_at at time zone 'Europe/Berlin', 'DD.MM HH24:MI') as at, name, left(address, 8) as who, lang, place, handled, text
from public.lounge_feedback order by created_at desc limit 50;
