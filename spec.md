# Vial Traite Service

## Current State
Page Planning avec vue semaine (tableau Lun-Ven, lignes par utilisateur). Les fiches intervention sont créées depuis le Planning via `ajouterInterventionPourUtilisateur` avec un ID non-déterministe (`intv-plan-${missionId}-${timestamp}-${random}`). La fonction `modifierIntervention` ne réinitialise pas le statut de validation. Le bouton "Mettre à jour" passe l'interventionId "lookup" (invalide) au modal.

## Requested Changes (Diff)

### Add
- État `existingFound` dans `PlanningInterventionModal` pour différencier nouvelle fiche vs modification.

### Modify
1. **Backend `modifierIntervention`** : ajouter `interventionValidees.remove(id)` pour remettre l'intervention en "en attente" lors d'une mise à jour.
2. **`Planning.tsx` — `handleDelete`** : utiliser l'ID déterministe `intv-plan-${id}` pour supprimer l'intervention liée lors de la suppression d'un planning item.
3. **`Planning.tsx` — ouverture du modal** : passer `interventionId = "intv-plan-${missionId}"` au lieu de `"lookup"` ou `undefined`.
4. **`Planning.tsx` — carte mission (VueSemaine)** : supprimer `truncate` et `maxWidth: "120px"` sur le nom du client pour l'afficher en entier.
5. **`PlanningInterventionModal.tsx`** :
   - Utiliser ID déterministe `intv-plan-${missionId}` pour toutes les créations d'interventions.
   - Charger l'intervention existante par `i.id === interventionId` (pas par clientNom/date).
   - Afficher bouton "Enregistrer" si `!existingFound`, "Mettre à jour" si `existingFound && isCreator`.
   - `handleSave` : si `!existingFound` → `ajouterInterventionPourUtilisateur` + `validerPlanningItem` ; si `existingFound` → `modifierIntervention` (reset validation auto via backend).

### Remove
- Logique `"lookup"` dans l'ouverture du modal.
- Recherche par clientNom/date pour trouver l'intervention existante.

## Implementation Plan
1. Éditer `src/backend/main.mo` : ajouter `interventionValidees.remove(id)` dans `modifierIntervention`.
2. Éditer `src/frontend/src/pages/Planning.tsx` : 3 corrections ciblées (handleDelete, modal prop, client name).
3. Réécrire `src/frontend/src/components/PlanningInterventionModal.tsx` avec l'ID déterministe, `existingFound`, chargement par ID, et logique de sauvegarde corrigée.
4. Valider et déployer.
