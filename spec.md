# Vial Traite Service — Planning

## Current State
- L'application dispose d'un système de missions dans Calendar.tsx (MissionsSection.tsx) avec badge orange dans Header.tsx
- Le backend a un type `Mission` et des fonctions: creerMission, accepterMission, supprimerMission, compterMissionsEnAttentePourMoi, obtenirMissionsRecues, obtenirMissionsCreees, obtenirToutesMissionsAcceptees, redigerMissionVersAutre, getAllPendingMissionsForEveryone, getAllCreatedMissionsForCreators
- Navigation: 7 pages (dashboard, calendar, memo, facturation, clients, ticket-resto, ticket-essence)
- Les interventions validées dans le calendrier sont stockées avec `valide: true` dans InterventionAvecPieces

## Requested Changes (Diff)

### Add
- Nouveau type backend `PlanningItem`: id, titre, date(s), intervenant (Principal), nomIntervenant, nomCreateur, createur (Principal), clientNom, typeMission (depannage/controle/chantier), description, statut (a_realiser/execute), dates: [Time] (multi-jour)
- Fonctions backend: creerPlanningItem, modifierDatesPlanningItem, supprimerPlanningItem, obtenirTousPlanningItems, obtenirPlanningItemsParJour
- Nouvelle page `Planning.tsx` dans src/frontend/src/pages/
- Ajout de la page "planning" dans le type Page de App.tsx
- Ajout dans MobileBottomNav et DesktopSideNav

### Modify
- Backend: supprimer toutes les fonctions et le type Mission (creerMission, accepterMission, redigerMissionVersAutre, supprimerMission, compterMissionsEnAttentePourMoi, obtenirMissionsRecues, obtenirMissionsCreees, obtenirToutesMissionsAcceptees, getAllPendingMissionsForEveryone, getAllCreatedMissionsForCreators)
- App.tsx: ajouter page "planning", importer Planning
- Header.tsx: supprimer le badge mission (compterMissionsEnAttentePourMoi)
- Calendar.tsx: supprimer MissionsSection et le badge mission
- MobileBottomNav: ajouter Planning, retirer mission
- DesktopSideNav: ajouter Planning

### Remove
- Supprimer MissionsSection.tsx
- Supprimer tout le code lié aux missions dans Calendar.tsx
- Supprimer badge mission dans Header.tsx

## Implementation Plan
1. Regénérer backend Motoko avec nouveau type PlanningItem (sans Mission)
2. Les interventions validées dans le calendrier (valide=true) apparaissent automatiquement dans le Planning avec statut "execute" via obtenirTousPlanningItems qui agrège aussi les PlanningItems créés depuis Planning
3. Créer Planning.tsx: calendrier mensuel, badges du jour (orange=à réaliser aujourd'hui, vert=exécuté aujourd'hui), filtres par intervenant/type/statut, formulaire de création multi-jours, détail par jour au clic, actions destinataire (changer date, ajouter jours, valider, supprimer)
4. Mettre à jour navigation et App.tsx
5. Supprimer MissionsSection.tsx et code mission dans Calendar.tsx et Header.tsx
