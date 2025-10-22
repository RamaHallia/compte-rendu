-- Ajouter un champ pour la transcription d'affichage (avec séparateurs)
ALTER TABLE meetings 
ADD COLUMN display_transcript TEXT;

-- Mettre à jour les enregistrements existants pour copier transcript vers display_transcript
UPDATE meetings 
SET display_transcript = transcript 
WHERE transcript IS NOT NULL;
