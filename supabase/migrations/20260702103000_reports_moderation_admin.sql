create or replace function public.report_punchline(punchline_id uuid, reason text, details text default null)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_details text := nullif(btrim(report_punchline.details), '');
  v_report public.reports;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;

  if v_profile.id is null then
    raise exception 'Profile required';
  end if;

  if v_profile.is_banned then
    raise exception 'User is banned';
  end if;

  if report_punchline.reason not in (
    'personal_attack',
    'identifiable_person',
    'hate',
    'harassment',
    'sexual_content',
    'spam',
    'other'
  ) then
    raise exception 'Invalid report reason';
  end if;

  if v_details is not null and char_length(v_details) > 500 then
    raise exception 'Report details must be 500 characters or less';
  end if;

  if not exists (
    select 1
    from public.punchlines p
    where p.id = report_punchline.punchline_id
      and p.status <> 'deleted'
  ) then
    raise exception 'Punchline not found';
  end if;

  if exists (
    select 1
    from public.punchlines p
    where p.id = report_punchline.punchline_id
      and p.author_id = v_user_id
  ) then
    raise exception 'Cannot report your own punchline';
  end if;

  insert into public.reports (punchline_id, reporter_id, reason, details)
  values (report_punchline.punchline_id, v_user_id, report_punchline.reason, v_details)
  returning * into v_report;

  perform public.recalculate_report_count(report_punchline.punchline_id);

  return v_report;
end;
$$;

create or replace function public.get_pending_reports()
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
    r.id,
    p.id as punchline_id,
    p.content as punchline_content,
    p.status as punchline_status,
    r.reason as report_reason,
    r.details as report_details,
    r.status as report_status,
    r.created_at,
    p.report_count,
    pr.id as author_id,
    pr.pseudo as author_pseudo,
    pr.is_banned as author_is_banned,
    c.name as category_name,
    c.slug as category_slug
  from public.reports r
  join public.punchlines p on p.id = r.punchline_id
  join public.profiles pr on pr.id = p.author_id
  join public.categories c on c.id = p.category_id
  where public.is_moderator_or_admin()
    and r.status = 'pending'
  order by r.created_at desc
$$;

create or replace function public.moderate_punchline(punchline_id uuid, action text, reason text default null)
returns public.punchlines
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_punchline public.punchlines;
begin
  if v_user_id is null or not public.is_moderator_or_admin() then
    raise exception 'Moderator role required';
  end if;

  if moderate_punchline.action = 'dismiss_report' then
    select * into v_punchline
    from public.punchlines
    where id = moderate_punchline.punchline_id;

    if v_punchline.id is null then
      raise exception 'Punchline not found';
    end if;

    update public.reports
    set status = 'dismissed',
        reviewed_at = now(),
        reviewed_by = v_user_id
    where reports.punchline_id = moderate_punchline.punchline_id
      and reports.status = 'pending';

    insert into public.moderation_actions (admin_id, punchline_id, action, reason)
    values (v_user_id, moderate_punchline.punchline_id, moderate_punchline.action, moderate_punchline.reason);

    return v_punchline;
  end if;

  v_status := case moderate_punchline.action
    when 'hide_punchline' then 'hidden'
    when 'restore_punchline' then 'published'
    when 'delete_punchline' then 'deleted'
    else null
  end;

  if v_status is null then
    raise exception 'Invalid moderation action';
  end if;

  update public.punchlines
  set status = v_status
  where id = moderate_punchline.punchline_id
  returning * into v_punchline;

  if v_punchline.id is null then
    raise exception 'Punchline not found';
  end if;

  update public.reports
  set status = 'action_taken',
      reviewed_at = now(),
      reviewed_by = v_user_id
  where reports.punchline_id = moderate_punchline.punchline_id
    and reports.status = 'pending';

  insert into public.moderation_actions (admin_id, punchline_id, action, reason)
  values (v_user_id, moderate_punchline.punchline_id, moderate_punchline.action, moderate_punchline.reason);

  return v_punchline;
end;
$$;

create or replace function public.moderate_user(target_user_id uuid, action text, reason text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_banned boolean;
  v_profile public.profiles;
begin
  if v_user_id is null or not public.is_admin() then
    raise exception 'Admin role required';
  end if;

  v_is_banned := case moderate_user.action
    when 'ban_user' then true
    when 'unban_user' then false
    else null
  end;

  if v_is_banned is null then
    raise exception 'Invalid user moderation action';
  end if;

  if moderate_user.target_user_id = v_user_id and v_is_banned then
    raise exception 'Cannot ban yourself';
  end if;

  update public.profiles
  set is_banned = v_is_banned
  where id = moderate_user.target_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Target profile not found';
  end if;

  insert into public.moderation_actions (admin_id, target_user_id, action, reason)
  values (v_user_id, moderate_user.target_user_id, moderate_user.action, moderate_user.reason);

  return v_profile;
end;
$$;

grant execute on function public.report_punchline(uuid, text, text) to authenticated;
grant execute on function public.get_pending_reports() to authenticated;
grant execute on function public.moderate_punchline(uuid, text, text) to authenticated;
grant execute on function public.moderate_user(uuid, text, text) to authenticated;
