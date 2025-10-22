import { useState, useCallback } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface LiveSuggestion {
  segment_number: number;
  summary: string;
  key_points: string[];
  suggestions: string[];
  topics_to_explore: string[];
  timestamp: number;
}

export const useLiveSuggestions = () => {
  const [suggestions, setSuggestions] = useState<LiveSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(0);

  const analyzePartialTranscript = useCallback(async (transcript: string) => {
    if (!transcript || transcript.trim().length < 100) {
      
      return null;
    }

    setIsAnalyzing(true);
    const segmentNumber = currentSegment + 1;

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/analyze-partial`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            transcript,
            segment_number: segmentNumber
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const data = await response.json();
      console.log('🔍 Suggestions reçues:', data);
      
      // Ne pas ajouter si vide (vérification robuste)
      const hasContent = 
        (data.summary && data.summary.length > 0) ||
        (data.key_points && data.key_points.length > 0) ||
        (data.suggestions && data.suggestions.length > 0) ||
        (data.topics_to_explore && data.topics_to_explore.length > 0);
      
      if (!hasContent) {
        console.log('⚠️ Suggestions vides, ignorées');
        return null;
      }

      const newSuggestion: LiveSuggestion = {
        segment_number: segmentNumber,
        summary: data.summary || '',
        key_points: data.key_points || [],
        suggestions: data.suggestions || [],
        topics_to_explore: data.topics_to_explore || [],
        timestamp: Date.now(),
      };

      console.log('✅ Suggestion ajoutée:', newSuggestion);
      setSuggestions(prev => [...prev, newSuggestion]);
      setCurrentSegment(segmentNumber);

      return newSuggestion;
    } catch (error) {
      
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentSegment]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setCurrentSegment(0);
  }, []);

  const getLatestSuggestion = useCallback(() => {
    return suggestions.length > 0 ? suggestions[suggestions.length - 1] : null;
  }, [suggestions]);

  return {
    suggestions,
    isAnalyzing,
    analyzePartialTranscript,
    clearSuggestions,
    getLatestSuggestion,
    currentSegment,
  };
};

