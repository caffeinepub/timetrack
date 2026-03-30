# Vial Traite Service

## Current State
Application complète de gestion du temps de travail avec Planning, Calendrier, Facturation, Clients, Mémo, Tickets, Messagerie.

## Requested Changes (Diff)

### Add
- Photos/vidéos incluses dans le PDF de la fiche intervention du dossier client (taille lisible : 200×150px)

### Modify
- Fiches missions dans le tableau hebdomadaire du Planning : cartes plus grandes (padding, police, dot de statut, largeur colonnes)

### Remove
- Rien

## Implementation Plan
1. Planning.tsx : agrandir les cartes missions (padding px-3 py-2.5, dot w-3 h-3, text-sm, maxWidth 120px, boutons text-sm)
2. Clients.tsx : ajouter les photos dans la fonction exportInterventionPdf en taille 200×150px
