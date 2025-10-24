/*
  # Ajouter le support OAuth Gmail aux paramètres utilisateur

  1. Modifications
    - Ajouter les colonnes `gmail_connected` et `gmail_email` à la table `user_settings`
    - `gmail_connected` (boolean) : indique si l'utilisateur a connecté son compte Gmail via OAuth
    - `gmail_email` (text) : l'adresse email Gmail connectée

  2. Notes
    - Les tokens OAuth seront stockés côté Clerk et récupérés via leur API
    - Ces champs servent uniquement à l'affichage dans l'interface utilisateur
*/

-- Ajouter les colonnes Gmail OAuth
DO $$
BEGIN
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