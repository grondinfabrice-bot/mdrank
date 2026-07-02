alter table public.reactions
drop constraint if exists reactions_score_value_check;

alter table public.supernotes
drop constraint if exists supernotes_score_value_check;

create or replace function public.reaction_score(reaction_type text)
returns integer
language plpgsql
immutable
as $$
begin
  return case reaction_type
    when 'funny' then 1
    when 'crazy' then 2
    when 'heavy' then 3
    when 'killer' then 4
    when 'not_funny' then -1
    else null
  end;
end;
$$;

create or replace function public.ensure_supernote_is_allowed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
begin
  select author_id into v_author_id
  from public.punchlines
  where id = new.punchline_id;

  if v_author_id is null then
    raise exception 'Punchline not found';
  end if;

  if v_author_id = new.user_id then
    raise exception 'Cannot SuperNote your own punchline';
  end if;

  new.score_value := 6;
  new.supernote_day := coalesce(new.supernote_day, public.reunion_today());

  return new;
end;
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
    score =
      counts.funny_count
      + counts.crazy_count * 2
      + counts.heavy_count * 3
      + counts.killer_count * 4
      + counts.supernote_count * 6
      - counts.not_funny_count
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

  return v_supernote;
end;
$$;

alter table public.supernotes
alter column score_value set default 6;

update public.reactions
set score_value = public.reaction_score(reaction_type)
where score_value is distinct from public.reaction_score(reaction_type);

update public.supernotes
set score_value = 6
where score_value is distinct from 6;

alter table public.reactions
add constraint reactions_score_value_check check (
  (reaction_type = 'funny' and score_value = 1)
  or (reaction_type = 'crazy' and score_value = 2)
  or (reaction_type = 'heavy' and score_value = 3)
  or (reaction_type = 'killer' and score_value = 4)
  or (reaction_type = 'not_funny' and score_value = -1)
);

alter table public.supernotes
add constraint supernotes_score_value_check check (score_value = 6);

do $$
declare
  v_punchline record;
begin
  for v_punchline in select id from public.punchlines loop
    perform public.recalculate_punchline_score(v_punchline.id);
  end loop;
end;
$$;
