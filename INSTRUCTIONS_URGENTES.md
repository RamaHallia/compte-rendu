# ⚠️ INSTRUCTIONS URGENTES - Problèmes à résoudre

## Problème 1 : Table `meetings` introuvable

**Erreur** : `Could not find the table 'public.meetings' in the schema cache`

**Cause** : Les migrations de base de données n'ont pas été appliquées dans Supabase.

### Solution :

Vous devez appliquer TOUTES les migrations SQL dans Supabase Dashboard.

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez sur **SQL Editor**
4. Pour chaque fichier ci-dessous (dans l'ordre), ouvrez-le, copiez le contenu et exécutez-le :

- `20251010201237_create_meetings_table.sql`
- `20251010220855_add_participant_and_attachments_to_meetings.sql`
- `20251010223147_add_email_attachments_to_meetings.sql`
- `20251011182746_add_notes_to_meetings.sql`
- `20251011185248_create_user_settings_table.sql`
- `20251011185629_update_user_settings_add_email_provider.sql`
- `20251011190948_add_is_connected_to_user_settings.sql`
- `20251011191827_remove_imap_from_user_settings.sql`
- `20251012105226_add_signature_to_user_settings.sql`
- `20251012105422_simplify_signature_fields.sql`
- `20251012105918_add_logos_bucket_policies.sql`
- `20251012140000_add_meeting_attachments_bucket_policies.sql`
- `20251012141000_create_shortened_urls_table.sql`
- `20251013000000_add_suggestions_to_meetings.sql`
- `20251015160000_backfill_meeting_suggestions.sql`
- `20251022000000_add_email_method_to_user_settings.sql`
- `20251022000001_add_smtp_to_user_settings.sql`
- `20251023000000_add_display_transcript_to_meetings.sql`
- `20251023000002_add_smtp_password_encryption.sql` ← **NOUVEAU**

---

## Problème 2 : Sauvegarde des paramètres SMTP

**Erreur** : "Erreur lors de la sauvegarde des paramètres"

**Cause** : La migration `20251023000002_add_smtp_password_encryption.sql` n'a pas été appliquée.

### Solution :

Appliquez la migration (voir Problème 1 ci-dessus), puis déployez l'edge function et le frontend.

---

## 🚀 SOLUTION RAPIDE

### Étape 1 : Appliquer la dernière migration SMTP

1. Ouvrez le fichier `supabase/migrations/20251023000002_add_smtp_password_encryption.sql`
2. Copiez TOUT le contenu
3. Allez sur Supabase Dashboard → SQL Editor
4. Collez et cliquez sur **Run**

### Étape 2 : Déployer l'edge function

1. Ouvrez `supabase/functions/send-email-smtp/index.ts`
2. Copiez tout le contenu
3. Allez sur Supabase Dashboard → Edge Functions → send-email-smtp
4. Collez et déployez

### Étape 3 : Tester

1. Allez dans Paramètres de l'app
2. Configurez SMTP et sauvegardez
3. Ça devrait fonctionner !

---

## ✅ Vérification

Après avoir appliqué la migration, vérifiez avec ce SQL :

```sql
-- Vérifier que les fonctions existent
SELECT proname FROM pg_proc
WHERE proname IN ('encrypt_smtp_password', 'decrypt_smtp_password');
-- Résultat attendu : 2 lignes

-- Vérifier que la colonne existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_settings'
AND column_name = 'smtp_password_encrypted';
-- Résultat attendu : 1 ligne (bytea)
```
