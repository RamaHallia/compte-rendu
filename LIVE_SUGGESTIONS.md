# 🎯 Suggestions en temps réel - Documentation

## Vue d'ensemble

La fonctionnalité de **suggestions en temps réel** analyse votre réunion pendant l'enregistrement et vous propose des insights intelligents pour améliorer la qualité de votre compte-rendu.

## Comment ça fonctionne

### 1. Analyse automatique
- **Toutes les 3 minutes** pendant l'enregistrement
- L'IA analyse automatiquement ce qui vient d'être dit
- Génère des suggestions pertinentes sans interrompre la réunion

### 2. Types de suggestions

#### 📝 Résumé du segment
Un résumé concis (2-3 phrases) de ce qui vient d'être discuté

#### ✅ Points clés
Les éléments importants identifiés dans ce segment

#### 💡 Questions à clarifier
Suggestions de questions pour obtenir plus de détails ou clarifier des points ambigus

#### 🎯 Sujets à explorer
Sujets pertinents qui n'ont pas encore été abordés

### 3. Interface utilisateur

#### Mode compact (par défaut)
- Notification discrète en haut à droite
- Affiche le résumé et le nombre de suggestions
- Ne gêne pas la réunion en cours

#### Mode étendu (au clic)
- Panel détaillé avec toutes les informations
- Historique de tous les segments analysés
- Possibilité de fermer ou réduire à tout moment

## Architecture technique

### Fichiers créés

1. **`supabase/functions/analyze-partial/index.ts`**
   - Edge Function pour l'analyse par l'IA
   - Utilise GPT-4o-mini pour rapidité et coût
   - Retourne un JSON structuré avec les suggestions

2. **`src/hooks/useLiveSuggestions.ts`**
   - Hook React pour gérer l'état des suggestions
   - Appelle la fonction Edge d'analyse
   - Maintient l'historique des analyses

3. **`src/components/LiveSuggestions.tsx`**
   - Composant d'affichage des suggestions
   - Versions compacte et étendue
   - Animations et design soigné

### Modifications apportées

1. **`src/hooks/useAudioRecorder.ts`**
   - Ajout de `getPartialAudio()` pour récupérer les segments
   - MediaRecorder configuré pour découper toutes les 3 minutes
   - Gestion des chunks partiels

2. **`src/App.tsx`**
   - Intégration du hook `useLiveSuggestions`
   - Timer pour déclencher l'analyse toutes les 3 minutes
   - Affichage du composant `LiveSuggestions`

3. **`src/index.css`**
   - Animation `slide-in-right` pour l'apparition des suggestions

## Déploiement

### 1. Déployer la nouvelle Edge Function

```bash
npx supabase functions deploy analyze-partial
```

Ou via le Dashboard Supabase :
1. Edge Functions → New function
2. Nom : `analyze-partial`
3. Coller le contenu de `supabase/functions/analyze-partial/index.ts`

### 2. Variables d'environnement

La fonction utilise la même clé API OpenAI que les autres fonctions :
- `OPENAI_API_KEY` doit être configurée dans Supabase

### 3. Tester

1. Lancez l'application : `npm run dev`
2. Démarrez un enregistrement
3. Attendez 3 minutes
4. Une notification apparaîtra en haut à droite avec les premières suggestions

## Coûts estimés

### Par analyse (toutes les 3 minutes)
- Modèle : GPT-4o-mini
- Tokens moyens : ~300-500 tokens
- Coût : ~$0.001-0.002 par analyse
- **Pour une réunion de 30 minutes** : ~$0.01-0.02

### Comparaison
- Beaucoup moins cher que le résumé final (GPT-4o)
- Optimisé pour la rapidité et le coût

## Limitations actuelles

1. **Intervalle fixe** : 3 minutes (peut être ajusté dans le code)
2. **Pas de transcription en temps réel visible** : l'analyse se fait en arrière-plan
3. **Nécessite une connexion internet stable** : pour l'analyse par l'IA

## Améliorations futures possibles

1. **Intervalle configurable** : permettre à l'utilisateur de choisir (2, 3 ou 5 minutes)
2. **Historique persistant** : sauvegarder les suggestions dans la base de données
3. **Notifications sonores optionnelles** : alerter quand une suggestion importante arrive
4. **Export des suggestions** : inclure dans le compte-rendu final
5. **Suggestions proactives** : détecter automatiquement les moments clés (décisions, actions)

## Troubleshooting

### Les suggestions n'apparaissent pas
- Vérifier que la fonction Edge est bien déployée
- Vérifier les logs dans Supabase Dashboard
- S'assurer que l'enregistrement dure au moins 3 minutes

### Erreurs dans les logs
- Vérifier que `OPENAI_API_KEY` est configurée
- Vérifier que l'enregistrement contient bien de l'audio

### Performance
- L'analyse se fait en arrière-plan
- Ne ralentit pas l'enregistrement
- Utilise un modèle rapide (GPT-4o-mini)

## Support

Pour toute question ou problème, vérifiez :
1. Les logs Supabase Edge Functions
2. La console du navigateur
3. Que toutes les dépendances sont à jour

