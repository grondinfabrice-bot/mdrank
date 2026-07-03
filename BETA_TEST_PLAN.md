# Plan de test bêta MDRank

Objectif : vérifier que MDRank est compréhensible et stable pour une petite bêta fermée.

## Avant de commencer

- Ouvrir l'app sur mobile ou largeur mobile.
- Utiliser au moins deux comptes normaux.
- Préparer un compte admin.
- Noter les bugs avec l'heure approximative.

## Utilisateur A

- Créer un compte.
- Choisir un pseudo.
- Vérifier que l'email n'apparaît pas publiquement.
- Publier une punchline depuis `Publier`.
- Publier une punchline depuis `Défis`.
- Vérifier que les punchlines apparaissent dans le feed.
- Vérifier l'écran `Moi`.
- Se déconnecter puis se reconnecter.

## Utilisateur B

- Créer un compte.
- Choisir un pseudo.
- Voir la punchline de A dans le feed.
- Réagir à une punchline de A.
- Changer de réaction.
- Donner une SuperNote à une punchline de A.
- Vérifier qu'une deuxième SuperNote le même jour est refusée.
- Suivre A.
- Aller dans le feed `Suivis`.
- Signaler une punchline.
- Vérifier que le signalement affiche un retour clair.

## Admin

- Se connecter avec un compte admin.
- Aller directement sur `#admin`.
- Vérifier que les signalements sont visibles.
- Masquer une punchline signalée.
- Vérifier qu'elle disparaît du feed.
- Vérifier qu'elle disparaît du Top.
- Vérifier qu'elle disparaît du Top 3 du défi si elle y était.
- Restaurer la punchline si l'action est disponible.
- Vérifier que l'action admin affiche un retour clair.

## Bugs à noter

Pour chaque bug, noter :

- écran concerné ;
- action faite ;
- résultat attendu ;
- résultat obtenu ;
- compte utilisé ;
- heure approximative ;
- capture d'écran si possible.

## Points à surveiller

- Navigation basse qui masque le contenu.
- Boutons trop petits sur petit mobile.
- Message d'erreur trop technique.
- Score incohérent après réaction ou SuperNote.
- Punchline masquée encore visible publiquement.
- Email visible à un endroit public.
- Identité d'un votant visible.
