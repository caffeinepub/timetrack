# Vial Traite Service

## Current State

La page `Profil.tsx` existe mais :
- L'ID admin est hardcodé comme `qqb4l-yz3r5-...` au lieu de `gilph-edmid-nr3ic-svhal-6eq2x-ef6kc-ll54b-f6ow2-wc6zo-yf3cx-sae`
- Elle utilise localStorage avec blocage binaire (bloqué/non-bloqué) par section
- Elle n'est pas du tout accessible depuis la navigation (pas dans NAV_ITEMS, pas importée dans App.tsx)
- Elle n'inclut pas la section Planning dans la liste des sections
- Il n'y a pas de niveau "Lecture seule" — seulement Actif/Bloqué
- Le type `Page` dans App.tsx n'inclut pas "profil"

Sections existantes dans l'app : Bord, Calendrier, Planning, Mémo, Facturation, Clients, Ticket Resto, Ticket Essence.

## Requested Changes (Diff)

### Add
- Créer `src/frontend/src/utils/userAccessControl.ts` : utilitaire qui lit/écrit dans localStorage les niveaux d'accès par utilisateur par section. Niveaux : `"full"` | `"readonly"` | `"disabled"`. Clé localStorage : `"vts_section_access"`. Fonctions : `getSectionAccess(principalId, sectionKey): AccessLevel`, `setSectionAccess(principalId, sectionKey, level): void`, `getAllUserAccess(principalId): Record<string, AccessLevel>`.
- Créer `src/frontend/src/hooks/useAccessControl.ts` : hook React qui lit l'accès de l'utilisateur courant depuis localStorage et expose `isSectionVisible(page: Page): boolean` et `isSectionReadOnly(page: Page): boolean`. L'ID principal de l'utilisateur courant vient de `useInternetIdentity()`. L'admin (gilph-edmid-...) a toujours `full` access à tout.
- Ajouter icône Shield pour le lien Admin dans la navigation (admin uniquement)

### Modify
- **`App.tsx`** :
  - Ajouter `"profil"` au type `Page`
  - Importer et rendre `<Profil />` dans le contenu principal
  - Passer `identity?.getPrincipal().toText()` au composant `Header` pour vérifier si admin
  - Passer `useAccessControl()` aux composants de navigation pour filtrer les sections
- **`Profil.tsx`** :
  - Corriger `ADMIN_PRINCIPAL_ID` = `"gilph-edmid-nr3ic-svhal-6eq2x-ef6kc-ll54b-f6ow2-wc6zo-yf3cx-sae"`
  - Ajouter Planning à `ALL_SECTIONS` : `{ key: "planning", label: "Planning" }`
  - Remplacer les cases à cocher binaires par un sélecteur 3 niveaux par section : boutons radio ou select pour `"Accès complet"` / `"Lecture seule"` / `"Désactivé"`
  - Sauvegarder les niveaux via `setSectionAccess()` de l'utilitaire
  - Garder le bouton Désactiver/Activer le compte complet (via `assignCallerUserRole`)
  - Protéger l'admin contre toute modification
- **`MobileBottomNav.tsx`** :
  - Accepter `visiblePages: Page[]` prop
  - Filtrer `NAV_ITEMS` pour n'afficher que les pages dans `visiblePages`
  - Ajouter un item admin (Shield icon) pour la page "profil" visible uniquement si l'utilisateur est admin
- **`DesktopSideNav.tsx`** :
  - Accepter `visiblePages: Page[]` prop
  - Filtrer `NAV_ITEMS` pour n'afficher que les pages dans `visiblePages`
  - Ajouter un item admin (Shield icon, label "Admin") pour la page "profil" visible uniquement si l'utilisateur est admin
- **`Dashboard.tsx`, `Calendar.tsx`, `Memo.tsx`, `Facturation.tsx`, `Clients.tsx`, `Planning.tsx`, `TicketResto.tsx`, `TicketEssence.tsx`** :
  - Accepter un prop optionnel `readOnly?: boolean`
  - Quand `readOnly=true` : afficher une bannière info "Mode lecture seule" en haut, masquer tous les boutons de création/modification/suppression

### Remove
- Supprimer l'ancienne logique `getBlockedSections` / `setBlockedSections` dans Profil.tsx (remplacée par l'utilitaire)

## Implementation Plan

1. Créer `userAccessControl.ts` avec les 3 niveaux et fonctions get/set/getAll
2. Créer `useAccessControl.ts` hook qui lit l'accès du Principal courant
3. Mettre à jour `Profil.tsx` : admin ID, liste sections (+ Planning), UI 3 niveaux
4. Mettre à jour `App.tsx` : ajouter profil page, utiliser useAccessControl, passer visiblePages aux navs
5. Mettre à jour `DesktopSideNav.tsx` et `MobileBottomNav.tsx` : filtrage + lien admin
6. Mettre à jour chaque page avec prop `readOnly` et bannière + masquage des boutons d'action
