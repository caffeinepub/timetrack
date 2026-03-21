# Suivi du Temps - Amélioration Export PDF

## Current State
Les rapports ont déjà un bouton d'export PDF (via backend) et un export CSV. L'export PDF actuel dépend d'une fonction backend (`generatePdf`) et ne contient pas les fiches interventions détaillées (pièces, signatures). L'export CSV contient uniquement les journées (pas les interventions).

## Requested Changes (Diff)

### Add
- Export PDF complet côté frontend (sans dépendance backend) utilisant `jsPDF` ou impression navigateur
- L'export PDF inclut : résumé de la période, tableau des journées (type, heures, astreinte, repas, trajet), section fiches interventions (client, adresse, horaires matin/après-midi, description, pièces utilisées, indication signatures)
- Bouton "Tout exporter" pour sauvegarder toutes les données de l'année en cours en PDF
- Export CSV amélioré incluant aussi les interventions

### Modify
- Bouton PDF existant : utiliser une génération frontend robuste via `window.print()` avec CSS print-friendly, plutôt que de dépendre du backend
- Améliorer le contenu de l'export pour inclure les fiches interventions

### Remove
- Dépendance à `generatePdf` du backend pour l'export (remplacé par génération frontend)

## Implementation Plan
1. Créer un utilitaire `exportPdf.ts` qui génère un contenu HTML print-friendly et déclenche l'impression
2. L'export contient : titre période, totaux, tableau journées, fiches interventions avec pièces
3. Ajouter un bouton "Export annuel" pour sauvegarder toute l'année
4. Améliorer l'export CSV pour inclure les interventions dans un second onglet/section
5. Mettre à jour Reports.tsx pour utiliser le nouvel utilitaire
