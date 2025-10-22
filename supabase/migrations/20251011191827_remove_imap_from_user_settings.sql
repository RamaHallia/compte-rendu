/*
  # Remove IMAP fields from user_settings

  1. Changes to user_settings table
    - Remove `imap_host` column (not needed for sending emails)
    - Remove `imap_port` column (not needed for sending emails)

  2. Notes
    - IMAP is only for receiving emails
    - We only need SMTP configuration for sending meeting summaries
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'imap_host'
  ) THEN
    ALTER TABLE user_settings DROP COLUMN imap_host;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'imap_port'
  ) THEN
    ALTER TABLE user_settings DROP COLUMN imap_port;
  END IF;
END $$;
