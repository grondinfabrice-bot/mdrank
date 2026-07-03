create or replace function public.create_punchline(content text, category_id uuid, challenge_id uuid default null)
returns public.punchlines
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_content text := btrim(create_punchline.content);
  v_category_slug text;
  v_punchline public.punchlines;
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

    if not exists (
      select 1 from public.daily_challenges d
      where d.id = create_punchline.challenge_id
        and d.is_active = true
        and d.challenge_date <= ((now() at time zone 'Indian/Reunion')::date)
    ) then
      raise exception 'Challenge is not active';
    end if;
  end if;

  insert into public.punchlines (author_id, category_id, challenge_id, content, status)
  values (v_user_id, create_punchline.category_id, create_punchline.challenge_id, v_content, 'published')
  returning * into v_punchline;

  return v_punchline;
end;
$$;
