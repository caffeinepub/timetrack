# Vial Traite Service — PWA + Logo

## Current State
L'application a un logo vache emoji (🐄) dans le header, et un logo image sur la page de connexion. Pas de configuration PWA.

## Requested Changes (Diff)

### Add
- Fichier manifest.json pour PWA (installable sur écran d'accueil Android/iPhone)
- Icône PWA 512x512 (tête de vache sobre blanche sur fond bleu marine)
- Meta tags PWA dans index.html
- "Vial Traite Service" en texte blanc en arc autour du logo sur la page de connexion

### Modify
- index.html : ajouter les balises PWA (manifest, theme-color, apple-touch-icon)
- Login page : affichage de "Vial Traite Service" en blanc en arc autour de l'image du logo
- Header : remplacer l'emoji 🐄 par l'image du logo vache (visible sur desktop et mobile)

### Remove
- Emoji 🐄 dans le badge du header

## Implementation Plan
1. Créer public/manifest.json avec nom, icônes et couleurs de thème
2. Mettre à jour index.html avec les balises PWA
3. Mettre à jour la page de connexion avec SVG arc text autour du logo
4. Mettre à jour Header.tsx pour utiliser l'image du logo au lieu de l'emoji
