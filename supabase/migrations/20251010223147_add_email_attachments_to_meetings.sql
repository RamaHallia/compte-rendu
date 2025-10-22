/*
  # Add email attachments support to meetings table

  1. Changes
    - Add `email_attachments` (jsonb, nullable, default '[]'::jsonb) - Array of attachment objects for email
      Each attachment object contains:
      - name: string - Name of the file
      - url: string - URL to download the file
      - size: number - File size in bytes
      - type: string - MIME type of the file

  2. Notes
    - Using JSONB for flexible storage of multiple attachments
    - Default to empty array for new records
    - Separate from meeting recording attachment (attachment_url/attachment_name)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'email_attachments'
  ) THEN
    ALTER TABLE meetings ADD COLUMN email_attachments jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;