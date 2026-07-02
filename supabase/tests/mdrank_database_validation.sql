begin;

set local role postgres;


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
returns void
language plpgsql
as $$
begin
  if not coalesce(condition, false) then
    raise exception 'ASSERTION FAILED: %', message;
  end if;
end;
$$;

grant execute on function pg_temp.assert_true(boolean, text) to authenticated;

create or replace function pg_temp.assert_raises(statement text, message text)
returns void
language plpgsql
as $$
begin
  execute statement;
  raise exception 'ASSERTION FAILED: expected error for %', message;
exception
  when others then
    if sqlerrm like 'ASSERTION FAILED:%' then
      raise;
    end if;
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

select pg_temp.assert_true(
  (select count(*) from public.categories where slug in ('ta-mere', 'punchline', 'absurde', 'roast', 'vie-quotidienne', 'defi-du-jour')) = 6,
  'V1 categories exist'
);

select pg_temp.assert_true(
  (select count(*) from public.app_settings where key in ('max_punchline_length', 'min_punchline_length', 'supernote_per_day')) = 3,
  'MVP settings exist'
);

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000101');

select set_config(
  'mdrank.punchline_id',
  (
    select id::text
    from public.create_punchline(
      'Une punchline de test assez courte.',
      current_setting('mdrank.category_id')::uuid,
      null
    )
  ),
  true
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
  (select score = 2 and funny_count = 1 from public.punchlines where id = current_setting('mdrank.punchline_id')::uuid),
  'funny reaction updates score'
);

select public.cast_reaction(current_setting('mdrank.punchline_id')::uuid, 'heavy');
select pg_temp.assert_true(
  (
    select score = 3 and funny_count = 0 and heavy_count = 1
    from public.punchlines
    where id = current_setting('mdrank.punchline_id')::uuid
  ),
  'changing reaction replaces previous reaction'
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
  (select score = 8 and supernote_count = 1 from public.punchlines where id = current_setting('mdrank.punchline_id')::uuid),
  'supernote adds five points'
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

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000102');
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

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000104');
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

select pg_temp.set_test_user('00000000-0000-0000-0000-000000000105');
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

rollback;
