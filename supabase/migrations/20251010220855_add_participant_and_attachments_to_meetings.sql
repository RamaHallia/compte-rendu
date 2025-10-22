/*
  # Add participant information and attachments to meetings

  1. Changes
    - Add `participant_first_name` (text, nullable) - First name of the meeting participant
    - Add `participant_last_name` (text, nullable) - Last name of the meeting participant
    - Add `participant_email` (text, nullable) - Email of the meeting participant
    - Add `attachment_url` (text, nullable) - URL to an attached file
    - Add `attachment_name` (text, nullable) - Name of the attached file

  2. Notes
    - All new fields are nullable to maintain backward compatibility
    - Attachments will be stored in Supabase Storage
    - Email field will be used when sending meeting summaries
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'participant_first_name'
  ) THEN
    ALTER TABLE meetings ADD COLUMN participant_first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'participant_last_name'
  ) THEN
    ALTER TABLE meetings ADD COLUMN participant_last_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'participant_email'
  ) THEN
    ALTER TABLE meetings ADD COLUMN participant_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'attachment_url'
  ) THEN
    ALTER TABLE meetings ADD COLUMN attachment_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'attachment_name'
  ) THEN
    ALTER TABLE meetings ADD COLUMN attachment_name text;
  END IF;
END $$;
