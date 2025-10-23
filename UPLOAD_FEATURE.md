# Fonctionnalité d'Upload avec Traitement en Arrière-Plan

## Taille Maximale des Fichiers

La taille maximale dépend de votre configuration serveur FastAPI :
- **Par défaut** : Pas de limite stricte côté client
- **Recommandé** : Jusqu'à plusieurs centaines de MB
- Le serveur découpe automatiquement les fichiers en segments de 15 minutes
- Chaque segment est traité en parallèle pour optimiser la vitesse

## Traitement en Arrière-Plan

### Caractéristiques
1. **Persistance** : L'état du traitement est sauvegardé dans le localStorage
2. **Navigation libre** : Vous pouvez changer de page pendant le traitement
3. **Indicateur visuel** : Une notification en bas à droite affiche la progression
4. **Notification de fin** : Un message vous informe quand la transcription est prête

### États du Traitement
- **En cours** : Icône de chargement animée avec la progression
- **Terminé** : Icône de succès avec un bouton "Voir le résultat"
- **Erreur** : Icône d'erreur avec le message d'erreur

### Fonctionnement
1. Vous uploadez un fichier audio (MP3, WAV, M4A, WebM, OGG, FLAC, etc.)
2. Le fichier est envoyé au serveur qui le traite automatiquement
3. Vous pouvez naviguer librement pendant le traitement
4. Une notification persistante affiche la progression en bas à droite
5. Quand le traitement est terminé, un bouton apparaît pour voir le résultat
6. Cliquer sur "Voir le résultat" vous amène directement à la réunion

### Avantages
- Pas de perte de données si vous changez d'onglet
- Pas de perte de données si vous naviguez dans l'application
- Indication claire de l'état du traitement
- Accès direct au résultat une fois terminé

## Configuration

### Variables d'environnement
```env
VITE_TRANSCRIBE_LONG_URL=https://votre-serveur.com/transcribe_long
```

Si non définie, le système utilise automatiquement `VITE_TRANSCRIBE_URL` avec `/transcribe_long` à la fin.

## Notes Techniques
- Le hook `useBackgroundProcessing` gère l'état persistant des tâches
- Le composant `BackgroundProcessingIndicator` affiche les notifications
- Les tâches sont stockées dans le localStorage avec la clé `background_tasks`
- Les tâches terminées peuvent être supprimées manuellement
