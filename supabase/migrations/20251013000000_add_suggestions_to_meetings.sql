-- Migration pour ajouter le champ suggestions à la table meetings

-- Ajouter une colonne suggestions (JSONB) à la table meetings
ALTER TABLE meetings
ADD COLUMN IF NOT EXISTS suggestions JSONB DEFAULT '[]'::jsonb;

-- Ajouter un commentaire pour la documentation
COMMENT ON COLUMN meetings.suggestions IS 'Liste des suggestions générées pendant l''enregistrement (format: [{segment_number, summary, key_points, suggestions, topics_to_explore, timestamp}])';

