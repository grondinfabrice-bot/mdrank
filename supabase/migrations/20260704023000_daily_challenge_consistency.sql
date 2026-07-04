create or replace function public.current_daily_challenge_id()
returns uuid
language sql
stable
as $$
  select d.id
  from public.daily_challenges d
  where d.is_active = true
    and d.challenge_date <= public.reunion_today()
  order by d.challenge_date desc, d.created_at desc, d.id desc
  limit 1
$$;

create or replace function public.create_punchline(content text, category_id uuid, challenge_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_content text := btrim(create_punchline.content);
  v_category_slug text;
  v_current_challenge_id uuid;
  v_punchline public.punchlines;
  v_unlocked_badges jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id;

  if v_profile.id is null then
    raise exception 'Profile required';
  end if;

  if v_profile.is_banned then
    raise exception 'User is banned';
  end if;

  if char_length(v_content) not between 3 and 180 then
    raise exception 'Punchline must be between 3 and 180 characters';
  end if;

  select c.slug into v_category_slug
  from public.categories c
  where c.id = create_punchline.category_id
    and c.is_active = true;

  if v_category_slug is null then
    raise exception 'Category is not active';
  end if;

  if create_punchline.challenge_id is null and v_category_slug = 'defi-du-jour' then
    raise exception 'Challenge category requires an active challenge';
  end if;

  if create_punchline.challenge_id is not null then
    if v_category_slug <> 'defi-du-jour' then
      raise exception 'Challenge punchline requires challenge category';
    end if;

    v_current_challenge_id := public.current_daily_challenge_id();

    if v_current_challenge_id is null
      or create_punchline.challenge_id is distinct from v_current_challenge_id then
      raise exception 'Challenge is not active';
    end if;
  end if;

  insert into public.punchlines (author_id, category_id, challenge_id, content, status)
  values (v_user_id, create_punchline.category_id, create_punchline.challenge_id, v_content, 'published')
  returning * into v_punchline;

  begin
    select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb) into v_unlocked_badges
    from public.check_and_award_badges_for_user(v_user_id) b;
  exception
    when others then
      raise warning 'MDRank badge check skipped after create_punchline for user %: %', v_user_id, SQLERRM;
  end;

  return jsonb_build_object(
    'punchline',
    to_jsonb(v_punchline),
    'unlocked_badges',
    v_unlocked_badges
  );
end;
$$;

grant execute on function public.current_daily_challenge_id() to anon, authenticated;
grant execute on function public.create_punchline(text, uuid, uuid) to authenticated;
