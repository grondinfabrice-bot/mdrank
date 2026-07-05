insert into public.daily_challenges (title, description, challenge_date, is_active)
values ('Défi du jour', 'Fais rire en une seule phrase', date '2026-07-04', true)
on conflict (challenge_date) do update
set
  title = excluded.title,
  description = excluded.description,
  is_active = true;
