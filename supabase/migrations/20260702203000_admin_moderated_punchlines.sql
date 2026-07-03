create or replace function public.get_moderated_punchlines()
returns table (
  id uuid,
  punchline_id uuid,
  punchline_content text,
  punchline_status text,
  report_reason text,
  report_details text,
  report_status text,
  created_at timestamptz,
  report_count integer,
  author_id uuid,
  author_pseudo text,
  author_is_banned boolean,
  category_name text,
  category_slug text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    coalesce(r.id, p.id) as id,
    p.id as punchline_id,
    p.content as punchline_content,
    p.status as punchline_status,
    r.reason as report_reason,
    r.details as report_details,
    r.status as report_status,
    coalesce(r.created_at, p.updated_at) as created_at,
    p.report_count,
    pr.id as author_id,
    pr.pseudo as author_pseudo,
    pr.is_banned as author_is_banned,
    c.name as category_name,
    c.slug as category_slug
  from public.punchlines p
  join public.profiles pr on pr.id = p.author_id
  join public.categories c on c.id = p.category_id
  left join lateral (
    select reports.id, reports.reason, reports.details, reports.status, reports.created_at
    from public.reports
    where reports.punchline_id = p.id
    order by reports.created_at desc
    limit 1
  ) r on true
  where public.is_moderator_or_admin()
    and p.status = 'hidden'
  order by p.updated_at desc
$$;

grant execute on function public.get_moderated_punchlines() to authenticated;
