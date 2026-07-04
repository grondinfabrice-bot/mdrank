drop view if exists public.leaderboard_users;

create or replace view public.leaderboard_users as
select
  pp.author_id,
  pp.author_pseudo,
  count(*)::bigint as punchline_count,
  coalesce(sum(pp.score), 0)::bigint as score_mdr,
  coalesce(sum(pp.supernote_count), 0)::bigint as supernote_received_count,
  max(pp.created_at) as latest_punchline_at
from public.public_punchlines pp
group by pp.author_id, pp.author_pseudo
order by score_mdr desc, supernote_received_count desc, punchline_count desc, latest_punchline_at desc;

grant select on public.leaderboard_users to anon, authenticated;
