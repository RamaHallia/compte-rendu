# Raccourcissement des URLs dans les emails

## Fonctionnalité

Les URLs longues des documents joints sont maintenant affichées de manière plus courte et lisible dans les emails.

## Exemple

### Avant
```
https://hgpwuljzgtlrwudhqtuq.supabase.co/storage/v1/object/public/meeting-attachments/a7b9146c-a7f1-4cab-bc19-3086802a243e/email-attachments/1760210579790.pdf
```

### Après
```
https://hgpwuljzgtlrwudhqtuq.supabase.co/.../1760210579790.pdf
```

## Comment ça fonctionne

### 1. Affichage raccourci (Implémenté)

La fonction `formatUrlForDisplay()` dans `src/services/urlShortener.ts` :
- Garde l'origine de l'URL (domaine Supabase)
- Ajoute `...` au milieu
- Affiche le nom du fichier à la fin
- Limite la longueur totale à 60 caractères

**Le lien reste cliquable et fonctionnel** - seul l'affichage est raccourci.

### 2. Raccourcissement avec base de données (Optionnel)

Pour une solution plus avancée avec des URLs vraiment courtes :

#### A. Exécuter la migration

```sql
-- Dans SQL Editor de Supabase
-- Coller le contenu de supabase/migrations/20251012141000_create_shortened_urls_table.sql
```

#### B. Déployer la fonction Edge

```bash
# Déployer la fonction shorten-url
supabase functions deploy shorten-url
```

#### C. Utiliser dans le code

```typescript
import { shortenUrl } from '../services/urlShortener';

// Raccourcir une URL
const shortUrl = await shortenUrl(longUrl);
// Résultat: https://votre-projet.supabase.co/s/abc12345
```

## Configuration actuelle

✅ **Actif** : Affichage raccourci visuel
❌ **Inactif** : Raccourcissement avec redirection (nécessite fonction Edge)

## Avantages de l'affichage raccourci

1. ✅ Aucune configuration supplémentaire requise
2. ✅ Pas besoin de fonction Edge
3. ✅ Fonctionne immédiatement
4. ✅ Les liens restent accessibles publiquement
5. ✅ Pas de point de défaillance supplémentaire

## Avantages du raccourcissement avec redirection

1. URLs vraiment courtes (ex: `/s/abc123`)
2. Statistiques de clics
3. Gestion centralisée des liens
4. Possibilité de mettre à jour la destination

## Utilisation

Les URLs sont automatiquement raccourcies dans :
- Les emails de compte-rendu
- L'affichage des documents joints
- Les liens partagés

## Test

Pour tester, envoyez un email de compte-rendu :
1. Ouvrez une réunion avec des documents joints
2. Cliquez sur "Envoyer par email"
3. Les URLs affichées seront raccourcies
4. Les liens restent cliquables et fonctionnels

## Désactivation

Pour désactiver le raccourcissement d'affichage, modifiez dans `MeetingDetail.tsx` :

```typescript
// Avant
const displayUrl = formatUrlForDisplay(att.url, 60);

// Après
const displayUrl = att.url;
```

## Personnalisation

Ajustez la longueur maximale dans `MeetingDetail.tsx` :

```typescript
// 60 caractères (défaut)
const displayUrl = formatUrlForDisplay(att.url, 60);

// 80 caractères (plus long)
const displayUrl = formatUrlForDisplay(att.url, 80);

// 40 caractères (plus court)
const displayUrl = formatUrlForDisplay(att.url, 40);
```

## Structure des fichiers

```
src/
├── services/
│   └── urlShortener.ts          # Service de raccourcissement
└── components/
    └── MeetingDetail.tsx         # Utilisation dans les emails

supabase/
├── functions/
│   └── shorten-url/
│       └── index.ts              # Fonction Edge (optionnelle)
└── migrations/
    └── 20251012141000_create_shortened_urls_table.sql
```

## Support

En cas de problème :
1. Vérifiez que le fichier `urlShortener.ts` existe
2. Vérifiez l'import dans `MeetingDetail.tsx`
3. Testez avec `npm run dev`
4. Consultez la console du navigateur pour les erreurs

