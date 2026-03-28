# Vial Traite Service — Calendrier partagé en lecture seule

## Current State
La page Calendrier est strictement personnelle : elle filtre les journées par `identity.getPrincipal()` et affiche uniquement les entrées de l'utilisateur connecté. Tous les boutons (créer, modifier, supprimer) sont disponibles pour l'utilisateur connecté. Il n'existe pas de sélecteur de profil.

## Requested Changes (Diff)

### Add
- Un sélecteur de profil en haut de la page Calendrier : liste déroulante avec recherche, affichant tous les profils utilisateurs (noms). Par défaut : le profil de l'utilisateur connecté.
- Un hook `useGetAllProfiles` dans useQueries.ts qui appelle `obtenirTousLesProfils()` (déjà disponible dans le backend IDL).
- Logique de lecture seule : quand un autre profil est sélectionné, tous les boutons d'action (créer journée, modifier, supprimer) sont masqués.

### Modify
- La page Calendar.tsx : filtrer les entrées sur le `principal` du profil sélectionné (pas forcément celui de l'utilisateur connecté).
- Le filtre `userEntries` utilise `selectedProfilePrincipal` au lieu de `identity.getPrincipal()`.
- Les boutons d'action (openNewEntry, openEditEntry, deleteEntry) ne s'affichent que si `isOwnCalendar === true`.

### Remove
- Rien à supprimer.

## Implementation Plan
1. Ajouter `useGetAllProfiles` dans useQueries.ts.
2. Dans Calendar.tsx : ajouter état `selectedProfilePrincipal`, charger tous les profils, afficher le sélecteur avec recherche.
3. Modifier `userEntries` pour filtrer par `selectedProfilePrincipal`.
4. Conditionner tous les boutons d'action sur `isOwnCalendar`.
