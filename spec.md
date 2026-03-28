# Vial Traite Service — Système de Missions

## Current State
L'application gère les journées de travail, interventions, clients, tickets, mémos. La page Calendrier permet à chaque utilisateur de gérer ses propres journées avec lecture seule pour les autres. Le Header affiche le nom d'utilisateur. Il n'existe pas encore de système de missions.

## Requested Changes (Diff)

### Add
- **Type Mission backend** : id, titre, date prévue, createur (Principal), destinataire (Principal), nomCreateur, nomClient, typeMission (depannage/controle/chantier), description, statut (en_attente/acceptee), dateCreation
- **Fonctions backend missions** :
  - `creerMission(input)` : créer une mission pour un autre utilisateur
  - `accepterMission(id)` : le destinataire accepte la mission
  - `redigerMissionVersAutre(id, nouveauDestinataire, nomNouveauDestinataire)` : rediriger vers un autre utilisateur
  - `supprimerMission(id)` : suppression par créateur ou destinataire
  - `obtenirMissionsRecues()` : missions reçues par l'utilisateur connecté
  - `obtenirMissionsCreees()` : missions créées par l'utilisateur connecté
  - `obtenirToutesMissionsAcceptees()` : toutes les missions acceptées (visibles sur tous les calendriers)
  - `compterMissionsEnAttentePourMoi()` : nombre de missions non-validées pour le badge
- **Badge orange dans le Header** : à côté du nom de profil, affiche le nombre de missions en attente (non acceptées) pour l'utilisateur connecté
- **Panel missions dans la page Calendrier** :
  - Section dédiée "Missions" avec onglets : "Reçues" (mes missions à traiter), "Créées" (missions que j'ai créées)
  - Bouton "Créer une mission" ouvert dans un formulaire modal
  - Pour chaque mission reçue en attente : boutons Accepter, Changer la date, Rediriger vers un autre utilisateur
  - Missions acceptées visibles sur le calendrier de tous en lecture seule (section "Missions" du calendrier)
  - Bouton Supprimer visible pour le créateur ET le destinataire

### Modify
- **Header** : ajouter badge orange mission count à côté du nom utilisateur
- **Page Calendrier** : ajouter section mission sous le calendrier des journées
- **backend.d.ts** : ajouter les nouveaux types et fonctions missions
- **backend.did.js** et **backend.did.d.ts** : synchroniser avec le nouveau backend

### Remove
- Rien

## Implementation Plan
1. Générer le code Motoko avec les nouvelles fonctions missions
2. Mettre à jour backend.d.ts avec les types et fonctions missions
3. Modifier Header.tsx pour afficher le badge orange missions
4. Modifier Calendar.tsx pour intégrer la section missions complète (formulaire création, liste missions reçues/créées, missions acceptées sur calendrier)
