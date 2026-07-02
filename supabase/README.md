# Supabase MDRank

Structure Supabase du MVP MDRank.

## Migrations locales

```bash
supabase start
supabase db reset
```

## Projet Supabase distant

```bash
supabase login
supabase link --project-ref VOTRE_PROJECT_REF
supabase db push
```

## Validation database

Dry-run des migrations non appliquées :

```bash
supabase db push --dry-run --linked
```

Tests SQL métier :

- ouvrir `supabase/tests/mdrank_database_validation.sql` ;
- l'exécuter dans Supabase SQL Editor ou via `psql` avec un rôle propriétaire ;
- le script fait un `rollback`, donc il ne garde pas les données de test.

## Notes

- Les votes publics passent par des vues qui n'exposent jamais les votants.
- Les actions métier sensibles passent par des fonctions RPC.
- La journée de SuperNote est basée sur `Indian/Reunion`.
