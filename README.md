# MDRank

MDRank est une app sociale humoristique mobile-first pour publier des punchlines courtes sous pseudo, réagir anonymement publiquement, donner une SuperNote rare et voir les meilleurs scores.

## MVP

- Auth Supabase
- Profil public sous pseudo
- Publication de punchlines courtes
- Feed récent réel
- Réactions réelles
- SuperNote limitée à une fois par jour
- Follow / unfollow
- Feed suivis
- Classements jour / semaine / mois
- Défi du jour
- Signalement
- Admin / modération simple

Pas de commentaires, pas de messagerie, pas de publicité, pas de monétisation, pas de pay-to-win.

## Stack

- Front statique HTML / CSS / JavaScript
- Supabase Auth
- Supabase PostgreSQL
- RPC PostgreSQL pour les règles métier
- RLS Supabase

## Configuration locale

Copier `config.example.js` vers `config.js`, puis renseigner les valeurs publiques Supabase :

```js
window.MDRANK_SUPABASE_CONFIG = {
  url: "https://VOTRE_PROJECT_REF.supabase.co",
  anonKey: "VOTRE_SUPABASE_ANON_KEY"
};
```

La clé `anon` est publique côté front. Ne jamais mettre la clé `service_role` dans `config.js`, dans le front, dans GitHub ou dans un fichier public.

## Lancer en local

```bash
cd /Users/emotionbeat/ProjetsWeb/mdrank
python3 -m http.server 4178
```

Puis ouvrir :

```text
http://localhost:4178
```

Si le port est occupé, utiliser un autre port :

```bash
python3 -m http.server 4179
```

## Vérifications front

```bash
node --check app.js
node --check mdrankApi.js
node --check auth.js
git diff --check
```

Il n'y a pas de `package.json` pour l'instant, donc pas de commande `npm run build` à lancer.

## Supabase

Commandes utiles :

```bash
supabase migration list
supabase db push
supabase test db
```

Important :

- Ne jamais lancer `supabase db reset` sur la base distante.
- Utiliser `supabase db push` pour pousser les migrations vers le projet lié.
- Garder les règles métier côté SQL/RPC.
- Ne jamais exposer la clé `service_role`.
- Tester avec au moins deux comptes normaux et un compte admin avant une bêta.

## Données minimales bêta

- Catégories V1 présentes
- Au moins un défi actif
- Un compte admin avec `profiles.role = 'admin'`
- Deux comptes utilisateurs normaux pour tester réactions, SuperNote, follow et signalement

## Tests bêta

Voir :

- `BETA_TEST_PLAN.md`
- `USER_GUIDE_BETA.md`
