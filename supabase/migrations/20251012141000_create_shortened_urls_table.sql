/*
  # Create shortened_urls table

  1. New Tables
    - `shortened_urls`
      - `id` (uuid, primary key) - Unique identifier
      - `short_code` (text, unique) - Short code for the URL (e.g., "abc123")
      - `original_url` (text) - Original long URL
      - `created_at` (timestamptz) - Creation timestamp
      - `clicks` (integer) - Number of times the link was clicked

  2. Security
    - Enable RLS on `shortened_urls` table
    - Public can read (for redirect)
    - Only authenticated users can create
*/

CREATE TABLE IF NOT EXISTS shortened_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code text UNIQUE NOT NULL,
  original_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  clicks integer DEFAULT 0
);

-- Index pour recherche rapide par short_code
CREATE INDEX IF NOT EXISTS idx_shortened_urls_short_code ON shortened_urls(short_code);

-- Enable RLS
ALTER TABLE shortened_urls ENABLE ROW LEVEL SECURITY;

-- Public peut lire (pour la redirection)
CREATE POLICY "Public can view shortened URLs"
  ON shortened_urls FOR SELECT
  TO public
  USING (true);

-- Utilisateurs authentifiés peuvent créer
CREATE POLICY "Authenticated users can create shortened URLs"
  ON shortened_urls FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Fonction pour incrémenter le compteur de clics
CREATE OR REPLACE FUNCTION increment_url_clicks(url_short_code text)
RETURNS void AS $$
BEGIN
  UPDATE shortened_urls 
  SET clicks = clicks + 1 
  WHERE short_code = url_short_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

