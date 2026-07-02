create extension if not exists pgcrypto;

create or replace function public.normalize_pseudo(input text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(btrim(coalesce(input, '')), '\s+', '', 'g'));
$$;

create or replace function public.reunion_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Indian/Reunion')::date;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_profile_pseudo_normalized()
returns trigger
language plpgsql
as $$
begin
  new.pseudo = btrim(new.pseudo);
  new.pseudo_normalized = public.normalize_pseudo(new.pseudo);
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text not null unique,
  pseudo_normalized text not null unique,
  bio text,
  role text not null default 'user',
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('user', 'moderator', 'admin')),
  constraint profiles_pseudo_length_check check (char_length(pseudo) between 3 and 24),
  constraint profiles_pseudo_normalized_length_check check (char_length(pseudo_normalized) between 3 and 24),
  constraint profiles_bio_length_check check (bio is null or char_length(bio) <= 160)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  challenge_date date not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.punchlines (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  challenge_id uuid references public.daily_challenges(id) on delete set null,
  content text not null,
  status text not null default 'published',
  score integer not null default 0,
  funny_count integer not null default 0,
  heavy_count integer not null default 0,
  killer_count integer not null default 0,
  crazy_count integer not null default 0,
  not_funny_count integer not null default 0,
  supernote_count integer not null default 0,
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint punchlines_content_length_check check (char_length(content) between 3 and 180),
  constraint punchlines_status_check check (status in ('published', 'hidden', 'deleted', 'pending_review')),
  constraint punchlines_counters_non_negative_check check (
    funny_count >= 0
    and heavy_count >= 0
    and killer_count >= 0
    and crazy_count >= 0
    and not_funny_count >= 0
    and supernote_count >= 0
    and report_count >= 0
  )
);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  punchline_id uuid not null references public.punchlines(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null,
  score_value integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reactions_unique_user_punchline unique (user_id, punchline_id),
  constraint reactions_type_check check (reaction_type in ('funny', 'heavy', 'killer', 'crazy', 'not_funny')),
  constraint reactions_score_value_check check (
    (reaction_type = 'funny' and score_value = 2)
    or (reaction_type = 'heavy' and score_value = 3)
    or (reaction_type = 'killer' and score_value = 3)
    or (reaction_type = 'crazy' and score_value = 2)
    or (reaction_type = 'not_funny' and score_value = -1)
  )
);

create table public.supernotes (
  id uuid primary key default gen_random_uuid(),
  punchline_id uuid not null references public.punchlines(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score_value integer not null default 5,
  supernote_day date not null default public.reunion_today(),
  created_at timestamptz not null default now(),
  constraint supernotes_score_value_check check (score_value = 5),
  constraint supernotes_unique_user_day unique (user_id, supernote_day),
  constraint supernotes_unique_user_punchline unique (user_id, punchline_id)
);

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_unique_pair unique (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id <> following_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  punchline_id uuid not null references public.punchlines(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  constraint reports_reason_check check (reason in (
    'personal_attack',
    'identifiable_person',
    'hate',
    'harassment',
    'sexual_content',
    'spam',
    'other'
  )),
  constraint reports_status_check check (status in ('pending', 'reviewed', 'dismissed', 'action_taken')),
  constraint reports_unique_reporter_punchline unique (reporter_id, punchline_id),
  constraint reports_details_length_check check (details is null or char_length(details) <= 500)
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  punchline_id uuid references public.punchlines(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint moderation_actions_action_check check (action in (
    'hide_punchline',
    'restore_punchline',
    'delete_punchline',
    'ban_user',
    'unban_user',
    'dismiss_report'
  ))
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger profiles_set_pseudo_normalized
before insert or update of pseudo on public.profiles
for each row execute function public.set_profile_pseudo_normalized();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger punchlines_set_updated_at
before update on public.punchlines
for each row execute function public.set_updated_at();

create trigger reactions_set_updated_at
before update on public.reactions
for each row execute function public.set_updated_at();

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

create index punchlines_created_at_desc_idx on public.punchlines (created_at desc);
create index punchlines_score_desc_idx on public.punchlines (score desc);
create index punchlines_author_id_idx on public.punchlines (author_id);
create index punchlines_category_id_idx on public.punchlines (category_id);
create index punchlines_challenge_id_idx on public.punchlines (challenge_id);
create index punchlines_status_created_at_idx on public.punchlines (status, created_at desc);
create index reactions_punchline_id_idx on public.reactions (punchline_id);
create index reactions_user_id_idx on public.reactions (user_id);
create index supernotes_user_day_idx on public.supernotes (user_id, supernote_day);
create index supernotes_punchline_id_idx on public.supernotes (punchline_id);
create index follows_follower_id_idx on public.follows (follower_id);
create index follows_following_id_idx on public.follows (following_id);
create index reports_punchline_id_idx on public.reports (punchline_id);
create index reports_status_idx on public.reports (status);

insert into public.categories (name, slug, sort_order) values
  ('Ta mère', 'ta-mere', 10),
  ('Punchline', 'punchline', 20),
  ('Absurde', 'absurde', 30),
  ('Roast', 'roast', 40),
  ('Vie quotidienne', 'vie-quotidienne', 50),
  ('Défi du jour', 'defi-du-jour', 60)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.app_settings (key, value) values
  ('max_punchline_length', '180'::jsonb),
  ('min_punchline_length', '3'::jsonb),
  ('supernote_per_day', '1'::jsonb)
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_is_banned()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_banned from public.profiles where id = auth.uid()), true);
$$;

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('moderator', 'admin'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.reaction_score(reaction_type text)
returns integer
language plpgsql
immutable
as $$
begin
  return case reaction_type
    when 'funny' then 2
    when 'heavy' then 3
    when 'killer' then 3
    when 'crazy' then 2
    when 'not_funny' then -1
    else null
  end;
end;
$$;

create or replace function public.ensure_reaction_is_allowed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_score integer;
begin
  select author_id into v_author_id
  from public.punchlines
  where id = new.punchline_id;

  if v_author_id is null then
    raise exception 'Punchline not found';
  end if;

  if v_author_id = new.user_id then
    raise exception 'Cannot react to your own punchline';
  end if;

  v_score := public.reaction_score(new.reaction_type);

  if v_score is null or new.score_value <> v_score then
    raise exception 'Invalid reaction score';
  end if;

  return new;
end;
$$;

create trigger reactions_ensure_allowed
before insert or update of punchline_id, user_id, reaction_type, score_value on public.reactions
for each row execute function public.ensure_reaction_is_allowed();

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

  new.score_value := 5;
  new.supernote_day := coalesce(new.supernote_day, public.reunion_today());

  return new;
end;
$$;

create trigger supernotes_ensure_allowed
before insert or update of punchline_id, user_id, score_value, supernote_day on public.supernotes
for each row execute function public.ensure_supernote_is_allowed();

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
      counts.funny_count * 2
      + counts.heavy_count * 3
      + counts.killer_count * 3
      + counts.crazy_count * 2
      + counts.supernote_count * 5
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

create or replace function public.recalculate_report_count(punchline_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.punchlines p
  set report_count = (
    select count(*)::integer
    from public.reports r
    where r.punchline_id = recalculate_report_count.punchline_id
  )
  where p.id = recalculate_report_count.punchline_id;
end;
$$;

create or replace function public.recalculate_score_from_reaction_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.recalculate_punchline_score(old.punchline_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform public.recalculate_punchline_score(new.punchline_id);
  end if;

  return null;
end;
$$;

create trigger reactions_recalculate_score
after insert or update or delete on public.reactions
for each row execute function public.recalculate_score_from_reaction_trigger();

create trigger supernotes_recalculate_score
after insert or update or delete on public.supernotes
for each row execute function public.recalculate_score_from_reaction_trigger();

create or replace function public.recalculate_report_count_from_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.recalculate_report_count(old.punchline_id);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    perform public.recalculate_report_count(new.punchline_id);
  end if;

  return null;
end;
$$;

create trigger reports_recalculate_count
after insert or update or delete on public.reports
for each row execute function public.recalculate_report_count_from_trigger();

create or replace function public.create_or_update_profile(pseudo text, bio text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pseudo text := btrim(create_or_update_profile.pseudo);
  v_bio text := nullif(btrim(create_or_update_profile.bio), '');
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if char_length(v_pseudo) not between 3 and 24 then
    raise exception 'Pseudo must be between 3 and 24 characters';
  end if;

  if v_bio is not null and char_length(v_bio) > 160 then
    raise exception 'Bio must be 160 characters or less';
  end if;

  insert into public.profiles (id, pseudo, bio)
  values (v_user_id, v_pseudo, v_bio)
  on conflict (id) do update set
    pseudo = excluded.pseudo,
    bio = excluded.bio,
    updated_at = now()
  returning * into v_profile;

  return v_profile;
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

  if not exists (
    select 1 from public.categories c
    where c.id = create_punchline.category_id
      and c.is_active = true
  ) then
    raise exception 'Category is not active';
  end if;

  if create_punchline.challenge_id is not null and not exists (
    select 1 from public.daily_challenges d
    where d.id = create_punchline.challenge_id
      and d.is_active = true
  ) then
    raise exception 'Challenge is not active';
  end if;

  insert into public.punchlines (author_id, category_id, challenge_id, content, status)
  values (v_user_id, create_punchline.category_id, create_punchline.challenge_id, v_content, 'published')
  returning * into v_punchline;

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
  on conflict (user_id, punchline_id) do update set
    reaction_type = excluded.reaction_type,
    score_value = excluded.score_value,
    updated_at = now()
  returning * into v_reaction;

  perform public.recalculate_punchline_score(cast_reaction.punchline_id);

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
  values (give_supernote.punchline_id, v_user_id, 5, v_day)
  returning * into v_supernote;

  perform public.recalculate_punchline_score(give_supernote.punchline_id);

  return v_supernote;
end;
$$;

create or replace function public.follow_user(target_user_id uuid)
returns public.follows
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_follow public.follows;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if target_user_id = v_user_id then
    raise exception 'Cannot follow yourself';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
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
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  delete from public.follows
  where follower_id = auth.uid()
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
  v_details text := nullif(btrim(report_punchline.details), '');
  v_report public.reports;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
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

create or replace view public.public_profiles as
select
  id,
  pseudo,
  bio,
  created_at
from public.profiles
where is_banned = false;

create or replace view public.public_punchlines as
select
  p.id,
  p.content,
  p.score,
  p.funny_count,
  p.heavy_count,
  p.killer_count,
  p.crazy_count,
  p.not_funny_count,
  p.supernote_count,
  p.report_count,
  p.created_at,
  p.author_id,
  pr.pseudo as author_pseudo,
  p.category_id,
  c.name as category_name,
  c.slug as category_slug,
  p.challenge_id,
  p.status
from public.punchlines p
join public.profiles pr on pr.id = p.author_id
join public.categories c on c.id = p.category_id
where p.status = 'published'
  and pr.is_banned = false;

create or replace view public.feed_recent as
select *
from public.public_punchlines
order by created_at desc;

create or replace view public.leaderboard_day as
select *
from public.public_punchlines
where created_at >= (public.reunion_today()::timestamp at time zone 'Indian/Reunion')
order by score desc, created_at desc;

create or replace view public.leaderboard_week as
select *
from public.public_punchlines
where created_at >= now() - interval '7 days'
order by score desc, created_at desc;

create or replace view public.leaderboard_month as
select *
from public.public_punchlines
where created_at >= date_trunc('month', now())
order by score desc, created_at desc;

create or replace view public.my_reactions as
select
  id,
  punchline_id,
  reaction_type,
  score_value,
  created_at,
  updated_at
from public.reactions
where user_id = auth.uid();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.punchlines enable row level security;
alter table public.reactions enable row level security;
alter table public.supernotes enable row level security;
alter table public.follows enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.app_settings enable row level security;

create policy profiles_select_own_or_staff
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_moderator_or_admin());

create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_admin_update
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy categories_public_select
on public.categories for select
to anon, authenticated
using (is_active = true or public.is_moderator_or_admin());

create policy categories_admin_all
on public.categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy daily_challenges_public_select
on public.daily_challenges for select
to anon, authenticated
using (is_active = true or public.is_moderator_or_admin());

create policy daily_challenges_admin_all
on public.daily_challenges for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy punchlines_public_select_published
on public.punchlines for select
to anon, authenticated
using (status = 'published');

create policy punchlines_author_select_own
on public.punchlines for select
to authenticated
using (author_id = auth.uid());

create policy punchlines_staff_select
on public.punchlines for select
to authenticated
using (public.is_moderator_or_admin());

create policy reactions_select_own
on public.reactions for select
to authenticated
using (user_id = auth.uid());

create policy supernotes_select_own
on public.supernotes for select
to authenticated
using (user_id = auth.uid());

create policy follows_public_select
on public.follows for select
to anon, authenticated
using (true);

create policy follows_insert_own
on public.follows for insert
to authenticated
with check (follower_id = auth.uid() and follower_id <> following_id);

create policy follows_delete_own
on public.follows for delete
to authenticated
using (follower_id = auth.uid());

create policy reports_insert_own
on public.reports for insert
to authenticated
with check (reporter_id = auth.uid());

create policy reports_select_own_or_staff
on public.reports for select
to authenticated
using (reporter_id = auth.uid() or public.is_moderator_or_admin());

create policy reports_staff_update
on public.reports for update
to authenticated
using (public.is_moderator_or_admin())
with check (public.is_moderator_or_admin());

create policy moderation_actions_staff_select
on public.moderation_actions for select
to authenticated
using (public.is_moderator_or_admin());

create policy moderation_actions_staff_insert
on public.moderation_actions for insert
to authenticated
with check (admin_id = auth.uid() and public.is_moderator_or_admin());

create policy app_settings_public_select
on public.app_settings for select
to anon, authenticated
using (true);

create policy app_settings_admin_all
on public.app_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on public.public_profiles to anon, authenticated;
grant select on public.public_punchlines to anon, authenticated;
grant select on public.feed_recent to anon, authenticated;
grant select on public.leaderboard_day to anon, authenticated;
grant select on public.leaderboard_week to anon, authenticated;
grant select on public.leaderboard_month to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.daily_challenges to anon, authenticated;
grant select on public.punchlines to anon, authenticated;
grant select on public.app_settings to anon, authenticated;

grant select on public.profiles to authenticated;
grant insert (id, pseudo, bio) on public.profiles to authenticated;
grant update (pseudo, bio) on public.profiles to authenticated;
grant select on public.reactions to authenticated;
grant select on public.supernotes to authenticated;
grant select on public.follows to authenticated;
grant insert (follower_id, following_id) on public.follows to authenticated;
grant delete on public.follows to authenticated;
grant select on public.reports to authenticated;
grant insert (punchline_id, reporter_id, reason, details) on public.reports to authenticated;
grant update (status, reviewed_at, reviewed_by) on public.reports to authenticated;
grant select on public.moderation_actions to authenticated;
grant insert (admin_id, punchline_id, target_user_id, action, reason) on public.moderation_actions to authenticated;
grant select on public.my_reactions to authenticated;
grant insert, update, delete on public.app_settings to authenticated;

grant execute on function public.reunion_today() to anon, authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_is_banned() to authenticated;
grant execute on function public.is_moderator_or_admin() to anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.reaction_score(text) to authenticated;
grant execute on function public.create_or_update_profile(text, text) to authenticated;
grant execute on function public.create_punchline(text, uuid, uuid) to authenticated;
grant execute on function public.cast_reaction(uuid, text) to authenticated;
grant execute on function public.give_supernote(uuid) to authenticated;
grant execute on function public.follow_user(uuid) to authenticated;
grant execute on function public.unfollow_user(uuid) to authenticated;
grant execute on function public.report_punchline(uuid, text, text) to authenticated;
grant execute on function public.moderate_punchline(uuid, text, text) to authenticated;
grant execute on function public.moderate_user(uuid, text, text) to authenticated;
