# Vial Traite Service — Corrections v70

## Current State
Version 69 deployed. Multiple bugs:
1. Saving intervention with photos/videos fails: "idl error: did not find field video in record" — `InterventionInput` IDL declaration is missing `photos` and `videos` fields.
2. Memo publication fails: "Fonction de publication indisponible. Rechargez la page" — `creerMemo`, `obtenirMemos`, `supprimerMemo` are NOT implemented in the `Backend` class in `backend.ts` (only in the raw Candid declarations).
3. Reports section has a profile dropdown that should be removed; instead show ALL registered users' calendar data (journées + fiches interventions) combined.
4. App routing: Dashboard and Calendar should be private (require auth). Memo, Reports, Clients should be public (visible to all without login).
5. Login page has a "Consulter les rapports publics" button that must be removed.

## Requested Changes (Diff)

### Add
- `MemoEntry` interface to `backend.ts`
- Missing methods to `backendInterface` and `Backend` class: `creerMemo`, `obtenirMemos`, `supprimerMemo`, `obtenirTousLesProfils`, `obtenirJourneesPubliques`, `obtenirInterventionsPubliques`
- Public navigation bar (Mémo / Rapports / Clients) for unauthenticated users

### Modify
- `backend.did.js`: add `photos: IDL.Vec(ExternalBlob)` and `videos: IDL.Vec(ExternalBlob)` to `InterventionInput` (both places in file)
- `backend.ts`: add `photos?: Array<ExternalBlob>` and `videos?: Array<ExternalBlob>` to `InterventionInput` and `InterventionAvecPieces` interfaces; fix `ajouterIntervention` and `modifierIntervention` to convert photos/videos before sending to raw actor
- `App.tsx`: unauthenticated users see Memo/Reports/Clients (default: Memo); authenticated users see all 5 sections; remove "Consulter les rapports publics" link from login page; no change to existing authenticated layout
- `Reports.tsx`: remove profile dropdown; fetch all profiles via `obtenirTousLesProfils`, then combine all users' journées + interventions into one unified list; display all entries from all users

### Remove
- Profile dropdown from Reports page
- "Consulter les rapports publics" link from login page
- Public-only Reports view in App.tsx (now handled by unified public routing)

## Implementation Plan
1. Fix `backend.did.js` — add photos/videos to InterventionInput record (2 places)
2. Fix `backend.ts`:
   a. Add photos/videos to `InterventionInput` interface (optional fields)
   b. Add photos/videos to `InterventionAvecPieces` interface (optional fields)
   c. Add `MemoEntry` interface
   d. Add missing methods to `backendInterface`
   e. Add method implementations to `Backend` class
   f. Fix `ajouterIntervention`: convert photos/videos using `to_candid_vec_n10` before calling raw actor
   g. Fix `modifierIntervention`: same
3. Fix `App.tsx`:
   a. When not authenticated, default page is 'memo'
   b. Not-auth nav shows Memo, Reports, Clients only
   c. Clicking Dashboard or Calendar redirects to login
   d. Remove "Consulter les rapports publics" button
   e. Keep all authenticated behavior unchanged
4. Fix `Reports.tsx`:
   a. Remove profile `<select>` dropdown and associated state
   b. Fetch `obtenirTousLesProfils()` to get all user principals
   c. For each principal, call `obtenirJourneesPubliques` and `obtenirInterventionsPubliques`
   d. Merge all entries/interventions into single lists, sorted by date
   e. Display combined data (no per-user filter)
