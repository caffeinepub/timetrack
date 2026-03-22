# Suivi du Temps - Identification obligatoire + sections communes

## Current State
L'application a deux modes :
- **Non connecté** : accès public aux sections Mémo, Rapports, Clients sans identification
- **Connecté** : accès complet à toutes les sections, profil utilisateur requis au premier login

Les sections Mémo, Rapports, Clients partagent déjà les données entre tous les utilisateurs.

## Requested Changes (Diff)

### Add
- Page d'accueil / écran de connexion obligatoire : toute l'application nécessite une identification Internet Identity
- Affichage du nom de profil après connexion, obligatoire avant accès

### Modify
- App.tsx : supprimer le mode "public sans connexion" -- si non connecté, afficher uniquement l'écran de connexion
- Navigation : toutes les sections (Mémo, Rapports, Clients, Dashboard, Calendrier) accessibles uniquement après identification
- Mémo, Rapports, Clients : rester communes/partagées entre tous les utilisateurs connectés (inchangé au niveau backend)

### Remove
- Accès public sans connexion à Mémo, Rapports, Clients
- Navigation publique sans login

## Implementation Plan
1. Modifier App.tsx : si non authentifié, afficher page de connexion dédiée (pas de navigation publique)
2. La page de connexion affiche le bouton Internet Identity et un message explicatif
3. Après connexion, si profil non configuré, afficher le dialog de configuration du nom
4. Toutes les sections restent montées/accessibles uniquement pour les utilisateurs authentifiés avec un profil
5. Mémo, Rapports, Clients continuent de partager les données entre tous les utilisateurs connectés (logique backend inchangée)
