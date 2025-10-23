# Guide : Chiffrement des mots de passe SMTP

## ⚠️ IMPORTANT : À lire avant de commencer

Ce guide vous explique comment chiffrer les mots de passe SMTP dans votre application. Le chiffrement se fait **côté base de données** avec PostgreSQL et pgcrypto.

## 📋 Vue d'ensemble

Actuellement, les mots de passe SMTP sont stockés en texte clair dans la colonne `smtp_password`. Nous allons :

1. ✅ Créer une nouvelle colonne `smtp_password_encrypted` (chiffrée)
2. ✅ Créer des fonctions PostgreSQL pour chiffrer/déchiffrer
3. ✅ Migrer les mots de passe existants
4. ✅ Supprimer l'ancienne colonne en texte clair
5. ✅ Modifier le code pour utiliser la nouvelle colonne

## 🔧 Étape 1 : Appliquer la migration

### Via Supabase Dashboard

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Ouvrez le fichier `supabase/migrations/20251023000002_add_smtp_password_encryption.sql`
5. Copiez tout le contenu
6. Collez dans l'éditeur SQL et cliquez sur **Run**

✅ La migration va :
- Activer l'extension `pgcrypto`
- Créer la colonne `smtp_password_encrypted`
- Créer les fonctions `encrypt_smtp_password()` et `decrypt_smtp_password()`
- Migrer automatiquement les mots de passe existants
- Supprimer la colonne `smtp_password` en texte clair

## 🔧 Étape 2 : Modifier l'Edge Function

Ouvrez `supabase/functions/send-email-smtp/index.ts` et modifiez :

### Ligne 56 - Changez le SELECT :

**AVANT :**
```typescript
.select('smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure, sender_name, sender_email')
```

**APRÈS :**
```typescript
.select('smtp_host, smtp_port, smtp_user, smtp_password_encrypted, smtp_secure, sender_name, sender_email')
```

### Ligne 64 - Changez la vérification :

**AVANT :**
```typescript
if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password) {
```

**APRÈS :**
```typescript
if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password_encrypted) {
```

### Après la ligne 66 - Ajoutez le déchiffrement :

```typescript
// Déchiffrer le mot de passe SMTP
const { data: decryptedPassword, error: decryptError } = await supabaseClient
  .rpc('decrypt_smtp_password', {
    encrypted_password: settings.smtp_password_encrypted,
    user_id: user.id
  })

if (decryptError || !decryptedPassword) {
  throw new Error('Failed to decrypt SMTP password')
}
```

### Ligne 76 - Utilisez le mot de passe déchiffré :

**AVANT :**
```typescript
password: settings.smtp_password,
```

**APRÈS :**
```typescript
password: decryptedPassword,
```

### Résultat final (lignes 53-79) :

```typescript
// Get SMTP configuration from user_settings
const { data: settings, error: settingsError } = await supabaseClient
  .from('user_settings')
  .select('smtp_host, smtp_port, smtp_user, smtp_password_encrypted, smtp_secure, sender_name, sender_email')
  .eq('user_id', user.id)
  .single()

if (settingsError || !settings) {
  throw new Error('SMTP configuration not found')
}

if (!settings.smtp_host || !settings.smtp_user || !settings.smtp_password_encrypted) {
  throw new Error('SMTP configuration incomplete')
}

// Déchiffrer le mot de passe SMTP
const { data: decryptedPassword, error: decryptError } = await supabaseClient
  .rpc('decrypt_smtp_password', {
    encrypted_password: settings.smtp_password_encrypted,
    user_id: user.id
  })

if (decryptError || !decryptedPassword) {
  throw new Error('Failed to decrypt SMTP password')
}

// Create SMTP client
const client = new SMTPClient({
  connection: {
    hostname: settings.smtp_host,
    port: settings.smtp_port || 587,
    tls: settings.smtp_secure !== false,
    auth: {
      username: settings.smtp_user,
      password: decryptedPassword,
    },
  },
});
```

## 🔧 Étape 3 : Redéployer l'Edge Function

Après modification, redéployez la fonction :

```bash
# Depuis la racine du projet
cd supabase/functions/send-email-smtp
# Le déploiement se fera automatiquement via votre processus habituel
```

Ou utilisez l'outil MCP dans l'interface.

## 🔧 Étape 4 : Modifier Settings.tsx (Frontend)

Ouvrez `src/components/Settings.tsx` :

### Ligne 34 - Changez le SELECT :

**AVANT :**
```typescript
.select('sender_email, sender_name, signature_text, signature_logo_url, email_method, smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure')
```

**APRÈS :**
```typescript
.select('sender_email, sender_name, signature_text, signature_logo_url, email_method, smtp_host, smtp_port, smtp_user, smtp_password_encrypted, smtp_secure')
```

### Ligne 48 - Gérer le déchiffrement :

**AVANT :**
```typescript
setSmtpPassword(data.smtp_password || '');
```

**APRÈS :**
```typescript
// Le mot de passe ne peut pas être récupéré une fois chiffré (sécurité)
// On affiche un placeholder pour indiquer qu'un mot de passe existe
setSmtpPassword(data.smtp_password_encrypted ? '••••••••' : '');
```

### Ligne 113-145 - Modifier la sauvegarde :

Trouvez la section `handleSave` et modifiez :

**AVANT :**
```typescript
smtp_password: emailMethod === 'smtp' ? smtpPassword : null,
```

**APRÈS :**
```typescript
// Ne sauvegarder que si le mot de passe a été modifié (pas '••••••••')
smtp_password_encrypted:
  emailMethod === 'smtp' && smtpPassword && smtpPassword !== '••••••••'
    ? await encryptPassword(smtpPassword, userId)
    : undefined,
```

### Ajouter la fonction d'encryption (au début du composant) :

```typescript
const encryptPassword = async (password: string, userId: string) => {
  const { data, error } = await supabase.rpc('encrypt_smtp_password', {
    password: password,
    user_id: userId
  });

  if (error) {
    console.error('Erreur de chiffrement:', error);
    throw error;
  }

  return data;
};
```

## ✅ Étape 5 : Tester

1. **Allez dans Paramètres**
2. **Configurez SMTP** avec vos credentials
3. **Sauvegardez**
4. **Vérifiez dans la base de données** :
   ```sql
   SELECT user_id, smtp_host, smtp_user, smtp_password_encrypted
   FROM user_settings;
   ```
   ↪ Vous devriez voir des données binaires dans `smtp_password_encrypted`
5. **Envoyez un email de test** pour confirmer que le déchiffrement fonctionne

## 🔐 Sécurité

### Ce qui est protégé :
- ✅ Mots de passe chiffrés avec AES-256
- ✅ Clé unique par utilisateur
- ✅ Impossible de lire les mots de passe directement en SQL
- ✅ Fonctions sécurisées (SECURITY DEFINER)

### Ce qui n'est PAS protégé :
- ⚠️ La clé maître (`hallia-secret-key-2025`) est en dur dans le code
- ⚠️ Pour une meilleure sécurité, stockez-la dans les secrets Supabase

## 🆘 En cas de problème

Si quelque chose ne fonctionne pas :

1. **Vérifiez que la migration est appliquée** :
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'encrypt_smtp_password';
   ```

2. **Testez le chiffrement manuellement** :
   ```sql
   SELECT encrypt_smtp_password('test123', '00000000-0000-0000-0000-000000000000'::uuid);
   ```

3. **Vérifiez les logs de l'edge function** dans Supabase Dashboard

4. **Si tout échoue**, vous pouvez temporairement revenir en arrière (voir SMTP_PASSWORD_ENCRYPTION.md)

## 📝 Notes importantes

- Les mots de passe existants sont automatiquement migrés
- Une fois chiffrés, les mots de passe ne peuvent pas être "affichés" dans l'interface (sécurité)
- L'utilisateur doit re-saisir son mot de passe pour le modifier
- Le placeholder `••••••••` indique qu'un mot de passe existe
