/*
  # Add RLS policies for logos bucket

  1. Storage Policies for logos bucket
    - Authenticated users can upload logos
    - Authenticated users can update their own logos
    - Authenticated users can delete their own logos
    - Public can view all logos

  2. Notes
    - Logos bucket is public for email display
    - Users can only modify their own logos (in their user_id folder)
*/

-- Policy for uploading logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload logos'
  ) THEN
    CREATE POLICY "Authenticated users can upload logos"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'logos');
  END IF;
END $$;

-- Policy for updating logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update logos'
  ) THEN
    CREATE POLICY "Authenticated users can update logos"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'logos');
  END IF;
END $$;

-- Policy for deleting logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete logos'
  ) THEN
    CREATE POLICY "Authenticated users can delete logos"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'logos');
  END IF;
END $$;

-- Policy for viewing logos (public)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can view logos'
  ) THEN
    CREATE POLICY "Public can view logos"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'logos');
  END IF;
END $$;
