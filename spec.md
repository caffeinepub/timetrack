# Suivi du Temps - Correction bugs persistance et enregistrement

## Current State
Le backend utilise `Map.empty()` sans `stable var`, ce qui entraîne la perte de toutes les données à chaque mise à jour (upgrade) du canister. De plus, `modifierJournee` lance une exception si l'entrée n'est pas trouvée, ce qui provoque une erreur d'enregistrement lorsque les données ont été perdues.

## Requested Changes (Diff)

### Add
- Déclarations `stable var` pour toutes les collections (timeEntries, journalEntries, dailyMediaEntries, userProfiles, clients, interventions, interventionPieces)
- Fonctions `system preupgrade()` et `system postupgrade()` pour sérialiser/désérialiser les Maps dans des tableaux stables

### Modify
- `modifierJournee` : utiliser un comportement upsert (créer si non trouvé) plutôt que de lancer une exception
- `modifierIntervention` : même correction upsert
- Toutes les Maps initialisées depuis les stable vars au démarrage

### Remove
- Rien

## Implementation Plan
1. Ajouter des stable vars pour chaque Map (tableaux de tuples)
2. Initialiser les Maps depuis ces stable vars au démarrage
3. Implémenter preupgrade/postupgrade pour sauvegarder/restaurer les données
4. Corriger modifierJournee et modifierIntervention pour upsert
5. Correction du compteurFichiers en stable var
