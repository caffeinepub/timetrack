# Vial Traite Service

## Current State
- Photos/vidéos ajoutables dans les fiches intervention Planning, Facturation et dossier client mais stockées temporairement (non persistantes entre rechargements)
- Pas de photos dans le PDF du dossier client (bug connu)
- Pas de bouton actualiser dans l'en-tête
- Pas de légende des couleurs de statut dans le Planning
- blob-storage déjà intégré dans le backend (Mixin.mo présent)

## Requested Changes (Diff)

### Add
- Bouton actualiser (rechargement complet F5) dans le Header à côté de l'icône de déconnexion
- Légende colorée permanente dans le Planning : petits ronds colorés avec label (🟠 À réaliser, 🔵 En cours, 🟢 Réalisé)
- Stockage persistant des photos/vidéos via blob-storage dans : PlanningInterventionModal, Facturation, dossier client (Clients.tsx)
- Fonctions backend pour uploader/récupérer les médias associés aux interventions Planning, Facturation et dossier client

### Modify
- PlanningInterventionModal : remplacer stockage local des médias par upload blob-storage, charger les URLs persistantes à l'ouverture
- Facturation : remplacer stockage local des médias par upload blob-storage, charger les URLs persistantes
- Clients (dossier client) : fix du bug PDF - inclure les photos en taille lisible dans l'export PDF des interventions
- Header : ajouter bouton actualiser (window.location.reload()) à côté du bouton de déconnexion
- Planning.tsx : ajouter légende colorée en haut du tableau hebdomadaire

### Remove
- Stockage temporaire des médias dans les sections concernées (remplacé par blob-storage)

## Implementation Plan
1. Sélectionner composant blob-storage
2. Mettre à jour backend main.mo pour exposer fonctions de stockage de médias liés aux interventions Planning/Facturation/Client
3. Mettre à jour backend.d.ts avec les nouveaux types
4. Header.tsx : ajouter bouton refresh (window.location.reload())
5. Planning.tsx : ajouter légende colorée permanente
6. PlanningInterventionModal.tsx : intégrer upload blob-storage pour photos/vidéos (persistance)
7. Facturation.tsx : intégrer upload blob-storage pour photos/vidéos
8. Clients.tsx : fix export PDF pour inclure photos des interventions
9. StorageClient.ts : s'assurer que uploadMedia et getMediaUrl sont bien exposés
