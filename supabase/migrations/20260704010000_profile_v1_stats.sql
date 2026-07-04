drop function if exists public.get_my_profile_counts();

create or replace function public.get_my_profile_counts()
returns table (
  following_count bigint,
  followers_count bigint,
  punchline_count bigint,
  score_mdr bigint,
  supernote_received_count bigint,
  best_punchline_id uuid,
  best_punchline_content text,
  best_punchline_score integer
)
language sql
security definer
stable
set search_path = public
as $$
  with my_punchlines as (
    select
      p.id,
      p.content,
      p.score,
      p.supernote_count,
      p.created_at
    from public.punchlines p
    where p.author_id = auth.uid()
      and p.status = 'published'
  ),
  best_punchline as (
    select
      mp.id,
      mp.content,
      mp.score
    from my_punchlines mp
    order by mp.score desc, mp.created_at desc
    limit 1
  )
  select
    (select count(*) from public.follows where follower_id = auth.uid()) as following_count,
    (select count(*) from public.follows where following_id = auth.uid()) as followers_count,
    (select count(*) from my_punchlines) as punchline_count,
    coalesce((select sum(score) from my_punchlines), 0)::bigint as score_mdr,
    coalesce((select sum(supernote_count) from my_punchlines), 0)::bigint as supernote_received_count,
    bp.id as best_punchline_id,
    bp.content as best_punchline_content,
    bp.score as best_punchline_score
  from best_punchline bp
  right join (select 1) anchor on true
$$;

grant execute on function public.get_my_profile_counts() to authenticated;
