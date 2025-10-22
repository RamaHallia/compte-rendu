/*
  # Simplify signature fields in user_settings

  1. Changes to user_settings table
    - Remove individual signature fields (signature_name, signature_title, etc.)
    - Add `signature_text` (text) - Single textarea for all signature information
    - Keep `signature_logo_url` - Will be used for uploaded logo

  2. Notes
    - Simplifies the signature configuration
    - Users can format their signature text as they want
    - Logo will be uploaded separately
*/

DO $$
BEGIN
  -- Remove old individual fields
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'signature_name'
  ) THEN
    ALTER TABLE user_settings DROP COLUMN signature_name;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'signature_title'
  ) THEN
    ALTER TABLE user_settings DROP COLUMN signature_title;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'signature_company'
  ) THEN
    ALTER TABLE user_settings DROP COLUMN signature_company;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'signature_phone'
  ) THEN
    ALTER TABLE user_settings DROP COLUMN signature_phone;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'signature_website'
  ) THEN
    ALTER TABLE user_settings DROP COLUMN signature_website;
  END IF;

  -- Add new signature_text field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'signature_text'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN signature_text text;
  END IF;
END $$;
