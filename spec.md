# Vialtraite Service — Fiche intervention intégrée aux créneaux

## Current State
- La section "Interventions" du formulaire journée (Calendar.tsx) affiche des créneaux d'astreinte (startHour/startMinute/endHour/endMinute) dans `interventionSlots`.
- La "Fiche Intervention" est une modale séparée (`InterventionFormModal.tsx`) avec ses propres champs (clientNom, clientAdresse, horaires matin/après-midi, description, signatures).
- Un bouton "+ Fiche Intervention" en bas du formulaire journée ouvre cette modale séparément.
- Un second bouton "+ Fiche Intervention" apparaît sous chaque entrée du calendrier.
- Les `Intervention` records sont stockés séparément dans le backend (table distincte des `TimeEntry`).

## Requested Changes (Diff)

### Add
- Champs de la fiche intervention directement sous chaque créneau dans `interventionSlots` : clientNom (avec autocomplétion depuis fichier clients), clientAdresse, description fiche, horaires matin (début/fin), horaires après-midi (début/fin), signature client, signature intervenant.
- Champ `ficheId` (optionnel) dans `InterventionSlotForm` pour lier le créneau à un `Intervention` backend.
- À l'ouverture en modification d'une journée : charger les interventions existantes du jour et les mapper aux créneaux par ordre.
- Au `handleSave` : pour chaque créneau ayant un `ficheId`, faire `updateIntervention` ; pour chaque créneau sans `ficheId` mais avec `clientNom` rempli, faire `addIntervention`.

### Modify
- `InterventionSlotForm` : ajouter les champs fiche (ficheId, clientNom, clientAdresse, matinDebutH, matinDebutMin, matinFinH, matinFinMin, apremDebutH, apremDebutMin, apremFinH, apremFinMin, ficheDescription, signatureClient, signatureIntervenant).
- Rendu de chaque créneau : afficher les champs fiche directement sous les champs horaires du créneau, dans un bloc visuel distinct mais dans le même élément.
- `openEditEntry` : après chargement du `TimeEntry`, récupérer les `Intervention` du jour et mapper par index aux slots.

### Remove
- Bouton "+ Fiche Intervention" en bas du formulaire journée (dans le Dialog).
- Bouton "+ Fiche Intervention" dans la liste des entrées du calendrier.
- `InterventionFormModal` import et usage dans Calendar.tsx.
- States `interventionDialogOpen`, `selectedDateForIntervention`, `editingIntervention`, `openInterventionForDate`.

## Implementation Plan
1. Étendre `InterventionSlotForm` avec les champs fiche + ficheId.
2. Mettre à jour `addInterventionSlot` pour initialiser les nouveaux champs.
3. Ajouter un hook `useGetInterventionsPourJour` dans `openEditEntry` (en chargeant via actor direct ou hook séparé) pour mapper les interventions aux slots.
4. Mettre à jour `handleSave` pour enregistrer/mettre à jour les Intervention records.
5. Mettre à jour le rendu de chaque slot pour afficher les champs fiche inline.
6. Supprimer les boutons fiche séparés, la modale, et les états associés.
