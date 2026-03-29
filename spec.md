# Vial Traite Service

## Current State
- Planning page has a week table view (VueSemaine) with inline create/edit forms
- Creating a mission in VueSemaine has a 'Sauvegarder' button
- Missions have various action buttons (Accepter, Fiche intervention, etc.)
- PlanningInterventionModal handles filling and validating intervention fiches
- When validated in PlanningInterventionModal, calls ajouterInterventionPourUtilisateur + validerIntervention + validerPlanningItem

## Requested Changes (Diff)

### Add
- In VueSemaine inline create form: DateMultiPicker to select multiple days
- 'Ajouter' button on existing missions in both week and month views to copy mission to other days
- 'Modifier' button on existing missions (both week table and month calendar view) to edit all mission fields inline

### Modify
- Replace 'Sauvegarder' button in VueSemaine create form with 'Ajouter' that allows selecting multiple days via DateMultiPicker (already exists in the file at bottom). The form submits and creates the mission on all selected days.
- Ensure PlanningInterventionModal.tsx handleSave() correctly: after validating fiche intervention, the mission passes to 'execute' status AND the intervention appears in Facturation. The current code already calls ajouterInterventionPourUtilisateur + validerIntervention + validerPlanningItem. Verify this chain is correct and fix any broken calls.
- In month view mission cards: show 'Modifier' button for isOwner (creator or destinataire)

### Remove
- Nothing

## Implementation Plan
1. In VueSemaine inline create form: add DateMultiPicker for extra days, change button label from 'Sauvegarder' to 'Ajouter', in handleCreate() iterate over selected dates and call creerPlanningItem for each day
2. Add 'Modifier' button visible on existing missions in VueSemaine cells - clicking opens the existing editForm panel
3. Add 'Ajouter sur d'autres jours' button on existing missions (both views) - opens a date picker and calls creerPlanningItem with same data for selected days
4. In month view: ensure 'Modifier' button is available for creator/destinataire
5. Verify PlanningInterventionModal handleSave() flow for validation to Facturation - ensure ajouterInterventionPourUtilisateur and validerIntervention are called correctly (not via 'as any' if possible)
