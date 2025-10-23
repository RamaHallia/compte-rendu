/*
  # Create background tasks table

  1. New Tables
    - `background_tasks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `type` (text) - Type de t�che (e.g., 'upload_transcription')
      - `status` (text) - Status: 'processing', 'completed', 'error'
      - `progress` (text) - Message de progression
      - `meeting_id` (uuid, nullable) - ID de la r�union associ�e
      - `error` (text, nullable) - Message d'erreur si �chec
      - `created_at` (timestamptz) - Date de cr�ation
      - `updated_at` (timestamptz) - Date de derni�re mise � jour

  2. Security
    - Enable RLS on `background_tasks` table
    - Add policies for users to manage their own tasks

  3. Indexes
    - Index on user_id for fast lookups
    - Index on status for filtering active tasks
*/

CREATE TABLE IF NOT EXISTS background_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  status text NOT NULL CHECK (status IN ('processing', 'completed', 'error')),
  progress text NOT NULL DEFAULT '',
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  error text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE background_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tasks
CREATE POLICY "Users can view own tasks"
  ON background_tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own tasks
CREATE POLICY "Users can create own tasks"
  ON background_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tasks
CREATE POLICY "Users can update own tasks"
  ON background_tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own tasks
CREATE POLICY "Users can delete own tasks"
  ON background_tasks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_background_tasks_user_id ON background_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_background_tasks_status ON background_tasks(status);
CREATE INDEX IF NOT EXISTS idx_background_tasks_created_at ON background_tasks(created_at);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_background_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_background_tasks_updated_at_trigger ON background_tasks;
CREATE TRIGGER update_background_tasks_updated_at_trigger
  BEFORE UPDATE ON background_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_background_tasks_updated_at();

-- Function to auto-cleanup old tasks (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_background_tasks()
RETURNS void AS $$
BEGIN
  DELETE FROM background_tasks
  WHERE created_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;
