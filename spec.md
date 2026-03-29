# Vial Traite Service — Vue Semaine Planning

## Current State
La page Planning affiche un calendrier mensuel avec filtres et un bouton "Nouvelle mission" qui ouvre une modale de création. Les missions s'affichent via des points colorés par jour, et un panneau s'ouvre en dessous du calendrier quand on clique sur un jour.

## Requested Changes (Diff)

### Add
- Nouvel onglet "Vue semaine" dans la page Planning (en plus du calendrier mensuel existant)
- La page Planning s'ouvre directement sur cet onglet "Vue semaine" par défaut
- Tableau hebdomadaire Lun→Ven avec :
  - En-tête : 5 colonnes avec date précise (ex. "Lun 29 Mar")
  - En-tête gauche : liste de tous les utilisateurs (une ligne par utilisateur)
  - Navigation semaine précédente / semaine suivante avec dates affichées
  - Cellule vide = fond discret si aucune mission
  - Cellule avec mission = affiche nom client + type + rond coloré (🟠 à réaliser, 🔵 en cours, 🟢 réalisé)
  - Aujourd'hui mis en évidence visuellement
  - Scroll horizontal sur mobile
- Création de mission depuis le tableau : clic sur cellule vide → formulaire inline dans la cellule (jour + utilisateur pré-remplis, champs : client avec autocomplétion, type, description)
- Modification de mission depuis le tableau : clic sur mission existante → formulaire inline dans la cellule

### Modify
- Supprimer le bouton "Nouvelle mission" et sa modale (la création se fait uniquement via le tableau)
- La page Planning s'ouvre sur l'onglet "Vue semaine" au lieu du calendrier mensuel
- Garder le calendrier mensuel existant comme second onglet "Vue mois"

### Remove
- Bouton "Nouvelle mission" en haut de page
- Modale Dialog de création de mission (`showCreate` / `setShowCreate`)

## Implementation Plan
1. Ajouter un état `activeTab: 'semaine' | 'mois'` initialisé à `'semaine'`
2. Ajouter des onglets visuels en haut de la page Planning
3. Créer le composant `VueSemaine` inline dans Planning.tsx :
   - Calcul de la semaine courante (lundi au vendredi)
   - Navigation semaine précédente / suivante
   - Tableau avec une ligne par profil utilisateur et une colonne par jour (Lun-Ven)
   - Dans chaque cellule : liste des missions avec rond coloré + nom client abrégé + type
   - Clic cellule vide → `showInlineCreate` state avec { userId, dateStr } → formulaire inline
   - Clic mission → `showInlineEdit` state avec mission → formulaire inline de modification
4. Formulaire inline de création : client autocomplete (liste clients), type, description, bouton Créer / Annuler
5. Formulaire inline de modification : mêmes champs pré-remplis, bouton Sauvegarder / Annuler / Supprimer
6. Supprimer le bouton "Nouvelle mission" et la Dialog de création du JSX
7. Garder le calendrier mensuel dans l'onglet "Vue mois"
