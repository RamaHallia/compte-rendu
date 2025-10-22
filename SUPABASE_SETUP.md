# Configuration Supabase

## Étapes de configuration

### 1. Créer les buckets de stockage

Allez dans **Storage** dans votre dashboard Supabase et créez les buckets suivants :

#### Bucket `logos`
- **Nom** : `logos`
- **Public** : Oui ✅
- **Politique de fichiers** : Allowed file types: image/*

#### Bucket `meeting-attachments`
- **Nom** : `meeting-attachments`
- **Public** : Oui ✅
- **Politique de fichiers** : Tous types de fichiers autorisés

### 2. Exécuter les migrations

Les migrations SQL se trouvent dans le dossier `supabase/migrations/`. Exécutez-les dans l'ordre chronologique depuis le SQL Editor de Supabase :

```bash
supabase/migrations/
├── 20251010201237_create_meetings_table.sql
├── 20251010220855_add_participant_and_attachments_to_meetings.sql
├── 20251010223147_add_email_attachments_to_meetings.sql
├── 20251011182746_add_notes_to_meetings.sql
├── 20251011185248_create_user_settings_table.sql
├── 20251011185629_update_user_settings_add_email_provider.sql
├── 20251011190948_add_is_connected_to_user_settings.sql
├── 20251011191827_remove_imap_from_user_settings.sql
├── 20251012105226_add_signature_to_user_settings.sql
├── 20251012105422_simplify_signature_fields.sql
├── 20251012105918_add_logos_bucket_policies.sql
└── 20251012140000_add_meeting_attachments_bucket_policies.sql (NOUVEAU)
```

### 3. Vérifier les politiques RLS

#### Pour le bucket `logos`

```sql
-- Vérifier les politiques
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE '%logos%';
```

#### Pour le bucket `meeting-attachments`

```sql
-- Vérifier les politiques
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE '%meeting%';
```

### 4. Configuration manuelle (alternative)

Si les migrations ne fonctionnent pas, vous pouvez configurer manuellement dans le dashboard Supabase :

#### Storage > Policies > meeting-attachments

1. **Policy pour lecture publique** :
   - Name: `Public can view meeting attachments`
   - Policy command: `SELECT`
   - Target roles: `public`
   - USING expression: `bucket_id = 'meeting-attachments'`

2. **Policy pour upload** :
   - Name: `Authenticated users can upload meeting attachments`
   - Policy command: `INSERT`
   - Target roles: `authenticated`
   - WITH CHECK expression: `bucket_id = 'meeting-attachments'`

3. **Policy pour mise à jour** :
   - Name: `Authenticated users can update meeting attachments`
   - Policy command: `UPDATE`
   - Target roles: `authenticated`
   - USING expression: `bucket_id = 'meeting-attachments'`

4. **Policy pour suppression** :
   - Name: `Authenticated users can delete meeting attachments`
   - Policy command: `DELETE`
   - Target roles: `authenticated`
   - USING expression: `bucket_id = 'meeting-attachments'`

### 5. Tester l'accès public

Après configuration, testez l'URL publique d'un fichier :

```bash
curl -I "https://[PROJECT_REF].supabase.co/storage/v1/object/public/meeting-attachments/[FILE_PATH]"
```

Vous devriez obtenir un statut `HTTP/2 200`.

### 6. Variables d'environnement

Configurez les variables dans le fichier `.env` :

```env
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=[VOTRE_ANON_KEY]
```

## Résolution du problème 404

Si vous obtenez une erreur 404 sur les liens de documents joints :

1. ✅ Vérifiez que le bucket `meeting-attachments` existe
2. ✅ Vérifiez que le bucket est configuré comme **public**
3. ✅ Vérifiez que la politique `Public can view meeting attachments` est active
4. ✅ Testez l'URL manuellement dans le navigateur
5. ✅ Vérifiez que le fichier existe bien dans le bucket

## Structure des fichiers

Les fichiers sont organisés comme suit :

```
meeting-attachments/
├── [user_id]/
│   ├── [meeting_id]-[timestamp].pdf
│   └── [meeting_id]-[timestamp].docx
└── [meeting_id]/
    └── email-attachments/
        ├── [timestamp].pdf
        └── [timestamp].docx

logos/
└── [user_id]/
    └── signature-logo-[timestamp].png
```

## Support

En cas de problème, vérifiez les logs dans :
- **Storage** > **Policies** pour les erreurs RLS
- **SQL Editor** pour tester les requêtes manuellement
- Console du navigateur pour les erreurs JavaScript

