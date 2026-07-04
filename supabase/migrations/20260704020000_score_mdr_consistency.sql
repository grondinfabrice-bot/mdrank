create or replace function public.calculate_mdr_score(
  funny_count integer,
  crazy_count integer,
  heavy_count integer,
  killer_count integer,
  supernote_count integer,
  not_funny_count integer
)
returns integer
language sql
immutable
as $$
  select
    coalesce(funny_count, 0)
    + coalesce(crazy_count, 0) * 2
    + coalesce(heavy_count, 0) * 3
    + coalesce(killer_count, 0) * 4
    + coalesce(supernote_count, 0) * 6
    - coalesce(not_funny_count, 0)
$$;

create or replace function public.recalculate_punchline_score(punchline_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.punchlines p
  set
    funny_count = counts.funny_count,
    heavy_count = counts.heavy_count,
    killer_count = counts.killer_count,
    crazy_count = counts.crazy_count,
    not_funny_count = counts.not_funny_count,
    supernote_count = counts.supernote_count,
    score = public.calculate_mdr_score(
      counts.funny_count,
      counts.crazy_count,
      counts.heavy_count,
      counts.killer_count,
      counts.supernote_count,
      counts.not_funny_count
    )
  from (
    select
      count(*) filter (where r.reaction_type = 'funny')::integer as funny_count,
      count(*) filter (where r.reaction_type = 'heavy')::integer as heavy_count,
      count(*) filter (where r.reaction_type = 'killer')::integer as killer_count,
      count(*) filter (where r.reaction_type = 'crazy')::integer as crazy_count,
      count(*) filter (where r.reaction_type = 'not_funny')::integer as not_funny_count,
      (
        select count(*)::integer
        from public.supernotes s
        where s.punchline_id = recalculate_punchline_score.punchline_id
      ) as supernote_count
    from public.reactions r
    where r.punchline_id = recalculate_punchline_score.punchline_id
  ) counts
  where p.id = recalculate_punchline_score.punchline_id;
end;
$$;

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
    join public.profiles pr on pr.id = p.author_id
    where p.author_id = auth.uid()
      and p.status = 'published'
      and pr.is_banned = false
  ),
  best_punchline as (
    select
      mp.id,
      mp.content,
      mp.score
    from my_punchlines mp
    order by mp.score desc, mp.supernote_count desc, mp.created_at desc
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

grant execute on function public.calculate_mdr_score(integer, integer, integer, integer, integer, integer) to authenticated;
grant execute on function public.get_my_profile_counts() to authenticated;
