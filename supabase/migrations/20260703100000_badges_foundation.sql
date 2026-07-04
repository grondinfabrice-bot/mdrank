create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  category text not null,
  level integer not null default 1,
  rarity text not null default 'common',
  icon text not null default 'badge',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint badges_slug_format_check check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint badges_category_check check (category in (
    'starter',
    'score',
    'posting',
    'reaction',
    'supernote',
    'challenge',
    'ranking',
    'seasonal'
  )),
  constraint badges_level_check check (level >= 1),
  constraint badges_rarity_check check (rarity in ('common', 'rare', 'epic', 'legendary')),
  constraint badges_icon_length_check check (char_length(icon) between 1 and 48)
);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete restrict,
  earned_at timestamptz not null default now(),
  source_type text,
  source_id uuid,
  created_at timestamptz not null default now(),
  constraint user_badges_unique_user_badge unique (user_id, badge_id),
  constraint user_badges_source_type_check check (
    source_type is null
    or source_type in (
      'manual',
      'score',
      'posting',
      'reaction',
      'supernote',
      'challenge',
      'ranking',
      'seasonal',
      'migration'
    )
  ),
  constraint user_badges_source_pair_check check (
    (source_type is null and source_id is null)
    or source_type is not null
  )
);

create trigger badges_set_updated_at
before update on public.badges
for each row execute function public.set_updated_at();

create index badges_active_category_idx on public.badges (is_active, category, level);
create index badges_rarity_idx on public.badges (rarity);
create index user_badges_user_earned_at_idx on public.user_badges (user_id, earned_at desc);
create index user_badges_badge_id_idx on public.user_badges (badge_id);
create index user_badges_source_idx on public.user_badges (source_type, source_id);

insert into public.badges (slug, name, description, category, level, rarity, icon, is_active) values
  ('premier-mdr', 'Premier MDR', 'Ta première punchline est entrée dans l’arène.', 'starter', 1, 'common', 'spark', true),
  ('machine-a-vannes-1', 'Machine à vannes I', '5 punchlines publiées. Le moteur commence à chauffer.', 'posting', 1, 'common', 'type', true),
  ('machine-a-vannes-2', 'Machine à vannes II', '25 punchlines publiées. Là, ça vanne sérieusement.', 'posting', 2, 'rare', 'type', true),
  ('machine-a-vannes-3', 'Machine à vannes III', '100 punchlines publiées. La machine ne prend plus de pause.', 'posting', 3, 'epic', 'type', true),
  ('supernote-1', 'SuperNote I', 'Une punchline a reçu une SuperNote.', 'supernote', 1, 'rare', 'star', true),
  ('killer-1', 'Killer I', 'Une punchline a reçu une réaction Killer.', 'reaction', 1, 'common', 'skull', true),
  ('killer-2', 'Killer II', '10 réactions Killer reçues.', 'reaction', 2, 'rare', 'skull', true),
  ('killer-3', 'Killer III', '50 réactions Killer reçues.', 'reaction', 3, 'epic', 'skull', true),
  ('defi-du-jour', 'Défi du jour', 'Participation au Défi du jour.', 'challenge', 1, 'rare', 'target', true),
  ('top-semaine', 'Top semaine', 'Trophée futur pour le meilleur score de la semaine.', 'ranking', 1, 'legendary', 'trophy', false),
  ('blagueur-du-jour', 'Blagueur du jour', 'Trophée futur pour le blagueur mis à l’honneur.', 'ranking', 1, 'legendary', 'sun', false)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  level = excluded.level,
  rarity = excluded.rarity,
  icon = excluded.icon,
  is_active = excluded.is_active,
  updated_at = now();

create or replace view public.public_badges as
select
  id,
  slug,
  name,
  description,
  category,
  level,
  rarity,
  icon,
  created_at
from public.badges
where is_active = true;

create or replace view public.public_user_badges as
select
  ub.id,
  ub.user_id,
  ub.badge_id,
  b.slug,
  b.name,
  b.description,
  b.category,
  b.level,
  b.rarity,
  b.icon,
  ub.earned_at,
  ub.source_type,
  ub.source_id,
  ub.created_at
from public.user_badges ub
join public.badges b on b.id = ub.badge_id
join public.profiles p on p.id = ub.user_id
where b.is_active = true
  and p.is_banned = false;

create or replace view public.my_badges as
select
  ub.id,
  ub.user_id,
  ub.badge_id,
  b.slug,
  b.name,
  b.description,
  b.category,
  b.level,
  b.rarity,
  b.icon,
  ub.earned_at,
  ub.source_type,
  ub.source_id,
  ub.created_at
from public.user_badges ub
join public.badges b on b.id = ub.badge_id
where ub.user_id = auth.uid();

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

create policy badges_public_select
on public.badges for select
to anon, authenticated
using (is_active = true or public.is_moderator_or_admin());

create policy badges_admin_all
on public.badges for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy user_badges_public_select
on public.user_badges for select
to anon, authenticated
using (
  exists (
    select 1
    from public.badges b
    join public.profiles p on p.id = user_badges.user_id
    where b.id = user_badges.badge_id
      and b.is_active = true
      and p.is_banned = false
  )
);

create policy user_badges_select_own_or_staff
on public.user_badges for select
to authenticated
using (user_id = auth.uid() or public.is_moderator_or_admin());

create policy user_badges_admin_all
on public.user_badges for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.badges to anon, authenticated;
grant insert, update, delete on public.badges to authenticated;
grant select on public.user_badges to anon, authenticated;
grant insert, update, delete on public.user_badges to authenticated;

grant select on public.public_badges to anon, authenticated;
grant select on public.public_user_badges to anon, authenticated;
grant select on public.my_badges to authenticated;
