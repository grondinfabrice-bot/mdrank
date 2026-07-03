create or replace function public.award_badge_if_missing(
  target_user_id uuid,
  badge_slug text,
  source_type text default null,
  source_id uuid default null
)
returns public.user_badges
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badge_id uuid;
  v_user_badge public.user_badges;
begin
  if target_user_id is null then
    raise exception 'Target user is required';
  end if;

  if badge_slug is null or btrim(badge_slug) = '' then
    raise exception 'Badge slug is required';
  end if;

  select b.id into v_badge_id
  from public.badges b
  where b.slug = award_badge_if_missing.badge_slug
    and b.is_active = true;

  if v_badge_id is null then
    return null;
  end if;

  insert into public.user_badges (user_id, badge_id, source_type, source_id)
  values (
    award_badge_if_missing.target_user_id,
    v_badge_id,
    award_badge_if_missing.source_type,
    award_badge_if_missing.source_id
  )
  on conflict on constraint user_badges_unique_user_badge do nothing
  returning * into v_user_badge;

  if v_user_badge.id is null then
    select ub.* into v_user_badge
    from public.user_badges ub
    where ub.user_id = award_badge_if_missing.target_user_id
      and ub.badge_id = v_badge_id;
  end if;

  return v_user_badge;
end;
$$;

create or replace function public.check_and_award_badges_for_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_published_count integer := 0;
  v_killer_received_count integer := 0;
  v_supernote_received_count integer := 0;
  v_challenge_punchline_count integer := 0;
begin
  if target_user_id is null then
    return;
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = check_and_award_badges_for_user.target_user_id
      and p.is_banned = false
  ) then
    return;
  end if;

  select count(*)::integer into v_published_count
  from public.punchlines p
  where p.author_id = check_and_award_badges_for_user.target_user_id
    and p.status = 'published';

  select count(*)::integer into v_challenge_punchline_count
  from public.punchlines p
  where p.author_id = check_and_award_badges_for_user.target_user_id
    and p.status = 'published'
    and p.challenge_id is not null;

  select count(*)::integer into v_supernote_received_count
  from public.supernotes s
  join public.punchlines p on p.id = s.punchline_id
  where p.author_id = check_and_award_badges_for_user.target_user_id
    and p.status = 'published';

  select count(*)::integer into v_killer_received_count
  from public.reactions r
  join public.punchlines p on p.id = r.punchline_id
  where p.author_id = check_and_award_badges_for_user.target_user_id
    and p.status = 'published'
    and r.reaction_type = 'killer';

  if v_published_count >= 1 then
    perform public.award_badge_if_missing(target_user_id, 'premier-mdr', 'posting');
  end if;

  if v_published_count >= 5 then
    perform public.award_badge_if_missing(target_user_id, 'machine-a-vannes-1', 'posting');
  end if;

  if v_published_count >= 25 then
    perform public.award_badge_if_missing(target_user_id, 'machine-a-vannes-2', 'posting');
  end if;

  if v_published_count >= 100 then
    perform public.award_badge_if_missing(target_user_id, 'machine-a-vannes-3', 'posting');
  end if;

  if v_supernote_received_count >= 1 then
    perform public.award_badge_if_missing(target_user_id, 'supernote-1', 'supernote');
  end if;

  if v_killer_received_count >= 1 then
    perform public.award_badge_if_missing(target_user_id, 'killer-1', 'reaction');
  end if;

  if v_killer_received_count >= 10 then
    perform public.award_badge_if_missing(target_user_id, 'killer-2', 'reaction');
  end if;

  if v_killer_received_count >= 50 then
    perform public.award_badge_if_missing(target_user_id, 'killer-3', 'reaction');
  end if;

  if v_challenge_punchline_count >= 1 then
    perform public.award_badge_if_missing(target_user_id, 'defi-du-jour', 'challenge');
  end if;
end;
$$;

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

  begin
    perform public.check_and_award_badges_for_user(v_user_id);
  exception
    when others then
      raise warning 'MDRank badge check skipped after create_punchline for user %: %', v_user_id, SQLERRM;
  end;

  return v_punchline;
end;
$$;

create or replace function public.cast_reaction(punchline_id uuid, reaction_type text)
returns public.reactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_punchline public.punchlines;
  v_score integer;
  v_reaction public.reactions;
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

  select * into v_punchline
  from public.punchlines
  where id = cast_reaction.punchline_id
    and status = 'published';

  if v_punchline.id is null then
    raise exception 'Published punchline not found';
  end if;

  if v_punchline.author_id = v_user_id then
    raise exception 'Cannot react to your own punchline';
  end if;

  v_score := public.reaction_score(cast_reaction.reaction_type);

  if v_score is null then
    raise exception 'Invalid reaction type';
  end if;

  insert into public.reactions (punchline_id, user_id, reaction_type, score_value)
  values (cast_reaction.punchline_id, v_user_id, cast_reaction.reaction_type, v_score)
  on conflict on constraint reactions_unique_user_punchline do update set
    reaction_type = excluded.reaction_type,
    score_value = excluded.score_value,
    updated_at = now()
  returning * into v_reaction;

  perform public.recalculate_punchline_score(cast_reaction.punchline_id);
  begin
    perform public.check_and_award_badges_for_user(v_punchline.author_id);
  exception
    when others then
      raise warning 'MDRank badge check skipped after cast_reaction for user %: %', v_punchline.author_id, SQLERRM;
  end;

  return v_reaction;
end;
$$;

create or replace function public.give_supernote(punchline_id uuid)
returns public.supernotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_punchline public.punchlines;
  v_day date := public.reunion_today();
  v_supernote public.supernotes;
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

  select * into v_punchline
  from public.punchlines
  where id = give_supernote.punchline_id
    and status = 'published';

  if v_punchline.id is null then
    raise exception 'Published punchline not found';
  end if;

  if v_punchline.author_id = v_user_id then
    raise exception 'Cannot SuperNote your own punchline';
  end if;

  if exists (
    select 1 from public.supernotes s
    where s.user_id = v_user_id
      and s.supernote_day = v_day
  ) then
    raise exception 'Daily SuperNote already used';
  end if;

  if exists (
    select 1 from public.supernotes s
    where s.user_id = v_user_id
      and s.punchline_id = give_supernote.punchline_id
  ) then
    raise exception 'Punchline already SuperNoted by this user';
  end if;

  insert into public.supernotes (punchline_id, user_id, score_value, supernote_day)
  values (give_supernote.punchline_id, v_user_id, 6, v_day)
  returning * into v_supernote;

  perform public.recalculate_punchline_score(give_supernote.punchline_id);
  begin
    perform public.check_and_award_badges_for_user(v_punchline.author_id);
  exception
    when others then
      raise warning 'MDRank badge check skipped after give_supernote for user %: %', v_punchline.author_id, SQLERRM;
  end;

  return v_supernote;
end;
$$;

do $$
declare
  v_profile record;
begin
  for v_profile in select id from public.profiles loop
    begin
      perform public.check_and_award_badges_for_user(v_profile.id);
    exception
      when others then
        raise warning 'MDRank badge backfill skipped for user %: %', v_profile.id, SQLERRM;
    end;
  end loop;
end;
$$;

revoke execute on function public.award_badge_if_missing(uuid, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.check_and_award_badges_for_user(uuid) from public, anon, authenticated;

grant execute on function public.create_punchline(text, uuid, uuid) to authenticated;
grant execute on function public.cast_reaction(uuid, text) to authenticated;
grant execute on function public.give_supernote(uuid) to authenticated;
