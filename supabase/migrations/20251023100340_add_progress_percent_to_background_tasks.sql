/*
  # Add progress_percent to background_tasks

  1. Changes
    - Add `progress_percent` column (integer, nullable) to track task progress percentage (0-100)

  2. Notes
    - This field enables visual progress bars in the UI
    - Values should be between 0 and 100
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'background_tasks' AND column_name = 'progress_percent'
  ) THEN
    ALTER TABLE background_tasks ADD COLUMN progress_percent integer CHECK (progress_percent >= 0 AND progress_percent <= 100);
  END IF;
END $$;
