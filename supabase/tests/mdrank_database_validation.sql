begin;

set local role postgres;

create extension if not exists pgtap;

select plan(120);

create or replace function pg_temp.set_test_user(user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', user_id::text, true);
end;
$$;

grant execute on function pg_temp.set_test_user(uuid) to authenticated;

create or replace function pg_temp.assert_true(condition boolean, message text)
returns text
language plpgsql
as $$
begin
  return ok(coalesce(condition, false), message);
end;
$$;

grant execute on function pg_temp.assert_true(boolean, text) to authenticated;

create or replace function pg_temp.assert_raises(statement text, message text)
returns text
language plpgsql
as $$
begin
  execute statement;
  return fail(message);
exception
  when others then
    return pass(message);
end;
$$;

grant execute on function pg_temp.assert_raises(text, text) to authenticated;

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) values
  ('00000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'author@mdrank.test', crypt('password', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'voter@mdrank.test', crypt('password', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000103', 'authenticated', 'authenticated', 'third@mdrank.test', crypt('password', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000104', 'authenticated', 'authenticated', 'moderator@mdrank.test', crypt('password', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000105', 'authenticated', 'authenticated', 'admin@mdrank.test', crypt('password', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000106', 'authenticated', 'authenticated', 'banned@mdrank.test', crypt('password', gen_salt('bf')), now(), now(), now());

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000101');
select public.create_or_update_profile('Auteur974', 'Auteur de test');
select pg_temp.assert_true(
  exists (select 1 from public.profiles where pseudo = 'Auteur974' and pseudo_normalized = 'auteur974'),
  'profile creation normalizes pseudo'
);

select pg_temp.assert_raises(
  $$select public.create_or_update_profile('ab', null)$$,
  'pseudo too short'
);

select pg_temp.assert_raises(
  $$select public.create_or_update_profile('abcdefghijklmnopqrstuvwxyz', null)$$,
  'pseudo too long'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000102');
select public.create_or_update_profile('Voter974', null);

select pg_temp.assert_raises(
  $$select public.create_or_update_profile('aUtEuR974', null)$$,
  'duplicate pseudo with different case'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000103');
select public.create_or_update_profile('Third974', null);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000104');
select public.create_or_update_profile('Modo974', null);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000105');
select public.create_or_update_profile('Admin974', null);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000106');
select public.create_or_update_profile('Banned974', null);

set local role postgres;
update public.profiles set role = 'moderator' where id = '00000000-0000-0000-0000-000000000104';
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-000000000105';
update public.profiles set is_banned = true where id = '00000000-0000-0000-0000-000000000106';

select set_config('mdrank.category_id', (select id::text from public.categories where slug = 'punchline'), true);
select set_config('mdrank.challenge_category_id', (select id::text from public.categories where slug = 'defi-du-jour'), true);

insert into public.daily_challenges (id, title, description, challenge_date, is_active, created_at)
values
  (
    '00000000-0000-0000-0000-000000000501',
    'Ancien défi actif',
    'Ancien sujet à ne pas mélanger.',
    public.reunion_today() - 10,
    true,
    now() - interval '10 days'
  ),
  (
    '00000000-0000-0000-0000-000000000502',
    'Futur défi actif',
    'Sujet planifié à ne pas afficher avant sa date.',
    public.reunion_today() + 1,
    true,
    now() + interval '1 day'
  );

select set_config('mdrank.old_challenge_id', '00000000-0000-0000-0000-000000000501', true);
select set_config('mdrank.challenge_id', public.current_daily_challenge_id()::text, true);

select pg_temp.assert_true(
  current_setting('mdrank.challenge_id')::uuid is not null
    and current_setting('mdrank.challenge_id')::uuid is distinct from current_setting('mdrank.old_challenge_id')::uuid
    and current_setting('mdrank.challenge_id')::uuid is distinct from '00000000-0000-0000-0000-000000000502'::uuid,
  'current daily challenge ignores older and future active challenges'
);

select pg_temp.assert_true(
  (select count(*) from public.categories where slug in ('ta-mere', 'punchline', 'absurde', 'roast', 'vie-quotidienne', 'defi-du-jour')) = 6,
  'V1 categories exist'
);

select pg_temp.assert_true(
  (select count(*) from public.app_settings where key in ('max_punchline_length', 'min_punchline_length', 'supernote_per_day')) = 3,
  'MVP settings exist'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000101');

create temporary table last_create_result as
select public.create_punchline(
  'Une punchline de test assez courte.',
  current_setting('mdrank.category_id')::uuid,
  null
) as result;

select set_config(
  'mdrank.punchline_id',
  (select result #>> '{punchline,id}' from last_create_result),
  true
);

select pg_temp.assert_true(
  (
    select result->'unlocked_badges' @> '[{"slug":"premier-mdr"}]'::jsonb
    from last_create_result
  ),
  'create punchline returns newly unlocked badges'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.check_and_award_badges_for_user('00000000-0000-0000-0000-000000000101'::uuid)
  ),
  'badge check only returns newly inserted badges'
);

drop table last_create_result;

select pg_temp.assert_true(
  exists (
    select 1
    from public.public_user_badges
    where user_id = '00000000-0000-0000-0000-000000000101'
      and slug = 'premier-mdr'
  ),
  'first published punchline awards premier MDR badge'
);

select public.create_punchline('Deuxième punchline de test.',
  current_setting('mdrank.category_id')::uuid,
  null
);
select public.create_punchline('Troisième punchline de test.',
  current_setting('mdrank.category_id')::uuid,
  null
);
select public.create_punchline('Quatrième punchline de test.',
  current_setting('mdrank.category_id')::uuid,
  null
);
select public.create_punchline('Cinquième punchline de test.',
  current_setting('mdrank.category_id')::uuid,
  null
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.public_user_badges
    where user_id = '00000000-0000-0000-0000-000000000101'
      and slug = 'machine-a-vannes-1'
  ),
  'five published punchlines award machine a vannes I badge'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.public_user_badges
    where user_id = '00000000-0000-0000-0000-000000000101'
      and slug = 'machine-a-vannes-2'
  ),
  'twenty-five punchline badge is not awarded too early'
);

select pg_temp.assert_raises(
  format(
    $$select public.create_punchline('no', %L::uuid, null)$$,
    current_setting('mdrank.category_id')::uuid
  ),
  'punchline too short'
);

select pg_temp.assert_raises(
  format(
    $$select public.create_punchline(%L, %L::uuid, null)$$,
    repeat('x', 181),
    current_setting('mdrank.category_id')::uuid
  ),
  'punchline too long'
);

set local role postgres;
update public.categories set is_active = false where id = current_setting('mdrank.category_id')::uuid;
select pg_temp.set_test_user('00000000-0000-0000-0000-000000000101');
select pg_temp.assert_raises(
  format(
    $$select public.create_punchline('Catégorie inactive test', %L::uuid, null)$$,
    current_setting('mdrank.category_id')::uuid
  ),
  'inactive category refused'
);

set local role postgres;
update public.categories set is_active = true where id = current_setting('mdrank.category_id')::uuid;
select pg_temp.set_test_user('00000000-0000-0000-0000-000000000106');
select pg_temp.assert_raises(
  format(
    $$select public.create_punchline('Banni ne peut pas publier', %L::uuid, null)$$,
    current_setting('mdrank.category_id')::uuid
  ),
  'banned user cannot publish'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000102');
select public.cast_reaction(current_setting('mdrank.punchline_id')::uuid, 'funny');
select pg_temp.assert_true(
  (
    select score = 1 and funny_count = 1
    from public.punchlines
    where id = current_setting('mdrank.punchline_id')::uuid
  ),
  'funny reaction adds one point'
);
select pg_temp.assert_true(
  (
    select score_value = 1
    from public.reactions
    where user_id = '00000000-0000-0000-0000-000000000102'
      and punchline_id = current_setting('mdrank.punchline_id')::uuid
  ),
  'funny reaction stores official score value'
);

select public.cast_reaction(current_setting('mdrank.punchline_id')::uuid, 'crazy');
select pg_temp.assert_true(
  (
    select score = 2 and funny_count = 0 and crazy_count = 1
    from public.punchlines
    where id = current_setting('mdrank.punchline_id')::uuid
  ),
  'changing reaction to crazy updates score'
);

select public.cast_reaction(current_setting('mdrank.punchline_id')::uuid, 'heavy');
select pg_temp.assert_true(
  (
    select score = 3 and funny_count = 0 and heavy_count = 1
    from public.punchlines
    where id = current_setting('mdrank.punchline_id')::uuid
  ),
  'changing reaction to heavy updates score'
);

select public.cast_reaction(current_setting('mdrank.punchline_id')::uuid, 'killer');
select pg_temp.assert_true(
  (
    select score = 4 and heavy_count = 0 and killer_count = 1
    from public.punchlines
    where id = current_setting('mdrank.punchline_id')::uuid
  ),
  'changing reaction to killer updates score'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.public_user_badges
    where user_id = '00000000-0000-0000-0000-000000000101'
      and slug = 'killer-1'
  ),
  'first killer reaction received awards killer I badge'
);

select public.cast_reaction(current_setting('mdrank.punchline_id')::uuid, 'not_funny');
select pg_temp.assert_true(
  (
    select score = -1 and killer_count = 0 and not_funny_count = 1
    from public.punchlines
    where id = current_setting('mdrank.punchline_id')::uuid
  ),
  'changing reaction to not funny updates score'
);

select public.cast_reaction(current_setting('mdrank.punchline_id')::uuid, 'killer');
select pg_temp.assert_true(
  (
    select score = 4 and not_funny_count = 0 and killer_count = 1
    from public.punchlines
    where id = current_setting('mdrank.punchline_id')::uuid
  ),
  'killer reaction is best normal reaction'
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.reactions
    where user_id = '00000000-0000-0000-0000-000000000102'
      and punchline_id = current_setting('mdrank.punchline_id')::uuid
  ),
  'one normal reaction per user and punchline'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000101');
select pg_temp.assert_raises(
  format(
    $$select public.cast_reaction(%L::uuid, 'funny')$$,
    current_setting('mdrank.punchline_id')::uuid
  ),
  'author cannot react to own punchline'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000103');
select public.give_supernote(current_setting('mdrank.punchline_id')::uuid);
select pg_temp.assert_true(
  (select score = 10 and supernote_count = 1 from public.punchlines where id = current_setting('mdrank.punchline_id')::uuid),
  'supernote adds six points and stacks with normal reaction'
);
select pg_temp.assert_true(
  (
    select score_value = 6
    from public.supernotes
    where user_id = '00000000-0000-0000-0000-000000000103'
      and punchline_id = current_setting('mdrank.punchline_id')::uuid
  ),
  'supernote stores official score value'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.public_user_badges
    where user_id = '00000000-0000-0000-0000-000000000101'
      and slug = 'supernote-1'
  ),
  'first supernote received awards supernote I badge'
);

select pg_temp.assert_raises(
  format(
    $$select public.give_supernote(%L::uuid)$$,
    current_setting('mdrank.punchline_id')::uuid
  ),
  'one supernote per day'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000101');
select pg_temp.assert_raises(
  format(
    $$select public.give_supernote(%L::uuid)$$,
    current_setting('mdrank.punchline_id')::uuid
  ),
  'author cannot supernote own punchline'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000106');
select pg_temp.assert_raises(
  format(
    $$select public.cast_reaction(%L::uuid, 'crazy')$$,
    current_setting('mdrank.punchline_id')::uuid
  ),
  'banned user cannot react'
);
select pg_temp.assert_raises(
  format(
    $$select public.give_supernote(%L::uuid)$$,
    current_setting('mdrank.punchline_id')::uuid
  ),
  'banned user cannot supernote'
);
select pg_temp.assert_raises(
  $$select public.follow_user('00000000-0000-0000-0000-000000000101')$$,
  'banned user cannot follow'
);

set local role authenticated;
select pg_temp.assert_raises(
  $$insert into public.follows (follower_id, following_id) values ('00000000-0000-0000-0000-000000000106'::uuid, '00000000-0000-0000-0000-000000000101'::uuid)$$,
  'RLS blocks banned direct follow insert'
);
select pg_temp.assert_raises(
  format(
    $$insert into public.reports (punchline_id, reporter_id, reason) values (%L::uuid, '00000000-0000-0000-0000-000000000106'::uuid, 'spam')$$,
    current_setting('mdrank.punchline_id')::uuid
  ),
  'RLS blocks banned direct report insert'
);
set local role postgres;

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000102');
set local role authenticated;
insert into public.follows (follower_id, following_id)
values ('00000000-0000-0000-0000-000000000102'::uuid, '00000000-0000-0000-0000-000000000101'::uuid);
select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.follows
    where follower_id = '00000000-0000-0000-0000-000000000102'
      and following_id = '00000000-0000-0000-0000-000000000101'
  ),
  'RLS allows direct follow insert for active profiles'
);
set local role postgres;
select public.follow_user('00000000-0000-0000-0000-000000000101');
select public.follow_user('00000000-0000-0000-0000-000000000101');
select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.follows
    where follower_id = '00000000-0000-0000-0000-000000000102'
      and following_id = '00000000-0000-0000-0000-000000000101'
  ),
  'follow is idempotent'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.get_following_feed(20)
    where id = current_setting('mdrank.punchline_id')::uuid
  ),
  'following feed includes followed author punchline'
);
select pg_temp.assert_true(
  (
    select following_count = 1
      and followers_count = 0
      and punchline_count = 0
      and score_mdr = 0
      and supernote_received_count = 0
      and best_punchline_id is null
      and best_punchline_content is null
      and best_punchline_score is null
    from public.get_my_profile_counts()
  ),
  'empty profile V1 stats are returned cleanly'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000102');
select pg_temp.assert_raises(
  format(
    $$select public.create_punchline('Défi sans identifiant actif.', %L::uuid, null)$$,
    current_setting('mdrank.challenge_category_id')::uuid
  ),
  'challenge category without challenge id is refused'
);
select pg_temp.assert_raises(
  format(
    $$select public.create_punchline('Mauvaise catégorie pour défi.', %L::uuid, %L::uuid)$$,
    current_setting('mdrank.category_id')::uuid,
    current_setting('mdrank.challenge_id')::uuid
  ),
  'challenge id with normal category is refused'
);
select pg_temp.assert_raises(
  format(
    $$select public.create_punchline('Ancien défi refusé.', %L::uuid, %L::uuid)$$,
    current_setting('mdrank.challenge_category_id')::uuid,
    current_setting('mdrank.old_challenge_id')::uuid
  ),
  'historical challenge is not accepted as current daily challenge'
);

set local role postgres;
update public.daily_challenges set is_active = false;
select pg_temp.assert_true(
  public.current_daily_challenge_id() is null,
  'no active daily challenge returns null current challenge'
);
select pg_temp.set_test_user('00000000-0000-0000-0000-000000000102');
select pg_temp.assert_raises(
  format(
    $$select public.create_punchline('Aucun défi actif refusé.', %L::uuid, %L::uuid)$$,
    current_setting('mdrank.challenge_category_id')::uuid,
    current_setting('mdrank.challenge_id')::uuid
  ),
  'publishing to challenge is refused when no challenge is active'
);

set local role postgres;
update public.daily_challenges set is_active = true;
select pg_temp.set_test_user('00000000-0000-0000-0000-000000000102');

select public.create_punchline(
  'Participation au défi du jour en une phrase.',
  current_setting('mdrank.challenge_category_id')::uuid,
  current_setting('mdrank.challenge_id')::uuid
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.public_punchlines
    where author_id = '00000000-0000-0000-0000-000000000102'
      and challenge_id = current_setting('mdrank.challenge_id')::uuid
      and content = 'Participation au défi du jour en une phrase.'
  ),
  'daily challenge participation is linked to the current user and challenge'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.public_user_badges
    where user_id = '00000000-0000-0000-0000-000000000102'
      and slug = 'defi-du-jour'
  ),
  'daily challenge punchline awards defi du jour badge'
);
select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.user_badges ub
    join public.badges b on b.id = ub.badge_id
    where ub.user_id = '00000000-0000-0000-0000-000000000102'
      and b.slug = 'defi-du-jour'
  ),
  'daily challenge badge is awarded once after first participation'
);

select public.create_punchline(
  'Deuxième participation au défi autorisée.',
  current_setting('mdrank.challenge_category_id')::uuid,
  current_setting('mdrank.challenge_id')::uuid
);
select pg_temp.assert_true(
  (
    select count(*) = 2
    from public.public_punchlines
    where author_id = '00000000-0000-0000-0000-000000000102'
      and challenge_id = current_setting('mdrank.challenge_id')::uuid
  )
  and (
    select count(*) = 1
    from public.user_badges ub
    join public.badges b on b.id = ub.badge_id
    where ub.user_id = '00000000-0000-0000-0000-000000000102'
      and b.slug = 'defi-du-jour'
  ),
  'multiple daily challenge participations are allowed without duplicating badge'
);

insert into public.punchlines (author_id, category_id, challenge_id, content, status, score)
values (
  '00000000-0000-0000-0000-000000000102',
  current_setting('mdrank.challenge_category_id')::uuid,
  current_setting('mdrank.old_challenge_id')::uuid,
  'Participation historique isolée.',
  'published',
  99
);
select pg_temp.assert_true(
  not exists (
    select 1
    from public.public_punchlines
    where challenge_id = current_setting('mdrank.challenge_id')::uuid
      and content = 'Participation historique isolée.'
  ),
  'current challenge participation query does not mix historical challenge rows'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000101');
select pg_temp.assert_true(
  (
    select score_mdr = 10
      and punchline_count = 5
      and supernote_received_count = 1
      and best_punchline_id = current_setting('mdrank.punchline_id')::uuid
      and best_punchline_content = 'Une punchline de test assez courte.'
      and best_punchline_score = 10
    from public.get_my_profile_counts()
  ),
  'profile V1 stats include score, punchlines, supernotes and best punchline'
);

select pg_temp.assert_true(
  (
    select published_count = 5
      and killer_received_count = 1
      and supernote_received_count = 1
      and challenge_punchline_count = 0
    from public.get_my_badge_progress_counts()
  ),
  'badge progress counters are returned for current user'
);
select pg_temp.set_test_user('00000000-0000-0000-0000-000000000102');

set local role postgres;

insert into public.punchlines (author_id, category_id, content, status)
select
  '00000000-0000-0000-0000-000000000105'::uuid,
  current_setting('mdrank.category_id')::uuid,
  'Seuil publication test ' || gs,
  'published'
from generate_series(1, 25) gs;

create temporary table posting_25_badges as
select *
from public.check_and_award_badges_for_user('00000000-0000-0000-0000-000000000105'::uuid);

select pg_temp.assert_true(
  (
    select array_agg(slug order by slug) = array['machine-a-vannes-1', 'machine-a-vannes-2', 'premier-mdr']
    from posting_25_badges
  ),
  'twenty-five published punchlines return only newly unlocked posting badges'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.check_and_award_badges_for_user('00000000-0000-0000-0000-000000000105'::uuid)
  ),
  'rechecking posting thresholds returns no already owned badges'
);

insert into public.punchlines (author_id, category_id, content, status)
select
  '00000000-0000-0000-0000-000000000105'::uuid,
  current_setting('mdrank.category_id')::uuid,
  'Seuil cent publications test ' || gs,
  'published'
from generate_series(26, 100) gs;

create temporary table posting_100_badges as
select *
from public.check_and_award_badges_for_user('00000000-0000-0000-0000-000000000105'::uuid);

select pg_temp.assert_true(
  (
    select array_agg(slug order by slug) = array['machine-a-vannes-3']
    from posting_100_badges
  ),
  'one hundred published punchlines return machine a vannes III as newly unlocked'
);

select pg_temp.assert_true(
  (
    select count(*) = count(distinct badge_id)
    from public.user_badges
    where user_id = '00000000-0000-0000-0000-000000000105'
  ),
  'posting threshold checks keep one row per earned badge'
);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
select
  ('10000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid,
  'authenticated',
  'authenticated',
  'killer-voter-' || gs || '@mdrank.test',
  crypt('password', gen_salt('bf')),
  now(),
  now(),
  now()
from generate_series(1, 50) gs;

insert into public.profiles (id, pseudo, pseudo_normalized)
select
  ('10000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid,
  'KVoter' || gs,
  'kvoter' || gs
from generate_series(1, 50) gs;

insert into public.punchlines (id, author_id, category_id, content, status)
values (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000104',
  current_setting('mdrank.category_id')::uuid,
  'Punchline pour seuils killer.',
  'published'
);

insert into public.reactions (punchline_id, user_id, reaction_type, score_value)
select
  '00000000-0000-0000-0000-000000000301'::uuid,
  ('10000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid,
  'killer',
  4
from generate_series(1, 50) gs;

create temporary table killer_50_badges as
select *
from public.check_and_award_badges_for_user('00000000-0000-0000-0000-000000000104'::uuid);

select pg_temp.assert_true(
  (
    select array_agg(slug order by slug) = array['killer-1', 'killer-2', 'killer-3', 'premier-mdr']
    from killer_50_badges
  ),
  'fifty killer reactions can return multiple newly unlocked badges cleanly'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.check_and_award_badges_for_user('00000000-0000-0000-0000-000000000104'::uuid)
  ),
  'rechecking killer thresholds returns no already owned badges'
);

update public.punchlines
set status = 'hidden'
where id = '00000000-0000-0000-0000-000000000301';

select pg_temp.assert_true(
  not exists (
    select 1
    from public.public_punchlines
    where id = '00000000-0000-0000-0000-000000000301'
  ),
  'hidden killer badge source is absent from public punchlines'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.public_user_badges
    where user_id = '00000000-0000-0000-0000-000000000104'
      and slug = 'killer-3'
  ),
  'badges already earned from hidden content are not revoked'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000104');
select pg_temp.assert_true(
  (
    select published_count = 0
      and killer_received_count = 0
    from public.get_my_badge_progress_counts()
  ),
  'badge progress excludes hidden punchlines while earned badges remain'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000102');

set local role postgres;
insert into public.punchlines (
  id,
  author_id,
  category_id,
  content,
  score,
  supernote_count,
  created_at
) values
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000101',
    current_setting('mdrank.category_id')::uuid,
    'Leaderboard tie older low stars',
    20,
    1,
    now() - interval '2 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000102',
    current_setting('mdrank.category_id')::uuid,
    'Leaderboard tie older high stars',
    20,
    3,
    now() - interval '3 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000103',
    current_setting('mdrank.category_id')::uuid,
    'Leaderboard tie newer high stars',
    20,
    3,
    now() - interval '1 minute'
  );

select pg_temp.assert_true(
  (
    select array_agg(id order by score desc, supernote_count desc, created_at desc) = array[
      '00000000-0000-0000-0000-000000000203'::uuid,
      '00000000-0000-0000-0000-000000000202'::uuid,
      '00000000-0000-0000-0000-000000000201'::uuid
    ]
    from (
      select id, score, supernote_count, created_at
      from public.leaderboard_day
      where id in (
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000202',
        '00000000-0000-0000-0000-000000000203'
      )
    ) ranked
  ),
  'leaderboard ties use supernotes then recency'
);

select pg_temp.assert_true(
  (
    select score_mdr = 30
      and punchline_count = 6
      and supernote_received_count = 2
    from public.leaderboard_users
    where author_id = '00000000-0000-0000-0000-000000000101'
  ),
  'user leaderboard sums published punchline scores and supernotes'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('leaderboard_day', 'leaderboard_week', 'leaderboard_month', 'leaderboard_users')
      and column_name in ('email', 'user_id', 'reporter_id', 'reviewed_by', 'report_count', 'status')
  ),
  'leaderboard views do not expose internal columns'
);

update public.punchlines
set status = 'hidden'
where id = '00000000-0000-0000-0000-000000000203';

select pg_temp.assert_true(
  not exists (
    select 1
    from public.leaderboard_day
    where id = '00000000-0000-0000-0000-000000000203'
  ),
  'hidden punchline is absent from leaderboard'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.leaderboard_users
    where author_id = '00000000-0000-0000-0000-000000000103'
  ),
  'hidden punchlines are absent from user leaderboard totals'
);

select pg_temp.assert_true(
  (
    select score_mdr = 30
    from public.leaderboard_users
    where author_id = '00000000-0000-0000-0000-000000000101'
  ),
  'profile score and user leaderboard use the same published score source'
);

insert into public.punchlines (id, author_id, category_id, content, status)
values (
  '00000000-0000-0000-0000-000000000401',
  '10000000-0000-0000-0000-000000000001',
  current_setting('mdrank.category_id')::uuid,
  'Score MDR scenario A sans reaction.',
  'published'
);

select pg_temp.set_test_user('10000000-0000-0000-0000-000000000001');
select pg_temp.assert_true(
  (
    select p.score = 0
      and stats.score_mdr = 0
    from public.punchlines p
    cross join public.get_my_profile_counts() stats
    where p.id = '00000000-0000-0000-0000-000000000401'
  ),
  'score scenario A stays zero for punchline and profile'
);

insert into public.punchlines (id, author_id, category_id, content, status)
values (
  '00000000-0000-0000-0000-000000000402',
  '10000000-0000-0000-0000-000000000002',
  current_setting('mdrank.category_id')::uuid,
  'Score MDR scenario B avec funny.',
  'published'
);

insert into public.reactions (punchline_id, user_id, reaction_type, score_value)
values (
  '00000000-0000-0000-0000-000000000402',
  '10000000-0000-0000-0000-000000000003',
  'funny',
  1
);

select pg_temp.set_test_user('10000000-0000-0000-0000-000000000002');
select pg_temp.assert_true(
  (
    select p.score = 1
      and stats.score_mdr = 1
    from public.punchlines p
    cross join public.get_my_profile_counts() stats
    where p.id = '00000000-0000-0000-0000-000000000402'
  ),
  'score scenario B counts one funny as one point everywhere'
);

insert into public.punchlines (id, author_id, category_id, content, status)
values (
  '00000000-0000-0000-0000-000000000403',
  '10000000-0000-0000-0000-000000000002',
  current_setting('mdrank.category_id')::uuid,
  'Score MDR scenario C vaut treize.',
  'published'
);

insert into public.reactions (punchline_id, user_id, reaction_type, score_value)
values
  ('00000000-0000-0000-0000-000000000403', '10000000-0000-0000-0000-000000000003', 'funny', 1),
  ('00000000-0000-0000-0000-000000000403', '10000000-0000-0000-0000-000000000004', 'funny', 1),
  ('00000000-0000-0000-0000-000000000403', '10000000-0000-0000-0000-000000000005', 'crazy', 2),
  ('00000000-0000-0000-0000-000000000403', '10000000-0000-0000-0000-000000000006', 'killer', 4),
  ('00000000-0000-0000-0000-000000000403', '10000000-0000-0000-0000-000000000007', 'not_funny', -1);

insert into public.supernotes (punchline_id, user_id, score_value)
values (
  '00000000-0000-0000-0000-000000000403',
  '10000000-0000-0000-0000-000000000008',
  6
);

select pg_temp.assert_true(
  (
    select p.score = 13
      and p.funny_count = 2
      and p.crazy_count = 1
      and p.killer_count = 1
      and p.supernote_count = 1
      and p.not_funny_count = 1
      and public.calculate_mdr_score(2, 1, 0, 1, 1, 1) = 13
      and stats.score_mdr = 14
    from public.punchlines p
    cross join public.get_my_profile_counts() stats
    where p.id = '00000000-0000-0000-0000-000000000403'
  ),
  'score scenario C gives thirteen and profile total uses same score source'
);

insert into public.punchlines (id, author_id, category_id, content, status, score, supernote_count, created_at)
values
  (
    '00000000-0000-0000-0000-000000000404',
    '10000000-0000-0000-0000-000000000001',
    current_setting('mdrank.category_id')::uuid,
    'Score MDR scenario D punchline A.',
    'published',
    20,
    1,
    now() - interval '1 minute'
  ),
  (
    '00000000-0000-0000-0000-000000000405',
    '10000000-0000-0000-0000-000000000001',
    current_setting('mdrank.category_id')::uuid,
    'Score MDR scenario D punchline B.',
    'published',
    8,
    0,
    now() - interval '2 minutes'
  );

select pg_temp.set_test_user('10000000-0000-0000-0000-000000000001');
select pg_temp.assert_true(
  (
    select stats.score_mdr = 28
      and stats.best_punchline_id = '00000000-0000-0000-0000-000000000404'
      and lu.score_mdr = 28
    from public.get_my_profile_counts() stats
    join public.leaderboard_users lu on lu.author_id = '10000000-0000-0000-0000-000000000001'
  ),
  'score scenario D aligns profile total, top blagueurs and best punchline'
);

select pg_temp.assert_true(
  (
    select array_agg(id order by score desc, supernote_count desc, created_at desc) = array[
      '00000000-0000-0000-0000-000000000404'::uuid,
      '00000000-0000-0000-0000-000000000405'::uuid
    ]
    from public.leaderboard_day
    where id in (
      '00000000-0000-0000-0000-000000000404',
      '00000000-0000-0000-0000-000000000405'
    )
  ),
  'score scenario D top punchlines ranks A before B'
);

insert into public.punchlines (id, author_id, category_id, content, status)
values (
  '00000000-0000-0000-0000-000000000406',
  '10000000-0000-0000-0000-000000000002',
  current_setting('mdrank.category_id')::uuid,
  'Score MDR scenario E negatif.',
  'published'
);

insert into public.reactions (punchline_id, user_id, reaction_type, score_value)
values
  ('00000000-0000-0000-0000-000000000406', '10000000-0000-0000-0000-000000000003', 'not_funny', -1),
  ('00000000-0000-0000-0000-000000000406', '10000000-0000-0000-0000-000000000004', 'not_funny', -1);

select pg_temp.assert_true(
  (
    select score = -2
    from public.punchlines
    where id = '00000000-0000-0000-0000-000000000406'
  ),
  'score scenario E keeps negative score'
);

insert into public.punchlines (id, author_id, category_id, content, status, score, supernote_count, created_at)
values
  (
    '00000000-0000-0000-0000-000000000407',
    '10000000-0000-0000-0000-000000000001',
    current_setting('mdrank.category_id')::uuid,
    'Score MDR tie avec moins de SuperNotes.',
    'published',
    20,
    0,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000408',
    '10000000-0000-0000-0000-000000000001',
    current_setting('mdrank.category_id')::uuid,
    'Score MDR tie avec plus de SuperNotes.',
    'published',
    20,
    2,
    now() - interval '1 minute'
  );

select pg_temp.assert_true(
  (
    select best_punchline_id = '00000000-0000-0000-0000-000000000408'
    from public.get_my_profile_counts()
  ),
  'best punchline tie uses supernotes before recency like top punchlines'
);

update public.punchlines
set status = 'hidden'
where id = '00000000-0000-0000-0000-000000000408';

select pg_temp.assert_true(
  (
    select score_mdr = 48
      and best_punchline_id = '00000000-0000-0000-0000-000000000404'
    from public.get_my_profile_counts()
  ),
  'hidden punchline no longer contributes to public profile score'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.public_punchlines
    where id = '00000000-0000-0000-0000-000000000408'
  )
  and not exists (
    select 1
    from public.feed_recent
    where id = '00000000-0000-0000-0000-000000000408'
  )
  and not exists (
    select 1
    from public.leaderboard_day
    where id = '00000000-0000-0000-0000-000000000408'
  ),
  'hidden best punchline is removed from public feed and top punchlines'
);

select pg_temp.assert_true(
  (
    select score_mdr = 48
    from public.leaderboard_users
    where author_id = '10000000-0000-0000-0000-000000000001'
  ),
  'profile score and top blagueurs stay aligned after hiding best punchline'
);

select pg_temp.set_test_user('10000000-0000-0000-0000-000000000009');
select pg_temp.assert_raises(
  $$select public.cast_reaction('00000000-0000-0000-0000-000000000408'::uuid, 'funny')$$,
  'cannot react to hidden punchline'
);
select pg_temp.assert_raises(
  $$select public.give_supernote('00000000-0000-0000-0000-000000000408'::uuid)$$,
  'cannot supernote hidden punchline'
);

update public.punchlines
set status = 'hidden'
where author_id = '00000000-0000-0000-0000-000000000102'
  and challenge_id = current_setting('mdrank.challenge_id')::uuid
  and content = 'Participation au défi du jour en une phrase.';

select pg_temp.assert_true(
  not exists (
    select 1
    from public.public_punchlines
    where author_id = '00000000-0000-0000-0000-000000000102'
      and challenge_id = current_setting('mdrank.challenge_id')::uuid
      and content = 'Participation au défi du jour en une phrase.'
  ),
  'hidden daily challenge participation is absent from public challenge query'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.public_user_badges
    where user_id = '00000000-0000-0000-0000-000000000102'
      and slug = 'defi-du-jour'
  ),
  'daily challenge badge remains after hiding one participation'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000102');

select pg_temp.assert_raises(
  $$select public.follow_user('00000000-0000-0000-0000-000000000102')$$,
  'cannot follow self'
);

select public.unfollow_user('00000000-0000-0000-0000-000000000101');
select pg_temp.assert_true(
  (
    select count(*) = 0
    from public.follows
    where follower_id = '00000000-0000-0000-0000-000000000102'
      and following_id = '00000000-0000-0000-0000-000000000101'
  ),
  'unfollow deletes follow'
);

set local role postgres;
insert into public.reports (punchline_id, reporter_id, reason, details, status)
values (
  '00000000-0000-0000-0000-000000000408',
  '00000000-0000-0000-0000-000000000102',
  'spam',
  'existing report before hidden guard',
  'pending'
);
select public.recalculate_report_count('00000000-0000-0000-0000-000000000408');
select pg_temp.set_test_user('00000000-0000-0000-0000-000000000103');
select pg_temp.assert_raises(
  $$select public.report_punchline('00000000-0000-0000-0000-000000000408'::uuid, 'spam', null)$$,
  'hidden punchline cannot receive new report'
);
select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.reports
    where punchline_id = '00000000-0000-0000-0000-000000000408'
      and details = 'existing report before hidden guard'
  ),
  'existing report on hidden punchline is preserved'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000101');
select pg_temp.assert_raises(
  format(
    $$select public.report_punchline(%L::uuid, 'spam', null)$$,
    current_setting('mdrank.punchline_id')::uuid
  ),
  'author cannot report own punchline'
);

set local role authenticated;
select pg_temp.assert_raises(
  format(
    $$insert into public.reports (punchline_id, reporter_id, reason) values (%L::uuid, '00000000-0000-0000-0000-000000000101'::uuid, 'spam')$$,
    current_setting('mdrank.punchline_id')::uuid
  ),
  'RLS blocks direct self-report insert'
);
set local role postgres;

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000102');
select public.report_punchline(current_setting('mdrank.punchline_id')::uuid, 'spam', 'test report');
select pg_temp.assert_true(
  (select report_count = 1 from public.punchlines where id = current_setting('mdrank.punchline_id')::uuid),
  'report_count increments'
);

select pg_temp.assert_raises(
  format(
    $$select public.report_punchline(%L::uuid, 'spam', null)$$,
    current_setting('mdrank.punchline_id')::uuid
  ),
  'cannot report twice'
);

select pg_temp.assert_raises(
  format(
    $$select public.report_punchline(%L::uuid, 'invalid_reason', null)$$,
    current_setting('mdrank.punchline_id')::uuid
  ),
  'invalid report reason refused'
);

select pg_temp.assert_true(
  (
    select count(*) = 0
    from public.get_pending_reports()
  ),
  'normal user cannot read global pending reports'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000104');
select pg_temp.assert_true(
  exists (
    select 1
    from public.get_pending_reports()
    where punchline_id = current_setting('mdrank.punchline_id')::uuid
      and report_reason = 'spam'
  ),
  'moderator can read pending reports'
);
select public.moderate_punchline(current_setting('mdrank.punchline_id')::uuid, 'dismiss_report', 'test dismiss');
select pg_temp.assert_true(
  not exists (
    select 1
    from public.get_pending_reports()
    where punchline_id = current_setting('mdrank.punchline_id')::uuid
  ),
  'dismiss report removes it from pending reports'
);
select public.moderate_punchline(current_setting('mdrank.punchline_id')::uuid, 'hide_punchline', 'test hide');
select pg_temp.assert_true(
  not exists (select 1 from public.feed_recent where id = current_setting('mdrank.punchline_id')::uuid),
  'hidden punchline is absent from public feed'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.moderation_actions
    where punchline_id = current_setting('mdrank.punchline_id')::uuid
      and action = 'hide_punchline'
  ),
  'punchline moderation action is logged'
);

select public.moderate_punchline(current_setting('mdrank.punchline_id')::uuid, 'restore_punchline', 'test restore');
select pg_temp.assert_raises(
  $$select public.moderate_user('00000000-0000-0000-0000-000000000103', 'ban_user', 'moderator cannot ban')$$,
  'moderator cannot ban user'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000105');
select pg_temp.assert_raises(
  $$select public.moderate_user('00000000-0000-0000-0000-000000000105', 'ban_user', 'admin cannot self ban')$$,
  'admin cannot ban self'
);
select public.moderate_user('00000000-0000-0000-0000-000000000103', 'ban_user', 'test ban');
select pg_temp.assert_true(
  (select is_banned from public.profiles where id = '00000000-0000-0000-0000-000000000103'),
  'admin can ban user'
);
select pg_temp.assert_true(
  exists (
    select 1
    from public.moderation_actions
    where target_user_id = '00000000-0000-0000-0000-000000000103'
      and action = 'ban_user'
  ),
  'user moderation action is logged'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000102');
set local role authenticated;
select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.reactions
  ),
  'authenticated user only sees own reaction rows through RLS'
);
select pg_temp.assert_true(
  (
    select count(*) = 0
    from public.supernotes
  ),
  'authenticated user cannot see other users supernotes through RLS'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('public_punchlines', 'feed_recent', 'leaderboard_day', 'leaderboard_week', 'leaderboard_month')
      and column_name in ('email', 'user_id', 'reporter_id', 'reviewed_by')
  ),
  'public feed views do not expose private identity columns'
);

set local role postgres;
select pg_temp.assert_true(
  (
    select count(*) = 11
    from public.badges
    where slug in (
      'premier-mdr',
      'machine-a-vannes-1',
      'machine-a-vannes-2',
      'machine-a-vannes-3',
      'supernote-1',
      'killer-1',
      'killer-2',
      'killer-3',
      'defi-du-jour',
      'top-semaine',
      'blagueur-du-jour'
    )
  ),
  'minimal badge seed exists'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.badges
    where category not in ('starter', 'score', 'posting', 'reaction', 'supernote', 'challenge', 'ranking', 'seasonal')
      or rarity not in ('common', 'rare', 'epic', 'legendary')
      or level < 1
  ),
  'badge taxonomy is constrained'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from (
      values
        ('premier-mdr', 'Premier MDR', 'Ta première punchline est entrée dans l’arène.', 'starter', 1, 'common', true),
        ('machine-a-vannes-1', 'Machine à vannes I', '5 punchlines publiées. Le moteur commence à chauffer.', 'posting', 1, 'common', true),
        ('machine-a-vannes-2', 'Machine à vannes II', '25 punchlines publiées. Là, ça vanne sérieusement.', 'posting', 2, 'rare', true),
        ('machine-a-vannes-3', 'Machine à vannes III', '100 punchlines publiées. La machine ne prend plus de pause.', 'posting', 3, 'epic', true),
        ('supernote-1', 'SuperNote I', 'Une punchline a reçu une SuperNote.', 'supernote', 1, 'rare', true),
        ('killer-1', 'Killer I', 'Une punchline a reçu une réaction Killer.', 'reaction', 1, 'common', true),
        ('killer-2', 'Killer II', '10 réactions Killer reçues.', 'reaction', 2, 'rare', true),
        ('killer-3', 'Killer III', '50 réactions Killer reçues.', 'reaction', 3, 'epic', true),
        ('defi-du-jour', 'Défi du jour', 'Participation au Défi du jour.', 'challenge', 1, 'rare', true),
        ('top-semaine', 'Top semaine', 'Trophée futur pour le meilleur score de la semaine.', 'ranking', 1, 'legendary', false),
        ('blagueur-du-jour', 'Blagueur du jour', 'Trophée futur pour le blagueur mis à l’honneur.', 'ranking', 1, 'legendary', false)
    ) as expected(slug, name, description, category, level, rarity, is_active)
    left join public.badges b on b.slug = expected.slug
    where b.slug is null
      or b.name is distinct from expected.name
      or b.description is distinct from expected.description
      or b.category is distinct from expected.category
      or b.level is distinct from expected.level
      or b.rarity is distinct from expected.rarity
      or b.is_active is distinct from expected.is_active
  ),
  'official V1 badge pack metadata is stable'
);

select pg_temp.assert_true(
  (select count(*) = 9 from public.badges where is_active = true),
  'official V1 exposes 9 active badges'
);

select pg_temp.assert_true(
  (
    select array_agg(slug order by slug) = array['blagueur-du-jour', 'top-semaine']
    from public.badges
    where is_active = false
  ),
  'future trophy badges are prepared but inactive'
);

insert into public.user_badges (user_id, badge_id, source_type)
select
  '00000000-0000-0000-0000-000000000101'::uuid,
  id,
  'manual'
from public.badges
where slug = 'blagueur-du-jour';

select pg_temp.assert_raises(
  $$
    insert into public.user_badges (user_id, badge_id, source_type)
    select '00000000-0000-0000-0000-000000000101'::uuid, id, 'manual'
    from public.badges
    where slug = 'blagueur-du-jour'
  $$,
  'user cannot receive the same permanent badge twice'
);

update public.badges
set is_active = false
where slug = 'top-semaine';

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000102');
set local role authenticated;
select pg_temp.assert_true(
  exists (select 1 from public.public_badges where slug = 'premier-mdr'),
  'active badges can be read publicly'
);

select pg_temp.assert_true(
  not exists (select 1 from public.public_badges where slug = 'top-semaine'),
  'inactive badges are hidden from public badges'
);

select pg_temp.assert_true(
  not exists (select 1 from public.public_badges where slug = 'blagueur-du-jour'),
  'inactive future trophy badges are hidden from public badges'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.public_user_badges
    where user_id = '00000000-0000-0000-0000-000000000101'
      and slug = 'premier-mdr'
  ),
  'public profiles can expose earned active badges'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from public.my_badges
    where user_id <> '00000000-0000-0000-0000-000000000102'
  ),
  'my_badges only returns the current user badges'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('public_badges', 'public_user_badges', 'my_badges')
      and column_name = 'email'
  ),
  'badge views do not expose email'
);

select pg_temp.assert_raises(
  $$
    insert into public.user_badges (user_id, badge_id, source_type)
    select '00000000-0000-0000-0000-000000000102'::uuid, id, 'manual'
    from public.badges
    where slug = 'premier-mdr'
  $$,
  'client cannot directly award badges'
);

select pg_temp.assert_raises(
  $$select public.award_badge_if_missing('00000000-0000-0000-0000-000000000102'::uuid, 'premier-mdr', 'manual', null)$$,
  'client cannot execute internal badge award function'
);

select pg_temp.assert_raises(
  $$select public.check_and_award_badges_for_user('00000000-0000-0000-0000-000000000102'::uuid)$$,
  'client cannot execute internal badge check function'
);

update public.badges
set rarity = 'legendary'
where slug = 'premier-mdr';

select pg_temp.assert_true(
  (
    select rarity = 'common'
    from public.badges
    where slug = 'premier-mdr'
  ),
  'client cannot directly edit badges'
);

select pg_temp.assert_raises(
  format(
    $$update public.punchlines set score = 999 where id = %L::uuid$$,
    current_setting('mdrank.punchline_id')
  ),
  'client cannot directly update punchline counters'
);

select pg_temp.assert_raises(
  $$update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-000000000102'$$,
  'client cannot make itself admin'
);

select * from finish();

rollback;
