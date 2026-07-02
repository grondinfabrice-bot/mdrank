# MDRank

Prototype front-end mobile-first pour une app sociale humoristique de punchlines courtes.

## Lancer le prototype

Ouvrir `index.html` dans un navigateur.

Option locale :

```bash
python3 -m http.server 4173
```

Puis ouvrir `http://localhost:4173`.

## Configurer Supabase Auth

Renseigner `config.js` avec les valeurs publiques du projet Supabase :

```js
window.MDRANK_SUPABASE_CONFIG = {
  url: "https://VOTRE_PROJECT_REF.supabase.co",
  anonKey: "VOTRE_SUPABASE_ANON_KEY"
};
```

La clé `anon` est publique. Ne jamais mettre la `service_role` key dans le front.

Dans Supabase Dashboard, vérifier :

- Authentication activé
- URL du site : `http://localhost:4173`
- Redirect URLs selon le port utilisé en local
- la RPC `create_or_update_profile` bien disponible

## Publication réelle

L'écran `Publier` utilise Supabase pour :

- charger les catégories actives depuis `categories`
- publier via la RPC `create_punchline`
- ne jamais envoyer `author_id`, `score`, `status` ou compteurs depuis le front

La publication nécessite :

- utilisateur connecté
- profil public avec pseudo
- catégorie active
- punchline de 3 à 180 caractères

## Contenu

- Ecran accueil / onboarding
- Feed avec onglets
- Publication mockée avec aperçu et confirmation
- Défi du jour
- Classements
- Profil personnel mocké
- Signalement en modale
- Admin visuel mocké

## Phase suivante

- Brancher une vraie persistance
- Ajouter une vraie authentification par pseudo
- Gérer la logique anti-auto-vote
- Implémenter le calcul de score
- Ajouter la modération réelle
- Creer l'avatar cartoon plus tard
