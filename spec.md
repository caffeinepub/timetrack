# Vial Traite Service

## Current State
Page Planning avec vue mensuelle et vue hebdomadaire (tableau lun-ven). Filtres par utilisateur/type/statut. Bouton Accepter mission. Création de missions depuis tableau semaine.

## Requested Changes (Diff)

### Add
- Numéro de téléphone client cliquable (tel:) dans les fiches mission (vue mois et vue semaine)
- Bouton Modifier dans les fiches mission de la vue mois pour éditer client/type/description ET dates

### Modify
- VueSemaine reçoit `filteredItems` au lieu de `allItems` pour que les filtres s'appliquent dans les deux vues
- handleAccept : remplacer `accepterEtCreerEbauche` (inexistant) par `accepterPlanningItem` + `ajouterInterventionPourUtilisateur` pour chaque date de la mission
- handleEditDatesSubmit : s'assurer que l'adresse client est transmise lors de la création d'interventions pour nouvelles dates
- Dialog "Modifier" dans vue mois : permettre modification de client/type/description en plus des dates

### Remove
Rien

## Implementation Plan
1. Changer `allItems={allItems}` en `allItems={filteredItems}` dans le rendu VueSemaine
2. Corriger handleAccept : `accepterPlanningItem(id)` + boucle `ajouterInterventionPourUtilisateur` pour chaque date
3. Ajouter lookup téléphone client depuis tableau `clients` dans les cartes mission (selectedDayItems et cellItems)
4. Enrichir le dialog Modifier pour inclure client/type/description + dates
5. Valider build
