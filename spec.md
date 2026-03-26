# Vial Traite Service

## Current State
Version 117 en production. L'admin s'est accidentellement désactivé dans la section Profil, ce qui a mis son rôle backend en `#guest`. Il ne peut plus se connecter car toutes les fonctions backend requièrent le rôle `#user` minimum.

## Requested Changes (Diff)

### Add
- Constante `PROTECTED_ADMIN` dans `access-control.mo` avec l'ID principal de l'admin
- Fonction `isProtectedAdmin` qui vérifie si un principal est l'admin protégé

### Modify
- `getUserRole` : retourne toujours `#admin` pour le principal protégé, sans consulter la map
- `initialize` : force l'assignation `#admin` pour le principal protégé à chaque appel
- `assignRole` : bloque toute tentative de modifier le rôle de l'admin protégé

### Remove
- Rien

## Implementation Plan
1. Modifier `access-control.mo` avec la protection de l'admin
2. Déployer sans reconstruire le backend (données préservées)
