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
