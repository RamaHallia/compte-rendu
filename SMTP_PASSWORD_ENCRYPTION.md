# Chiffrement des mots de passe SMTP

## Vue d'ensemble

Ce document explique comment les mots de passe SMTP sont chiffrés dans la base de données pour améliorer la sécurité.

## Migration de la base de données

La migration `20251023000002_add_smtp_password_encryption.sql` effectue les changements suivants :

1. **Active l'extension pgcrypto** pour le chiffrement AES-256
2. **Ajoute une nouvelle colonne** `smtp_password_encrypted` de type `bytea`
3. **Crée deux fonctions** :
   - `encrypt_smtp_password(password text, user_id uuid)` - chiffre un mot de passe
   - `decrypt_smtp_password(encrypted_password bytea, user_id uuid)` - déchiffre un mot de passe
4. **Migre les mots de passe existants** vers la colonne chiffrée
5. **Supprime l'ancienne colonne** `smtp_password` (texte en clair)

## Comment appliquer la migration

### Option 1 : Via Supabase Dashboard

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Copiez le contenu de `supabase/migrations/20251023000002_add_smtp_password_encryption.sql`
5. Collez et exécutez

### Option 2 : Via Supabase CLI (si disponible)

```bash
supabase db push
```

## Modifications du code frontend

### 1. Sauvegarder un mot de passe SMTP (Settings.tsx)

Avant :
```typescript
await supabase
  .from('user_settings')
  .upsert({
    user_id: userId,
    smtp_password: smtpPassword
  });
```

Après :
```typescript
// Chiffrer le mot de passe côté base de données
const { data, error } = await supabase.rpc('encrypt_smtp_password', {
  password: smtpPassword,
  user_id: userId
});

if (!error && data) {
  await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      smtp_password_encrypted: data
    });
}
```

### 2. Récupérer un mot de passe SMTP déchiffré

```typescript
// Dans l'edge function send-email-smtp
const { data: settings } = await supabase
  .from('user_settings')
  .select('smtp_host, smtp_port, smtp_user, smtp_password_encrypted')
  .eq('user_id', userId)
  .single();

// Déchiffrer le mot de passe
const { data: decryptedPassword } = await supabase.rpc('decrypt_smtp_password', {
  encrypted_password: settings.smtp_password_encrypted,
  user_id: userId
});

const smtp_password = decryptedPassword;
```

## Sécurité

### Points forts :
- ✅ Mots de passe chiffrés avec AES-256
- ✅ Clé unique par utilisateur (basée sur user_id)
- ✅ Fonctions SECURITY DEFINER (exécutées avec privilèges de propriétaire)
- ✅ Impossible de lire directement la colonne chiffrée

### Important :
- 🔒 La clé de chiffrement (`hallia-secret-key-2025`) doit être gardée secrète
- 🔒 Pour une sécurité maximale, stockez la clé maître dans les variables d'environnement Supabase
- 🔒 Les fonctions RPC sont accessibles uniquement par les utilisateurs authentifiés

## Utilisation dans l'application

Une fois la migration appliquée et le code modifié, les mots de passe SMTP :

1. Sont automatiquement chiffrés lors de la sauvegarde
2. Sont automatiquement déchiffrés lors de la récupération
3. Ne sont jamais stockés en clair dans la base de données
4. Sont uniques par utilisateur (impossible de déchiffrer avec un autre user_id)

## Rollback (si nécessaire)

Si vous devez revenir en arrière :

```sql
-- Recréer la colonne smtp_password
ALTER TABLE user_settings ADD COLUMN smtp_password text;

-- Migrer les données déchiffrées (ATTENTION : ceci expose les mots de passe)
-- À faire uniquement en environnement sécurisé
UPDATE user_settings
SET smtp_password = decrypt_smtp_password(smtp_password_encrypted, user_id)
WHERE smtp_password_encrypted IS NOT NULL;

-- Supprimer la colonne chiffrée
ALTER TABLE user_settings DROP COLUMN smtp_password_encrypted;

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS encrypt_smtp_password;
DROP FUNCTION IF EXISTS decrypt_smtp_password;
```
