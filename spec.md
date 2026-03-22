# Vial Traite Service

## Current State
L'application utilise un thème bleu marine, orange et vert. Le vert est présent principalement comme couleur de succès et dans la décoration d'herbe sur la page de connexion. L'orange domine les accents (boutons, indicateurs actifs, bordures de section).

## Requested Changes (Diff)

### Add
- Vert herbe visible sur les bordures, séparateurs, badges et accents secondaires dans toutes les pages
- Bande verte en bas du header (border-bottom verte)
- Indicateur actif vert dans la barre de navigation mobile
- Touches de vert herbe dans les sections (Calendrier, Tableau de bord, Mémo, Facturation, Clients)

### Modify
- `index.css` : renforcer le token `--vts-green` pour qu'il soit plus présent, ajouter des utilitaires `.bg-vts-green`, `.text-vts-green`, `.border-vts-green`
- `Header.tsx` : ajouter une bordure verte en bas du header
- `MobileBottomNav.tsx` : ajouter une ligne verte en bas du nav ou changer les indicateurs actifs en vert
- `page-header` CSS : utiliser le vert comme couleur de la bordure gauche (alternatif à l'orange)
- Section headers dans les pages : touches de vert herbe

### Remove
Rien à supprimer

## Implementation Plan
1. Mettre à jour `index.css` : renforcer la présence du vert herbe, ajouter utilitaires
2. Mettre à jour `Header.tsx` : bordure inférieure verte
3. Mettre à jour `MobileBottomNav.tsx` : indicateur actif en vert herbe
4. Mettre à jour les pages (Dashboard, Calendar, Memo, Facturation, Clients) : ajouter des touches de vert herbe (badges, bordures, séparateurs)
