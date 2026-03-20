# Suivi du Temps - Module Clients

## Current State
Application de suivi du temps de travail avec calendrier, journal, tableau de bord hebdomadaire/mensuel, rapports PDF. Backend Motoko avec gestion des journées, journaux, médias, profils utilisateurs.

## Requested Changes (Diff)

### Add
- Type `Client` dans le backend : id, nom, adresse, telephone, email, listeNoire (Bool), createdAt
- Fonctions backend : ajouterClient, modifierClient, supprimerClient, obtenirClients, basculerListeNoire
- Page "Clients" dans le frontend avec onglet dans la navigation mobile
- Liste des clients avec marquage rouge visible pour ceux en liste noire
- Formulaire ajout/modification client (nom, adresse, téléphone, email)
- Bouton pour mettre/enlever de la liste noire avec confirmation
- Accès lecture+écriture pour tous les utilisateurs authentifiés

### Modify
- App.tsx : ajouter la page Clients dans la navigation
- MobileBottomNav : ajouter icône Clients
- Backend : ajouter stockage clients partagé (visible par tous)

### Remove
- Rien

## Implementation Plan
1. Ajouter les types et fonctions Client dans main.mo (sans restriction par utilisateur — partagé entre tous)
2. Régénérer les bindings frontend
3. Créer le composant page Clients avec liste, formulaire, et marquage liste noire
4. Ajouter l'onglet Clients dans App.tsx et MobileBottomNav
