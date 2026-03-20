# Suivi du Temps - Persistance des pièces d'intervention

## Current State
Les interventions sont stockées dans le backend avec leurs champs (client, horaires, description, signatures). La section "Pièces utilisées" (référence, article, quantité) existe uniquement en frontend sans persistance backend.

## Requested Changes (Diff)

### Add
- Type `PieceUtilisee` (référence, article, quantité) dans le backend
- Champ `pieces : [PieceUtilisee]` dans le type `Intervention` et `InterventionInput`

### Modify
- Fonctions `ajouterIntervention` et `modifierIntervention` pour accepter et sauvegarder les pièces
- Frontend : envoyer les pièces lors de la création/modification d'une intervention, les afficher depuis les données persistées

### Remove
- Rien

## Implementation Plan
1. Ajouter le type `PieceUtilisee` dans main.mo
2. Ajouter `pieces : [PieceUtilisee]` dans `Intervention` et `InterventionInput`
3. Mettre à jour les fonctions d'ajout/modification pour mapper les pièces
4. Mettre à jour le frontend pour envoyer et recevoir les pièces depuis le backend
