create or replace function public.get_my_badge_progress_counts()
returns table (
  published_count bigint,
  killer_received_count bigint,
  supernote_received_count bigint,
  challenge_punchline_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    (
      select count(*)
      from public.punchlines p
      where p.author_id = auth.uid()
        and p.status = 'published'
    ) as published_count,
    (
      select coalesce(sum(p.killer_count), 0)
      from public.punchlines p
      where p.author_id = auth.uid()
        and p.status = 'published'
    ) as killer_received_count,
    (
      select coalesce(sum(p.supernote_count), 0)
      from public.punchlines p
      where p.author_id = auth.uid()
        and p.status = 'published'
    ) as supernote_received_count,
    (
      select count(*)
      from public.punchlines p
      where p.author_id = auth.uid()
        and p.status = 'published'
        and p.challenge_id is not null
    ) as challenge_punchline_count
$$;

grant execute on function public.get_my_badge_progress_counts() to authenticated;
