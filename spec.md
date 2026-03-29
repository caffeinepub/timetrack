# Vial Traite Service

## Current State
- Page Planning avec vue semaine hebdomadaire et vue calendrier mensuel
- Missions créées dans le tableau, statuts : a_realiser, en_cours, execute
- PlanningInterventionModal pour remplir la fiche intervention depuis le Planning
- La fonction `ajouterInterventionPourUtilisateur` est dans main.mo et backend.ts mais ABSENTE du fichier declarations/backend.did.js (IDL), causant l'erreur "this actor.ajouterinterventionpourutilisateur is not a function"

## Requested Changes (Diff)

### Add
- Bouton "Accepter" dans la cellule mission pour le destinataire uniquement, visible quand statut = a_realiser. Clic → appelle accepterPlanningItem → statut passe en en_cours
- Bouton "Ajouter" dans la carte mission (édition) pour copier la mission sur plusieurs jours supplémentaires (DateMultiPicker existant)
- Dans PlanningInterventionModal : section "Pièces" avec ajout de plusieurs lignes (article, référence, quantité)
- Dans PlanningInterventionModal : upload photos/vidéos depuis album/fichiers, affichage en grille avec zoom plein écran, inclusion dans PDF
- Dans PlanningInterventionModal : dictée vocale (bouton micro) sur champ description + spellcheck FR

### Modify
- declarations/backend.did.js : ajouter ajouterInterventionPourUtilisateur dans les deux sections (idlFactory et service)
- declarations/backend.did.d.ts : ajouter ajouterInterventionPourUtilisateur dans l'interface _SERVICE
- PlanningInterventionModal : description démarre VIDE (pas pré-remplie depuis la mission)
- Planning.tsx vue semaine : bouton fiche intervention visible uniquement quand statut = en_cours ou execute (pas a_realiser)

### Remove
- Rien à supprimer

## Implementation Plan
1. Fix IDL declarations (backend.did.js et backend.did.d.ts) pour ajouter ajouterInterventionPourUtilisateur
2. Mettre à jour PlanningInterventionModal.tsx :
   - description = '' par défaut (ignorer prefill.description)
   - Ajouter section Pièces (state array, lignes article/ref/qté, bouton ajout)
   - Ajouter upload photos/vidéos via input file, stockage base64, affichage grille + lightbox
   - Ajouter bouton micro dictée vocale sur champ description (réutiliser VoiceInput existant)
   - Passer pieces et photos/videos dans buildInput
   - Dans handleSave: valider l'intervention avec les pièces et médias
3. Mettre à jour Planning.tsx :
   - Dans vue calendrier et vue semaine : afficher bouton "✓ Accepter" quand destinataire = caller ET statut = a_realiser
   - Bouton fiche visible seulement pour en_cours et execute
   - Dans l'édition d'une mission (showEditMission), ajouter un DateMultiPicker pour ajouter des jours supplémentaires
