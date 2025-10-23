# Instructions de déploiement

## Pour tester les nouvelles fonctionnalités de transcription avec timestamps

Les modifications de la fonction `transcribe-audio` ont été faites pour ajouter :
- Timestamps toutes les 10 secondes
- Paragraphes structurés
- Détection des silences

### Option 1 : Déployer via Supabase Dashboard (Recommandé)

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet `hgpwuljzgtlrwudhqtuq`
3. Dans le menu de gauche, cliquez sur **Edge Functions**
4. Trouvez la fonction `transcribe-audio`
5. Cliquez sur **Deploy**
6. Copiez-collez le contenu du fichier `/Users/rama/Downloads/compte-rendu/supabase/functions/transcribe-audio/index.ts`
7. Cliquez sur **Deploy**

### Option 2 : Déployer via CLI (Si vous avez configuré Supabase CLI)

```bash
cd /Users/rama/Downloads/compte-rendu
npx supabase functions deploy transcribe-audio
```

### Après le déploiement

1. Faites un nouvel enregistrement dans votre application
2. Allez dans Supabase Dashboard → Edge Functions → transcribe-audio → Logs
3. Vous verrez les logs de formatage :
   - "Formatting X segments"
   - "Segment 0: start=..., text=..."
   - "Final formatted text length: ..."

### Si ça ne fonctionne toujours pas

Si après le déploiement vous ne voyez toujours pas de paragraphes, vérifiez dans les logs si vous voyez :
- "No segments available in result" → L'API Whisper ne retourne pas de segments
- Dans ce cas, je créerai une version alternative qui découpe le texte manuellement

### Remarques importantes

- Le déploiement peut prendre 1-2 minutes
- Les anciennes transcriptions (déjà enregistrées) ne seront pas modifiées
- Seuls les nouveaux enregistrements auront le nouveau format

