/*
  # Add signature fields to user_settings

  1. Changes to user_settings table
    - Add `signature_name` (text) - Name to display in email signature
    - Add `signature_title` (text) - Job title/position
    - Add `signature_company` (text) - Company name
    - Add `signature_phone` (text) - Phone number
    - Add `signature_logo_url` (text) - URL to logo image
    - Add `signature_website` (text) - Company website

  2. Notes
    - All fields are optional (nullable)
    - The signature will be appended at the bottom of meeting summary emails
    - Users can customize their professional signature
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'signature_name'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN signature_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'signature_title'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN signature_title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'signature_company'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN signature_company text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'signature_phone'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN signature_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'signature_logo_url'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN signature_logo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'signature_website'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN signature_website text;
  END IF;
END $$;
