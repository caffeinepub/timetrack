# Suivi du Temps — Version 67

## Current State
- App has: Dashboard, Calendar (with intervention fiches), Journal, Reports, Clients
- Journal: private entries with audio recording, photos, notes, dayType
- Intervention fiche (in Calendar): client name, address, hours, description, parts (reference/article/qty), signatures
- Backend uses blob-storage for media files
- Stable maps for persistence

## Requested Changes (Diff)

### Add
- `MemoEntry` backend type: id, authorName (text entered by user), content (text), createdAt (Time), photos ([ExternalBlob]), videos ([ExternalBlob])
- Backend functions: `creerMemo(id, authorName, content, photos, videos)`, `obtenirMemos()` (public query, no auth needed), `supprimerMemo(id)` (only authenticated users can delete)
- `photos` and `videos` fields ([ExternalBlob]) added to Intervention type
- New `Memo` frontend page (replaces Journal): public section, add dated/named note with photo/video upload, each entry deletable, media viewer with zoom/fullscreen
- Photo/video upload in intervention form (Calendar page)
- Media lightbox viewer component for viewing photos/videos fullscreen

### Modify
- Replace `Journal` page with `Memo` page throughout App.tsx
- Update `MobileBottomNav` label/icon: "Journal" → "Mémo"
- `Page` type: `"journal"` → `"memo"`
- Backend Intervention type: add `photos` and `videos` fields
- `enregistrerIntervention` and `modifierIntervention` accept `photos` and `videos`
- Calendar intervention form: add photo/video upload section

### Remove
- Journal page (replaced by Memo)
- Journal-specific backend functions (keep or repurpose - keep for backward compat but no longer used in frontend)

## Implementation Plan
1. Regenerate backend with MemoEntry type + memo CRUD functions + intervention media fields
2. Update frontend: rename journal→memo in App.tsx and MobileBottomNav
3. Create new Memo.tsx page with: public note feed, add note form (author+text+media), delete button, media viewer
4. Update Calendar.tsx intervention form: add photo/video upload using blob-storage pattern
5. Create MediaViewer component (lightbox with zoom)
