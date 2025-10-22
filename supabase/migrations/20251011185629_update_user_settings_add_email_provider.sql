/*
  # Update user_settings table for email provider configuration

  1. Changes to user_settings table
    - Add `email_provider` (text, nullable) - Type of email provider: 'gmail', 'outlook', 'custom', or NULL
    - Add `smtp_host` (text, nullable) - SMTP server host for custom provider
    - Add `smtp_port` (integer, nullable) - SMTP server port for custom provider
    - Add `smtp_username` (text, nullable) - SMTP username for custom provider
    - Add `smtp_password` (text, nullable) - SMTP password (encrypted) for custom provider
    - Add `imap_host` (text, nullable) - IMAP server host for custom provider
    - Add `imap_port` (integer, nullable) - IMAP server port for custom provider

  2. Notes
    - Passwords should be encrypted before storage
    - Gmail and Outlook will use OAuth2 or app-specific passwords
    - Custom provider requires full SMTP/IMAP configuration
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'email_provider'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN email_provider text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'smtp_host'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN smtp_host text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'smtp_port'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN smtp_port integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'smtp_username'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN smtp_username text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'smtp_password'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN smtp_password text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'imap_host'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN imap_host text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'imap_port'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN imap_port integer;
  END IF;
END $$;
