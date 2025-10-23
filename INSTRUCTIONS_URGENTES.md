# ⚠️ INSTRUCTIONS URGENTES - Créer le bucket meeting-attachments

## Problème actuel

L'erreur **"Bucket not found" (404)** signifie que le bucket `meeting-attachments` n'existe pas dans votre projet Supabase.

## Solution immédiate (5 minutes)

### Étape 1 : Créer le bucket

1. Allez sur votre dashboard Supabase : https://app.supabase.com
2. Sélectionnez votre projet
3. Cliquez sur **Storage** dans le menu de gauche
4. Cliquez sur **New bucket** (Nouveau bucket)
5. Remplissez les informations :
   - **Name** : `meeting-attachments`
   - **Public bucket** : ✅ COCHEZ CETTE CASE (très important)
   - Cliquez sur **Create bucket**

### Étape 2 : Vérifier que le bucket est public

1. Dans **Storage**, cliquez sur le bucket `meeting-attachments`
2. Allez dans l'onglet **Configuration**
3. Vérifiez que **Public bucket** est bien activé (ON)

### Étape 3 : Configurer les politiques d'accès

1. Toujours dans le bucket `meeting-attachments`
2. Allez dans l'onglet **Policies**
3. Cliquez sur **New policy**
4. Sélectionnez **Get started quickly** puis **Allow public read access**
5. Ou créez une politique personnalisée :

```sql
-- Lecture publique
CREATE POLICY "Public can view meeting attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'meeting-attachments');
```

### Étape 4 : Tester le lien

Une fois le bucket créé et configuré comme public, testez à nouveau le lien :

```
https://hgpwuljzgtlrwudhqtuq.supabase.co/storage/v1/object/public/meeting-attachments/a7b9146c-a7f1-4cab-bc19-3086802a243e/email-attachments/1760210579790.pdf
```

Si le fichier existe, il devrait se télécharger.

## Créer également le bucket logos (si non existant)

Répétez les mêmes étapes pour créer le bucket `logos` :

1. **Storage** > **New bucket**
2. **Name** : `logos`
3. **Public bucket** : ✅ COCHEZ CETTE CASE
4. **Create bucket**
5. Ajoutez la politique de lecture publique :

```sql
CREATE POLICY "Public can view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');
```

## Politique complète pour meeting-attachments

Si vous préférez configurer toutes les politiques d'un coup, allez dans **SQL Editor** et exécutez :

```sql
-- Lecture publique (ESSENTIEL pour les liens email)
CREATE POLICY "Public can view meeting attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'meeting-attachments');

-- Upload pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload meeting attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'meeting-attachments');

-- Mise à jour pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can update meeting attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'meeting-attachments');

-- Suppression pour utilisateurs authentifiés
CREATE POLICY "Authenticated users can delete meeting attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'meeting-attachments');
```

## Vérification finale

### 1. Vérifier que les buckets existent

Dans **Storage**, vous devriez voir :
- ✅ `meeting-attachments` (Public)
- ✅ `logos` (Public)

### 2. Vérifier les politiques

Dans **SQL Editor**, exécutez :

```sql
SELECT * FROM storage.buckets WHERE name IN ('meeting-attachments', 'logos');
```

Résultat attendu : 2 lignes avec `public = true`

### 3. Tester l'upload

1. Revenez dans l'application
2. Ouvrez une réunion
3. Ajoutez un document joint
4. Cliquez sur "Envoyer par email"
5. Le lien du document devrait maintenant fonctionner

## Résumé des actions

- [ ] Créer le bucket `meeting-attachments` (Public ✅)
- [ ] Créer le bucket `logos` (Public ✅)
- [ ] Ajouter la politique de lecture publique pour `meeting-attachments`
- [ ] Ajouter la politique de lecture publique pour `logos`
- [ ] Tester les liens dans les emails

## Si le problème persiste

Si après avoir créé les buckets, les fichiers existants renvoient toujours 404 :

1. **Les fichiers n'existent peut-être pas** - Ils ont été uploadés avant la création du bucket
2. **Solution** : Re-télécharger les fichiers depuis l'application
3. Dans l'application, allez dans la réunion concernée
4. Supprimez les anciens documents joints
5. Ajoutez-les à nouveau
6. Les nouveaux liens fonctionneront

## Besoin d'aide ?

Si vous rencontrez des difficultés :
1. Vérifiez dans **Storage** > **meeting-attachments** que vous voyez bien les fichiers
2. Vérifiez que l'icône 🌐 (globe) est visible à côté du nom du bucket (= public)
3. Consultez les logs dans l'onglet **Logs** de Supabase

