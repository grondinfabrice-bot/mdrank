drop policy if exists reports_insert_own on public.reports;
drop policy if exists follows_insert_own on public.follows;

create or replace function public.profile_is_active(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = profile_is_active.profile_id
      and is_banned = false
  );
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
    select 1
    from public.punchlines p
    where p.id = report_punchline.punchline_id
      and p.status = 'published'
  ) then
    raise exception 'Published punchline not found';
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

create policy follows_insert_own
on public.follows for insert
to authenticated
with check (
  follower_id = auth.uid()
  and follower_id <> following_id
  and public.profile_is_active(auth.uid())
  and public.profile_is_active(following_id)
);

create policy reports_insert_own
on public.reports for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and public.profile_is_active(auth.uid())
  and exists (
    select 1
    from public.punchlines p
    where p.id = punchline_id
      and p.status = 'published'
      and p.author_id <> auth.uid()
  )
);

grant execute on function public.profile_is_active(uuid) to authenticated;
grant execute on function public.report_punchline(uuid, text, text) to authenticated;
