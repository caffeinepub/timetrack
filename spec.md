# Vial Traite Service

## Current State
- Planning.tsx shows `validatedInterventions` (validated interventions from Facturation) as separate DayItem entries in `allItems`, causing duplication when Facturation validation auto-updates a mission
- Creating a mission in Planning does NOT create any draft entry in the Calendar
- Header.tsx has no badge for pending missions
- No sync between Planning missions and Calendar when missions are edited/deleted

## Requested Changes (Diff)

### Add
- **Auto-create calendar draft interventions** when a planning mission is created: for each date in the mission, call `ajouterIntervention` with a deterministic ID `${planningItemId}-${dateStr}`, client name and address pre-filled, all hours at 0, for the destinataire's principal
- **Badge orange in Header**: `missionsBadgeCount` prop, orange circle with number of today's missions "à réaliser"; computed in App.tsx from planningItems query

### Modify
- **Planning.tsx**: Remove `validatedInterventions` entirely from `allItems`. The auto-validation already updates the mission's own `statut` to `execute` via `validerPlanningItem` — so the mission itself shows as executed. No need to duplicate as a separate item.
- **Planning.tsx `handleDelete`**: after deleting the planning item, also call `supprimerIntervention` for each derived ID (`${item.id}-${toDateStr(date)}`) to remove corresponding calendar drafts
- **Planning.tsx `handleEditDatesSubmit`**: compare old dates vs new dates, delete interventions for removed dates (derived IDs), add interventions for added dates
- **Header.tsx**: accept `missionsBadgeCount?: number` prop, render orange badge next to user name when count > 0
- **App.tsx**: fetch `obtenirTousPlanningItems`, compute count of today's `a_realiser` items, pass to Header

### Remove
- `validatedInterventions` useMemo and its usage in Planning.tsx

## Implementation Plan
1. Planning.tsx: remove `validatedInterventions` and its merge into `allItems`
2. Planning.tsx `handleCreate`: after `creerPlanningItem`, for each date call `ajouterIntervention` with deterministic ID and client info pre-filled (need to get client address from `selectedClient?.adresse`); use the destinataire's principal for `user` field — but `ajouterIntervention` takes the caller as user automatically. The draft is created for the logged-in user (creator), not the destinataire. Actually create on behalf of destinataire is not possible without backend changes — create it as creator, set clientNom and clientAdresse from selected client
3. Planning.tsx `handleDelete`: call `supprimerIntervention(${id}-${dateStr})` for each date of the item being deleted
4. Planning.tsx `handleEditDatesSubmit`: diff old/new dates, delete removed, add new
5. Header.tsx: add `missionsBadgeCount` prop with orange badge display
6. App.tsx: add query for planning items, compute today badge count, pass to Header
