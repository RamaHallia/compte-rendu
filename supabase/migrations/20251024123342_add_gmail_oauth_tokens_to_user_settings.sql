/*
  # Ajouter le stockage des tokens OAuth Gmail
  
  1. Modifications
    - Ajouter les colonnes pour stocker les tokens OAuth de Gmail
    - `gmail_access_token` (text) : token d'accès Gmail OAuth
    - `gmail_refresh_token` (text) : token de rafraîchissement Gmail OAuth
    - `gmail_token_expiry` (timestamptz) : date d'expiration du token d'accès
    - `gmail_connected` (boolean) : indique si Gmail est connecté
    - `gmail_email` (text) : l'adresse email Gmail connectée
  
  2. Sécurité
    - Les tokens sont stockés de manière sécurisée dans Supabase
    - Accessibles uniquement par l'utilisateur propriétaire via RLS
  
  3. Notes
    - Les tokens seront utilisés par l'Edge Function pour envoyer des emails via l'API Gmail
    - Le refresh token permet de renouveler automatiquement l'access token
*/

-- Ajouter les colonnes Gmail OAuth
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'gmail_access_token'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN gmail_access_token text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'gmail_refresh_token'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN gmail_refresh_token text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'gmail_token_expiry'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN gmail_token_expiry timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'gmail_connected'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN gmail_connected boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'gmail_email'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN gmail_email text;
  END IF;
END $$;