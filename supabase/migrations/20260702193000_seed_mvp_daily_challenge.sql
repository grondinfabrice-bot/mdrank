insert into public.daily_challenges (title, description, challenge_date, is_active)
select 'Défi du jour', 'Fais rire en une seule phrase', date '2026-07-02', true
where not exists (
  select 1
  from public.daily_challenges
  where is_active = true
);
