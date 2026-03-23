# Vial Traite Service

## Current State
L'application gère des fiches intervention dans plusieurs sections : Calendrier, Facturation, et dossier Clients. Chaque fiche affiche un en-tête avec logo et "Vial Traite Service", mais aucun pied de page avec coordonnées.

## Requested Changes (Diff)

### Add
- Pied de page sur chaque fiche intervention (calendrier, facturation, dossier client) et dans tous les exports PDF :
  - "Z.I. du Martinet — 15300 Murat" centré en petits caractères
  - Séparateur léger (ligne horizontale)
  - "04 71 20 12 22" centré en petits caractères, légèrement détaché du reste

### Modify
- `Facturation.tsx` : `buildInterventionHtml()` — ajouter le pied de page avant la fermeture du `<div>` principal (ligne 81)
- `Clients.tsx` : `exportInterventionPdf()` — ajouter le pied de page avant `</body></html>` (ligne 148)
- `exportPdf.ts` : `buildInterventionRows()` — ajouter le pied de page dans chaque card d'intervention (ligne 82)
- `Calendar.tsx` : vue in-app de la fiche intervention — ajouter le pied de page après la SignaturePad intervenant (ligne 1893)

### Remove
- Rien

## Implementation Plan
1. Modifier `buildInterventionHtml()` dans Facturation.tsx pour ajouter le footer HTML
2. Modifier `exportInterventionPdf()` dans Clients.tsx pour ajouter le footer HTML
3. Modifier `buildInterventionRows()` dans exportPdf.ts pour ajouter le footer HTML
4. Modifier le composant inline de la fiche dans Calendar.tsx pour ajouter le footer JSX
