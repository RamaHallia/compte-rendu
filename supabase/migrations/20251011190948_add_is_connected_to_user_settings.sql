/*
  # Add is_connected flag to user_settings

  1. Changes to user_settings table
    - Add `is_connected` (boolean, default false) - Indicates if the email provider is successfully connected/authenticated

  2. Notes
    - This flag will be set to true only after successful authentication test
    - Used to determine if the provider is active and ready to send emails
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'is_connected'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN is_connected boolean DEFAULT false NOT NULL;
  END IF;
END $$;
