-- Script pour appliquer la migration suggestions manuellement
-- À exécuter dans le SQL Editor de Supabase

-- Vérifier si la colonne suggestions existe déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meetings' 
        AND column_name = 'suggestions'
        AND table_schema = 'public'
    ) THEN
        -- Ajouter la colonne suggestions si elle n'existe pas
        ALTER TABLE public.meetings 
        ADD COLUMN suggestions JSONB DEFAULT '[]'::jsonb;
        
        -- Ajouter un commentaire pour la documentation
        COMMENT ON COLUMN public.meetings.suggestions IS 'Liste des suggestions générées pendant l''enregistrement (format: [{segment_number, summary, key_points, suggestions, topics_to_explore, timestamp}])';
        
        RAISE NOTICE 'Colonne suggestions ajoutée à la table meetings';
    ELSE
        RAISE NOTICE 'Colonne suggestions existe déjà dans la table meetings';
    END IF;
END $$;
