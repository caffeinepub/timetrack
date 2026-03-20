# Suivi du Temps - Fiche Intervention dans le Calendrier

## Current State
L'application possède un calendrier interactif, un module client (nom, adresse, téléphone, email, liste noire), et un backend persistant avec journées de travail (TimeEntry). Il n'existe pas encore de fiche intervention liée à un jour du calendrier.

## Requested Changes (Diff)

### Add
- Type `Intervention` en backend : id, date (liée à un jour), clientNom, clientAdresse, heureMatinDebut (h+min), heureMatinFin (h+min), heureApremDebut (h+min), heureApremFin (h+min), description, signatureClient (Text/base64), signatureIntervenant (Text/base64), user Principal, createdAt
- Fonctions backend : ajouterIntervention, modifierIntervention, supprimerIntervention, obtenirInterventionsPourJour (par date)
- Dans le calendrier : bouton "+ Intervention" accessible depuis n'importe quel type de journée (Travail, Congé, Astreinte)
- Formulaire fiche intervention dans une modale : champ nom client avec autocomplétion depuis fichier clients + saisie manuelle, adresse auto-remplie si client sélectionné, heures matin (début/fin) en h+min, heures après-midi (début/fin) en h+min, champ description, canvas signature client (doigt), canvas signature intervenant (doigt)
- Affichage des interventions du jour sous chaque journée du calendrier

### Modify
- Page Calendar : affichage des interventions par jour, bouton d'ajout d'intervention

### Remove
- Rien

## Implementation Plan
1. Ajouter le type Intervention et les 4 fonctions CRUD au backend Motoko
2. Mettre à jour les bindings frontend (backend.d.ts)
3. Créer un hook React pour les interventions (ajout, liste par jour, suppression)
4. Créer le composant InterventionForm (modale) avec : autocomplete client, champs horaires h+min, description, deux canvas de signature au doigt
5. Intégrer le bouton + Intervention et l'affichage des interventions dans la page Calendar
