# Vial Traite Service

## Current State

Page Planning avec:
- Vue semaine (VueSemaine) : tableau hebdomadaire Lun-Ven par utilisateur
- Vue mois : calendrier mensuel avec sélection de jour
- Cartes mission dans VueSemaine : actuellement des `<button>` cliquables qui ouvrent un formulaire d'édition inline
- Bouton "Modifier" (Pencil) visible pour le propriétaire (créateur ou destinataire)
- Bouton "+ Jours" pour copier la mission sur d'autres jours
- Formulaire d'édition inline dans la cellule (isEditingThis block)
- Dialogs "Modifier la mission" et "Modifier les dates" dans la vue mois
- PlanningInterventionModal : lors du chargement d'une intervention existante, les pièces et photos/vidéos ne sont pas chargées
- Bouton "Mettre à jour" : ne transmet pas les photos/pièces et n'invalide pas Facturation

## Requested Changes (Diff)

### Add
- Bouton "Supprimer" (rouge) sur les cartes mission dans VueSemaine, visible pour isOwner (créateur OU destinataire)
- Description visible directement sur la carte mission : 2 lignes max avec toggle "Voir plus" si texte plus long
- Chargement des pièces existantes (existing.pieces) dans PlanningInterventionModal à l'ouverture
- Chargement des photos/vidéos existantes (existing.photos, existing.videos) dans PlanningInterventionModal à l'ouverture (via blob.getDirectURL())
- Dans handleSave mode édition : inclure pièces et photos/vidéos dans l'appel modifierIntervention
- Invalider queryKey [facturationInterventions] et [clientsInterventions] après mise à jour

### Modify
- Les cartes mission dans VueSemaine passent de `<button onClick={setEditItem}>` à `<div>` (non cliquables pour édition)
- Remplacement du bouton "Modifier" (Pencil) par le bouton "Supprimer" (rouge) dans les cartes
- Suppression du bouton "✏️" (modifier mission) dans le panneau jour de la vue mois
- Garder le bouton "+ Jours" (création de nouvelles missions sur d'autres jours, ce n'est pas de la modification)

### Remove
- Tout le bloc `isEditingThis ? ... : ...` dans VueSemaine → toujours afficher la carte (jamais le formulaire inline)
- States dans VueSemaine : editItem, editForm, editClient
- Fonction handleEdit dans VueSemaine
- States dans le composant principal : showEditMission, editMissionClient, editMissionType, editMissionDescription, editMissionDates, showEditDates, editDates
- Fonctions : handleEditMissionSubmit, handleEditDatesSubmit
- Dialog "Modifier la mission" dans la vue principale
- Dialog "Modifier les dates" dans la vue principale
- Imports inutilisés après nettoyage (Pencil, Select, SelectContent, SelectItem, SelectTrigger, SelectValue si non utilisés ailleurs)

## Implementation Plan

### 1. Planning.tsx — Main component
- Supprimer les states : showEditMission, editMissionClient, editMissionType, editMissionDescription, editMissionDates, showEditDates, editDates
- Supprimer les fonctions : handleEditMissionSubmit, handleEditDatesSubmit
- Dans le panneau jour (vue mois), supprimer le bouton ✏️ qui ouvrait showEditMission
- Supprimer les deux dialogs "Modifier la mission" et "Modifier les dates"
- Supprimer les imports inutilisés

### 2. VueSemaine component (dans Planning.tsx)
- Supprimer states : editItem, editForm, editClient
- Supprimer handleEdit function
- Remplacer le rendu conditionnel `{isEditingThis ? FormBlock : CardBlock}` par uniquement le CardBlock
- Changer la carte de `<button onClick={() => setEditItem(item)}>` en `<div>` — garder le style visuel, enlever le click handler d'édition
- Dans les actions de la carte (section isOwner) :
  - Supprimer le bouton "Modifier" (Pencil icon + setEditItem)
  - Garder le bouton "+ Jours" (setShowAddDaysFor) — inchangé
  - Ajouter bouton "Supprimer" rouge (setDeleteConfirm) — visible pour isOwner (créateur OU destinataire)
- Ajouter l'affichage de la description sur la carte : texte xs, line-clamp-2, avec état local `expandedDesc` par item pour toggle "Voir plus"

### 3. PlanningInterventionModal.tsx — Chargement données existantes
- Dans Effect 1 (ouverture), après avoir trouvé `existing` :
  ```
  if (existing.pieces?.length) {
    setPieces(existing.pieces.map((p, i) => ({
      id: `existing-piece-${i}`,
      article: p.article,
      reference: p.reference,
      quantite: String(Number(p.quantite))
    })));
  }
  if (existing.photos?.length || existing.videos?.length) {
    const photos = (existing.photos || []).map((blob, i) => ({
      id: `existing-photo-${i}`,
      type: 'photo' as const,
      dataUrl: blob.getDirectURL(),
      name: `photo-${i+1}.jpg`
    }));
    const videos = (existing.videos || []).map((blob, i) => ({
      id: `existing-video-${i}`,
      type: 'video' as const,
      dataUrl: blob.getDirectURL(),
      name: `video-${i+1}.mp4`
    }));
    setMediaFiles([...photos, ...videos]);
  }
  ```
- Faire pareil dans Effect 2 (actor-dependent)

### 4. PlanningInterventionModal.tsx — handleSave edit mode
- En mode édition, convertir les mediaFiles en blobs exactement comme en mode création
- Appeler modifierIntervention avec l'input complet incluant pièces + photos + vidéos
- Invalider : [facturationInterventions], [clientsInterventions], [planningItems], [journees]
