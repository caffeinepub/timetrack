# Vial Traite Service

## Current State
Calendar.tsx has two bugs causing deleted interventions to reappear after page reload:
1. `handleDelete` only deletes the `TimeEntry` (journée) but NOT the associated `Intervention` records in the backend (stored separately, linked by date).
2. `removeInterventionSlot` only removes a slot from local React state but never calls `actor.supprimerIntervention(slot.ficheId)` on the backend.

Result: When user deletes a day or a slot, backend intervention records persist. On next page open for the same date, `obtenirInterventionsPourJour` fetches them back and they reappear.

## Requested Changes (Diff)

### Add
- In `handleDelete`: before deleting the TimeEntry, fetch all interventions for that day via `actor.obtenirInterventionsPourJour(editingEntry.date)` and delete each one via `actor.supprimerIntervention(intv.id)`.
- In `removeInterventionSlot`: make it async, and if `slot.ficheId` exists, call `actor.supprimerIntervention(slot.ficheId)` before removing from local state.

### Modify
- `handleDelete` function in Calendar.tsx
- `removeInterventionSlot` function in Calendar.tsx

### Remove
- Nothing removed

## Implementation Plan
1. Fix `handleDelete` to cascade-delete all backend interventions for the day before deleting the TimeEntry.
2. Fix `removeInterventionSlot` to call `actor.supprimerIntervention` for slots that have a `ficheId`.
3. Validate and build.
