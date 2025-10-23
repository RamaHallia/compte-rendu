# Instructions de déploiement - Chiffrement SMTP

## ✅ Modifications effectuées

Tous les fichiers ont été modifiés et sont prêts pour le déploiement :

1. ✅ **Migration SQL créée** : `supabase/migrations/20251023000002_add_smtp_password_encryption.sql`
2. ✅ **Edge function modifiée** : `supabase/functions/send-email-smtp/index.ts` (compatible avec ancien et nouveau système)
3. ✅ **Frontend modifié** : `src/components/Settings.tsx` (compatible avec ancien et nouveau système)

## ⚡ Important : Compatibilité rétroactive

Le code a été modifié pour fonctionner **AVANT ET APRÈS** la migration :
- ✅ Si la migration n'est pas appliquée : utilise `smtp_password` (ancien système)
- ✅ Si la migration est appliquée : utilise `smtp_password_encrypted` (nouveau système chiffré)
- ✅ Vous pouvez déployer le frontend et l'edge function **AVANT** d'appliquer la migration
- ✅ L'application continue de fonctionner pendant la transition

## 📋 Étapes de déploiement (ordre recommandé)

### Option A : Déploiement progressif (recommandé)

Cette méthode permet de tester avant d'appliquer le chiffrement.

#### Étape 1 : Déployer le Frontend MAINTENANT

Le frontend fonctionne déjà avec l'ancien système :

```bash
npm run build
# Puis déployez le dossier dist/ selon votre méthode habituelle
```

✅ **Testez maintenant** : Allez dans Paramètres, configurez SMTP et sauvegardez. Ça devrait fonctionner !

#### Étape 2 : Déployer l'Edge Function

1. Ouvrez le fichier `supabase/functions/send-email-smtp/index.ts`
2. Copiez TOUT le contenu du fichier
3. Allez sur https://supabase.com/dashboard
4. Sélectionnez votre projet
5. Cliquez sur **Edge Functions** dans le menu de gauche
6. Trouvez la fonction **send-email-smtp**
7. Cliquez dessus pour l'éditer
8. Collez le nouveau contenu
9. Cliquez sur **Deploy** ou **Save**
10. ✅ Attendez que le déploiement soit terminé

✅ **Testez à nouveau** : Envoyez un email de test. Ça devrait toujours fonctionner !

#### Étape 3 : Appliquer la migration SQL (quand vous êtes prêt)

⚠️ **Attention** : Cette étape supprime la colonne `smtp_password` en clair. Une fois appliquée, vous ne pourrez plus revenir en arrière facilement.

1. Ouvrez le fichier `supabase/migrations/20251023000002_add_smtp_password_encryption.sql`
2. Copiez TOUT le contenu du fichier
3. Allez sur https://supabase.com/dashboard
4. Sélectionnez votre projet
5. Cliquez sur **SQL Editor** dans le menu de gauche
6. Cliquez sur **New Query**
7. Collez le contenu copié
8. Cliquez sur **Run** (ou Ctrl+Enter)
9. ✅ Vérifiez qu'il n'y a pas d'erreur

✅ **Test final** :
1. Allez dans Paramètres
2. Vous devriez voir `••••••••` dans le champ mot de passe (si un mot de passe existe)
3. Pour mettre à jour : entrez un nouveau mot de passe et sauvegardez
4. Envoyez un email de test

### Option B : Déploiement rapide

Si vous êtes confiant et voulez tout faire d'un coup :

1. **Déployez le frontend** (npm run build)
2. **Déployez l'edge function** (copiez-collez dans Supabase)
3. **Appliquez la migration SQL** (copiez-collez dans SQL Editor)
4. **Testez**

## 🧪 Tests après déploiement

### Test 1 : Vérifier la migration

Dans **SQL Editor** de Supabase :

```sql
-- Vérifier que les fonctions existent
SELECT proname FROM pg_proc WHERE proname IN ('encrypt_smtp_password', 'decrypt_smtp_password');
-- Résultat attendu : 2 lignes

-- Vérifier que la colonne existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_settings' AND column_name = 'smtp_password_encrypted';
-- Résultat attendu : 1 ligne avec data_type = 'bytea'
```

### Test 2 : Configurer SMTP

1. Allez dans l'application
2. Cliquez sur **Paramètres**
3. Sélectionnez **SMTP** comme méthode d'envoi
4. Remplissez vos informations SMTP :
   - Host : `smtp.gmail.com` (exemple)
   - Port : `587`
   - User : votre email
   - Password : votre mot de passe
5. Cliquez sur **Enregistrer**
6. ✅ Pas d'erreur = succès

### Test 3 : Vérifier le chiffrement

Dans **SQL Editor** :

```sql
SELECT
  user_id,
  smtp_host,
  smtp_user,
  length(smtp_password_encrypted) as encrypted_length
FROM user_settings
WHERE smtp_password_encrypted IS NOT NULL;
```

✅ Vous devriez voir une valeur dans `encrypted_length` (ex: 128, 256, etc.)

### Test 4 : Envoyer un email de test

1. Créez une nouvelle réunion (ou utilisez une existante)
2. Cliquez sur le bouton **Email**
3. Remplissez les destinataires
4. Cliquez sur **Envoyer**
5. ✅ L'email doit être envoyé avec succès

## ❌ En cas d'erreur

### Erreur : "Function encrypt_smtp_password does not exist"

➡️ La migration n'a pas été appliquée correctement. Retournez à l'Étape 1.

### Erreur : "Failed to decrypt SMTP password"

➡️ Vérifiez que vous avez bien enregistré un nouveau mot de passe après avoir appliqué la migration.

Pour réinitialiser :
1. Allez dans Paramètres
2. Entrez à nouveau votre mot de passe SMTP
3. Sauvegardez

### Erreur : "Column smtp_password does not exist"

➡️ C'est normal ! La migration a supprimé cette colonne. Vérifiez que l'Edge Function a bien été redéployée (Étape 2).

### Erreur lors de la sauvegarde des paramètres

Vérifiez dans les logs de votre navigateur (F12 > Console) :
- Si vous voyez "Erreur de chiffrement", la migration n'est pas appliquée
- Si vous voyez "Unknown column", l'Edge Function n'est pas déployée

## 🔐 Vérification de sécurité

Après déploiement, vérifiez que les mots de passe ne sont plus lisibles :

```sql
-- Ceci NE doit PAS afficher de mot de passe en clair
SELECT smtp_host, smtp_user, smtp_password_encrypted
FROM user_settings;
```

✅ Si vous voyez des données binaires (ex: `\x89504e47...`), c'est bon !

## 📝 Notes importantes

- 🔒 Les mots de passe existants sont automatiquement migrés par la migration
- 🔒 Les utilisateurs doivent re-saisir leur mot de passe s'ils voient `••••••••` dans les paramètres
- 🔒 Il est **impossible** de récupérer un mot de passe chiffré (c'est voulu pour la sécurité)
- 🔒 Chaque utilisateur a sa propre clé de chiffrement basée sur son `user_id`

## ✨ Vous êtes prêt !

Une fois ces 3 étapes complétées, vos mots de passe SMTP seront chiffrés avec AES-256 dans la base de données. 🎉

