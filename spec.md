# Vialtraite Service - Version 69

## Current State
Application de gestion du temps de travail multi-utilisateur. Backend Motoko avec stockage persistant (mémoire stable). Plusieurs bugs actifs :
1. Enregistrement journée/intervention dans calendrier échoue avec "erreur lors de l'enregistrement, vérifiez votre connexion" — causé par `AccessControl.hasPermission(caller, #user)` qui rejette les utilisateurs non-assignés au rôle #user.
2. Publication de mémo échoue avec "actor.creerMemo is not a function" — les déclarations candid frontend sont périmées ET la permission #user est requise.
3. Section Mémo a une barre déroulante de profil à supprimer.
4. Section Rapports : dropdown profil vide car les utilisateurs n'ont pas explicitement sauvegardé leur profil.

## Requested Changes (Diff)

### Add
- Auto-enregistrement du profil utilisateur lors du premier enregistrement de journée (pour qu'il apparaisse dans obtenirTousLesProfils)

### Modify
- Supprimer la restriction `AccessControl.hasPermission(#user)` sur toutes les fonctions — remplacer par une vérification simple : tout principal non-anonyme peut effectuer des opérations (sauf admin functions)
- `creerMemo` : accessible à tout utilisateur authentifié (non-anonyme)
- `enregistrerJournee` : auto-sauvegarder le profil utilisateur avec nom générique si pas encore sauvegardé
- Tous les autres endpoints : vérification principal non-anonyme uniquement

### Remove
- Dans section Mémo (frontend) : supprimer le dropdown de sélection de profil
- Les vérifications `AccessControl.hasPermission(caller, #user)` qui bloquent les utilisateurs normaux

## Implementation Plan
1. Régénérer le backend Motoko avec EXACTEMENT les mêmes noms de variables stables et types — permettre à tout utilisateur authentifié d'agir
2. Supprimer dropdown profil dans Memo.tsx
3. Corriger l'enregistrement dans Calendar.tsx — utiliser actor directement pour journée ET interventions
4. S'assurer que Reports.tsx charge les profils via obtenirTousLesProfils (déjà public, no auth required)
