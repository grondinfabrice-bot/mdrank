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

  return v_reaction;
end;
$$;

grant execute on function public.cast_reaction(uuid, text) to authenticated;
