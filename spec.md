# Vialtraite Service - Memo Profile Dropdown

## Current State
- Section Mémo shows all memos from all users, no profile filter
- Backend has `creerMemo`, `obtenirMemos`, `supprimerMemo` functions but they are missing from DID declarations (causing "actor.creerMemo is not a function" error)
- Backend has `obtenirTousLesProfils`, `obtenirJourneesPubliques`, `obtenirInterventionsPubliques` in backend.d.ts but also missing from DID declarations
- Reports section has a profile dropdown but may also be broken due to missing DID declarations

## Requested Changes (Diff)

### Add
- Profile dropdown in Memo section: list all registered Internet Identity profiles via `obtenirTousLesProfils()`
- Filter displayed memos by selected profile's `createdBy` principal (field already stored in MemoEntry)
- Auto-select current user's profile when authenticated
- All missing functions to DID declarations: `creerMemo`, `obtenirMemos`, `supprimerMemo`, `MemoEntry` type, `obtenirTousLesProfils`, `obtenirJourneesPubliques`, `obtenirInterventionsPubliques`

### Modify
- `backend.did.js`: Add MemoEntry type + all 6 missing functions to both service sections
- `backend.did.d.ts`: Add MemoEntry type + TypeScript signatures for all 6 missing functions
- `backend.d.ts`: Add memo function signatures
- `Memo.tsx`: Add profile selector dropdown + filter memos by selected profile principal

### Remove
- Nothing

## Implementation Plan
1. Update `backend.did.js` - add MemoEntry type definition + all missing functions in both export section and idlFactory section
2. Update `backend.did.d.ts` - add TypeScript types for MemoEntry + missing functions
3. Update `backend.d.ts` - add memo function signatures
4. Update `Memo.tsx` - add profile dropdown using `obtenirTousLesProfils()`, filter memos by createdBy principal
