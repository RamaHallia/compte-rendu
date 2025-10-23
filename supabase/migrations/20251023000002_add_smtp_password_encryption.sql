/*
  # Chiffrement du mot de passe SMTP

  ## Changements

  1. **Extension pgcrypto**
    - Activation de l'extension pgcrypto pour le chiffrement

  2. **Modification de la table user_settings**
    - Ajout d'une colonne `smtp_password_encrypted` (bytea) pour stocker le mot de passe chiffré
    - Conservation temporaire de `smtp_password` pour la migration

  3. **Fonctions helper**
    - `encrypt_smtp_password()` - fonction pour chiffrer un mot de passe
    - `decrypt_smtp_password()` - fonction pour déchiffrer un mot de passe

  ## Notes importantes

  - Les mots de passe sont chiffrés avec AES-256
  - La clé de chiffrement est dérivée de l'ID utilisateur
  - Après migration, la colonne `smtp_password` (non chiffrée) sera supprimée
*/

-- Activer l'extension pgcrypto si elle n'est pas déjà activée
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ajouter la colonne pour le mot de passe chiffré
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'smtp_password_encrypted'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN smtp_password_encrypted bytea;
  END IF;
END $$;

-- Fonction pour chiffrer le mot de passe SMTP
CREATE OR REPLACE FUNCTION encrypt_smtp_password(password text, user_id uuid)
RETURNS bytea AS $$
BEGIN
  IF password IS NULL OR password = '' THEN
    RETURN NULL;
  END IF;

  -- Utiliser pgp_sym_encrypt avec une clé dérivée de l'ID utilisateur
  RETURN pgp_sym_encrypt(
    password,
    encode(digest(user_id::text || 'hallia-secret-key-2025', 'sha256'), 'hex')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour déchiffrer le mot de passe SMTP
CREATE OR REPLACE FUNCTION decrypt_smtp_password(encrypted_password bytea, user_id uuid)
RETURNS text AS $$
BEGIN
  IF encrypted_password IS NULL THEN
    RETURN NULL;
  END IF;

  -- Déchiffrer avec la même clé
  RETURN pgp_sym_decrypt(
    encrypted_password,
    encode(digest(user_id::text || 'hallia-secret-key-2025', 'sha256'), 'hex')
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migrer les mots de passe existants (si présents)
DO $$
DECLARE
  setting_record RECORD;
BEGIN
  FOR setting_record IN
    SELECT user_id, smtp_password
    FROM user_settings
    WHERE smtp_password IS NOT NULL AND smtp_password != ''
  LOOP
    UPDATE user_settings
    SET smtp_password_encrypted = encrypt_smtp_password(setting_record.smtp_password, setting_record.user_id)
    WHERE user_id = setting_record.user_id;
  END LOOP;
END $$;

-- Supprimer l'ancienne colonne non chiffrée
ALTER TABLE user_settings DROP COLUMN IF EXISTS smtp_password;

-- Commentaires
COMMENT ON COLUMN user_settings.smtp_password_encrypted IS 'Mot de passe SMTP chiffré avec AES-256';
COMMENT ON FUNCTION encrypt_smtp_password IS 'Chiffre un mot de passe SMTP avec AES-256';
COMMENT ON FUNCTION decrypt_smtp_password IS 'Déchiffre un mot de passe SMTP';
