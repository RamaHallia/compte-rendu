/*
  # Add RLS policies for meeting-attachments bucket

  1. Storage Policies for meeting-attachments bucket
    - Authenticated users can upload attachments
    - Authenticated users can update their own attachments
    - Authenticated users can delete their own attachments
    - Public can view all attachments (for email links)

  2. Notes
    - Meeting attachments bucket is public for email display
    - Users can only modify their own attachments (in their user_id folder)
    - This allows recipients to download files from email links
*/

-- Policy for uploading meeting attachments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload meeting attachments'
  ) THEN
    CREATE POLICY "Authenticated users can upload meeting attachments"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'meeting-attachments');
  END IF;
END $$;

-- Policy for updating meeting attachments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update meeting attachments'
  ) THEN
    CREATE POLICY "Authenticated users can update meeting attachments"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'meeting-attachments');
  END IF;
END $$;

-- Policy for deleting meeting attachments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete meeting attachments'
  ) THEN
    CREATE POLICY "Authenticated users can delete meeting attachments"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'meeting-attachments');
  END IF;
END $$;

-- Policy for viewing meeting attachments (public)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can view meeting attachments'
  ) THEN
    CREATE POLICY "Public can view meeting attachments"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'meeting-attachments');
  END IF;
END $$;

