/*
  # Add notes field to meetings table

  1. Changes
    - Add `notes` (text, nullable) - User notes taken during the recording session

  2. Notes
    - This field stores any notes the user writes while recording
    - Will be included in the meeting summary and context
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'notes'
  ) THEN
    ALTER TABLE meetings ADD COLUMN notes text;
  END IF;
END $$;