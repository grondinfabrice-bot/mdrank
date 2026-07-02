drop view if exists public.leaderboard_day;
drop view if exists public.leaderboard_week;
drop view if exists public.leaderboard_month;

create or replace view public.leaderboard_day as
select
  id,
  content,
  score,
  funny_count,
  heavy_count,
  killer_count,
  crazy_count,
  not_funny_count,
  supernote_count,
  created_at,
  author_id,
  author_pseudo,
  category_id,
  category_name,
  category_slug,
  challenge_id
from public.public_punchlines
where created_at >= (public.reunion_today()::timestamp at time zone 'Indian/Reunion')
order by score desc, supernote_count desc, created_at desc;

create or replace view public.leaderboard_week as
select
  id,
  content,
  score,
  funny_count,
  heavy_count,
  killer_count,
  crazy_count,
  not_funny_count,
  supernote_count,
  created_at,
  author_id,
  author_pseudo,
  category_id,
  category_name,
  category_slug,
  challenge_id
from public.public_punchlines
where created_at >= now() - interval '7 days'
order by score desc, supernote_count desc, created_at desc;

create or replace view public.leaderboard_month as
select
  id,
  content,
  score,
  funny_count,
  heavy_count,
  killer_count,
  crazy_count,
  not_funny_count,
  supernote_count,
  created_at,
  author_id,
  author_pseudo,
  category_id,
  category_name,
  category_slug,
  challenge_id
from public.public_punchlines
where created_at >= (date_trunc('month', now() at time zone 'Indian/Reunion') at time zone 'Indian/Reunion')
order by score desc, supernote_count desc, created_at desc;

grant select on public.leaderboard_day to anon, authenticated;
grant select on public.leaderboard_week to anon, authenticated;
grant select on public.leaderboard_month to anon, authenticated;
