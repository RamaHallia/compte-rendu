/*
  # Create meetings table

  1. New Tables
    - `meetings`
      - `id` (uuid, primary key) - Unique identifier for each meeting
      - `title` (text) - Title of the meeting
      - `audio_url` (text, nullable) - URL to the audio recording
      - `transcript` (text, nullable) - Full transcription of the meeting
      - `summary` (text, nullable) - AI-generated summary
      - `duration` (integer) - Duration in seconds
      - `created_at` (timestamptz) - Timestamp of when meeting was created
      - `user_id` (uuid) - Reference to the user who created the meeting

  2. Security
    - Enable RLS on `meetings` table
    - Add policy for authenticated users to read their own meetings
    - Add policy for authenticated users to insert their own meetings
    - Add policy for authenticated users to update their own meetings
    - Add policy for authenticated users to delete their own meetings
*/

CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled Meeting',
  audio_url text,
  transcript text,
  summary text,
  duration integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meetings"
  ON meetings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meetings"
  ON meetings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meetings"
  ON meetings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meetings"
  ON meetings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);