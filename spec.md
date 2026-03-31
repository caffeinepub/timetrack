# Vial Traite Service — Mode Offline

## Current State
L'application est entièrement connectée au backend ICP. Aucune fonctionnalité offline n'existe. Le Planning (`src/frontend/src/pages/Planning.tsx`) charge les données via l'acteur backend. `PlanningInterventionModal.tsx` permet de remplir et valider une fiche intervention depuis le Planning, en envoyant directement au backend.

## Requested Changes (Diff)

### Add
- **Service Worker** (`src/frontend/public/sw.js`) : mise en cache des ressources statiques de l'app pour fonctionnement offline
- **Hook `useOfflineSync`** (`src/frontend/src/hooks/useOfflineSync.ts`) : gestion de l'état réseau (online/offline), file d'attente des fiches à synchroniser stockée en IndexedDB, synchronisation automatique au retour de la connexion
- **Hook `useOfflinePlanning`** (`src/frontend/src/hooks/useOfflinePlanning.ts`) : mise en cache des missions du Planning dans localStorage/IndexedDB à chaque chargement online, lecture depuis le cache quand offline
- **Indicateur offline** dans `Header.tsx` : bandeau rouge visible quand hors ligne, badge vert à la synchronisation, compteur de fiches en attente
- **Enregistrement offline dans `PlanningInterventionModal.tsx`** : si hors ligne, sauvegarder la fiche (description, pièces, heures, photos en base64, signature client) dans la file d'attente IndexedDB au lieu d'appeler le backend

### Modify
- **`Planning.tsx`** : utiliser `useOfflinePlanning` pour afficher les missions depuis le cache quand offline (lecture seule, aucune action de modification/création/suppression offline)
- **`PlanningInterventionModal.tsx`** : détecter l'état réseau, adapter le bouton "Enregistrer" ("Sauvegarder hors ligne" si offline), enregistrer dans la file IndexedDB
- **`Header.tsx`** : ajouter l'indicateur offline et le badge de synchronisation en attente
- **`main.tsx`** : enregistrement du Service Worker

### Remove
- Rien

## Implementation Plan
1. Créer `sw.js` dans `public/` : cache shell d'application (stratégie cache-first pour assets statiques, network-first pour appels API)
2. Créer `useOfflineSync.ts` : écouter `window.online/offline`, IndexedDB store `offlineQueue` avec les fiches sérialisées, méthode `addToQueue(intervention)`, méthode `syncQueue(actor)` appelée automatiquement au retour réseau
3. Créer `useOfflinePlanning.ts` : sauvegarder les `PlanningItem[]` dans `localStorage['planning_cache']` à chaque fetch réussi, retourner le cache si offline
4. Modifier `Planning.tsx` : intégrer `useOfflinePlanning`, afficher un badge "Mode hors ligne — données du [date]" quand offline, désactiver les boutons d'action
5. Modifier `PlanningInterventionModal.tsx` : intégrer `useOfflineSync`, si offline : serialiser la fiche + photos en base64 → `addToQueue()`, afficher confirmation "Fiche sauvegardée hors ligne"
6. Modifier `Header.tsx` : indicateur de connexion (rouge = offline), badge orange avec nombre de fiches en attente, toast vert à la synchronisation réussie
7. Enregistrer le Service Worker dans `main.tsx`
