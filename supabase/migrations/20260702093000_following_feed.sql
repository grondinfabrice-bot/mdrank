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

  select * into v_profile
  from public.profiles
  where id = v_user_id;

  if v_profile.id is null then
    raise exception 'Profile required';
  end if;

  if v_profile.is_banned then
    raise exception 'User is banned';
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

create or replace function public.get_following_feed(limit_count integer default 20)
returns setof public.public_punchlines
language sql
security definer
stable
set search_path = public
as $$
  select pp.*
  from public.public_punchlines pp
  join public.follows f on f.following_id = pp.author_id
  where f.follower_id = auth.uid()
  order by pp.created_at desc
  limit greatest(1, least(coalesce(limit_count, 20), 50))
$$;

create or replace function public.get_my_profile_counts()
returns table (
  following_count bigint,
  followers_count bigint,
  punchline_count bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    (select count(*) from public.follows where follower_id = auth.uid()) as following_count,
    (select count(*) from public.follows where following_id = auth.uid()) as followers_count,
    (select count(*) from public.punchlines where author_id = auth.uid() and status = 'published') as punchline_count
$$;

grant execute on function public.follow_user(uuid) to authenticated;
grant execute on function public.unfollow_user(uuid) to authenticated;
grant execute on function public.get_following_feed(integer) to authenticated;
grant execute on function public.get_my_profile_counts() to authenticated;
