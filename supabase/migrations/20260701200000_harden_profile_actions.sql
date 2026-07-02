create or replace function public.follow_user(target_user_id uuid)
returns public.follows
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_follow public.follows;
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

  if target_user_id = v_user_id then
    raise exception 'Cannot follow yourself';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_user_id
      and is_banned = false
  ) then
    raise exception 'Target profile not found';
  end if;

  insert into public.follows (follower_id, following_id)
  values (v_user_id, target_user_id)
  on conflict (follower_id, following_id) do update set following_id = excluded.following_id
  returning * into v_follow;

  return v_follow;
end;
$$;

create or replace function public.unfollow_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
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

  delete from public.follows
  where follower_id = v_user_id
    and following_id = target_user_id;
end;
$$;

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
    select 1 from public.punchlines p
    where p.id = report_punchline.punchline_id
      and p.status = 'published'
  ) then
    raise exception 'Published punchline not found';
  end if;

  insert into public.reports (punchline_id, reporter_id, reason, details)
  values (report_punchline.punchline_id, v_user_id, report_punchline.reason, v_details)
  returning * into v_report;

  perform public.recalculate_report_count(report_punchline.punchline_id);

  return v_report;
end;
$$;

grant execute on function public.follow_user(uuid) to authenticated;
grant execute on function public.unfollow_user(uuid) to authenticated;
grant execute on function public.report_punchline(uuid, text, text) to authenticated;
