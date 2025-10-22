# 💡 Fonctionnalité Suggestions - Documentation

## Vue d'ensemble

Les suggestions sont générées automatiquement pendant l'enregistrement d'une réunion, toutes les 30 secondes, et sont sauvegardées dans la base de données pour consultation ultérieure.

## 🗄️ Structure de données

### Base de données (PostgreSQL)

```sql
-- Colonne ajoutée à la table meetings
ALTER TABLE meetings
ADD COLUMN suggestions JSONB DEFAULT '[]'::jsonb;
```

### Interface TypeScript

```typescript
export interface LiveSuggestion {
  segment_number: number;
  summary: string;
  key_points: string[];
  suggestions: string[];
  topics_to_explore: string[];
  timestamp: number;
}

export interface Meeting {
  // ... autres champs
  suggestions: LiveSuggestion[];
}
```

## 🔄 Flux de fonctionnement

### 1. Pendant l'enregistrement

```
Enregistrement démarre
    ↓
Toutes les 30 secondes
    ↓
Audio partiel capturé
    ↓
Transcription (OpenAI Whisper)
    ↓
Analyse IA (GPT-4o-mini)
    ↓
Suggestion générée et affichée
    ↓
Ajoutée au state `suggestions[]`
```

### 2. À la fin de l'enregistrement

```
Arrêt enregistrement
    ↓
Transcription complète
    ↓
Résumé IA final
    ↓
Sauvegarde en base de données:
  - transcript
  - summary
  - suggestions[] ← Toutes les suggestions
```

### 3. Consultation historique

```
Ouvrir une réunion
    ↓
3 onglets disponibles:
  - Résumé
  - Transcription
  - Suggestions ← Nouveau !
```

## 📊 Affichage des suggestions

### Pendant l'enregistrement

- **Bloc "Points à clarifier"** toujours visible
- **Animation de loading** (ampoule qui bounce) tant qu'il n'y a pas de suggestions
- **Affichage progressif** des 5 dernières suggestions
- **Animation slide-in** pour chaque nouvelle suggestion

### En historique (onglet Suggestions)

Pour chaque segment :
- 🔢 **Numéro du segment** + horodatage
- 📝 **Résumé partiel** du segment
- 🔑 **Points clés** identifiés
- ❓ **Points à clarifier** (questions)
- 🔍 **Sujets à explorer** (tags)

## 🛠️ Migration de la base de données

### Pour appliquer la migration

```bash
# Via Supabase CLI
supabase db push

# Ou manuellement dans le Dashboard Supabase
# SQL Editor → Exécuter le fichier :
# supabase/migrations/20251013000000_add_suggestions_to_meetings.sql
```

### Vérification

```sql
-- Vérifier que la colonne existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'meetings' AND column_name = 'suggestions';

-- Doit retourner:
-- column_name | data_type
-- suggestions | jsonb
```

## 📝 Exemple de données

### Suggestion dans la base

```json
[
  {
    "segment_number": 1,
    "summary": "Discussion sur le déploiement des Edge Functions",
    "key_points": [
      "Déploiement via menu gauche",
      "Option copier-coller disponible"
    ],
    "suggestions": [
      "Clarifier l'accès à la fonction Transcribe Audio",
      "Vérifier la configuration nécessaire"
    ],
    "topics_to_explore": [
      "Permissions",
      "Configuration CLI"
    ],
    "timestamp": 1728847234567
  },
  {
    "segment_number": 2,
    "summary": "Processus post-déploiement",
    "key_points": [
      "Tests à effectuer",
      "Validation de l'accès"
    ],
    "suggestions": [
      "Définir un plan de tests",
      "Documenter la procédure"
    ],
    "topics_to_explore": [
      "Tests",
      "Documentation"
    ],
    "timestamp": 1728847264567
  }
]
```

## 🎨 Design

### Couleurs utilisées

- **Violet/Indigo** pour le thème suggestions
  - `from-purple-50 to-indigo-50` (background)
  - `border-purple-200` (bordures)
  - `text-purple-900` (titres)
  - `bg-purple-500` (badges)

### Composants

1. **Bloc principal** : Gradient violet avec bordure
2. **Segments** : Cartes blanches avec bordure violet clair
3. **Badges** : 
   - Numéro de segment (violet plein)
   - Topics (violet clair)
4. **Icônes** : Ampoule (💡) pour le thème suggestions

## 🚀 Fonctionnalités futures

- [ ] Export des suggestions en PDF
- [ ] Filtrage par type de suggestion
- [ ] Recherche dans les suggestions
- [ ] Graphique d'évolution des topics
- [ ] Suggestions inter-réunions (patterns récurrents)

## 🐛 Dépannage

### Les suggestions ne s'affichent pas en historique

1. Vérifier que la migration a été appliquée :
   ```sql
   SELECT suggestions FROM meetings LIMIT 1;
   ```

2. Vérifier que les suggestions sont bien sauvegardées :
   - Faire un nouvel enregistrement
   - Vérifier la console : "suggestions: [...]]"
   - Vérifier en base que `suggestions` n'est pas null

### Les suggestions ne se génèrent pas pendant l'enregistrement

1. Vérifier les logs console :
   - "Checking for partial audio..."
   - "Transcription de l'audio partiel..."

2. Vérifier l'Edge Function `analyze-partial` :
   ```bash
   supabase functions deploy analyze-partial
   ```

3. Vérifier que l'intervalle de 30s fonctionne :
   - Le premier segment arrive après ~30-60 secondes
   - Les suivants toutes les 30 secondes

## 📚 Fichiers modifiés

1. **Base de données** :
   - `supabase/migrations/20251013000000_add_suggestions_to_meetings.sql`

2. **Types** :
   - `src/lib/supabase.ts` (interface Meeting + LiveSuggestion)

3. **Backend** :
   - `supabase/functions/analyze-partial/index.ts` (déjà existant)

4. **Frontend** :
   - `src/App.tsx` (sauvegarde des suggestions)
   - `src/components/MeetingDetail.tsx` (affichage onglet)
   - `src/hooks/useLiveSuggestions.ts` (déjà existant)

## ✅ Checklist de déploiement

- [ ] Appliquer la migration SQL
- [ ] Déployer l'Edge Function `analyze-partial` (si modifiée)
- [ ] Tester un enregistrement
- [ ] Vérifier l'affichage des suggestions pendant l'enregistrement
- [ ] Vérifier la sauvegarde en base
- [ ] Vérifier l'affichage en historique
- [ ] Tester sur anciennes réunions (affichage vide)

