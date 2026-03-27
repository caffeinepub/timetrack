# Vial Traite Service — Retour à la v107

## Current State
L'application contient une section "Profil Admin" (page Profil.tsx) avec gestion des accès utilisateurs, qui cause une erreur permanente dans le backend (admin ID mismatch). Toutes les références admin sont dans App.tsx, MobileBottomNav, DesktopSideNav, Header et Dashboard.

## Requested Changes (Diff)

### Add
- Rien

### Modify
- **App.tsx** : Supprimer ADMIN_PRINCIPAL_ID, isAdmin, effectiveIsAdmin, getBlockedSections, blockedForUser, effectivePage admin logic, import Profil, rendu de la page Profil, et l'appel initializeAccessControl admin. La page active est simplement `currentPage` sans blocage.
- **MobileBottomNav.tsx** : Supprimer isAdmin prop, ADMIN_ITEM, import Shield
- **DesktopSideNav.tsx** : Supprimer isAdmin prop, ADMIN_ITEM, import Shield
- **Header.tsx** : Supprimer useIsCallerAdmin, isAdminLoading, PublishRetryDialog et son import
- **Dashboard.tsx** : Supprimer l'encart temporaire d'affichage du Principal ID (bloc orange)

### Remove
- Page Profil de la navigation et du routing (le fichier peut rester)

## Implementation Plan
1. Modifier App.tsx pour supprimer tout le code admin
2. Modifier MobileBottomNav.tsx pour supprimer isAdmin/ADMIN_ITEM
3. Modifier DesktopSideNav.tsx pour supprimer isAdmin/ADMIN_ITEM
4. Modifier Header.tsx pour supprimer les références admin
5. Modifier Dashboard.tsx pour supprimer l'affichage du Principal ID
6. Valider et déployer
