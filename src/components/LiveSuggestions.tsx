import { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, CheckCircle, AlertCircle, MessageCircle, X } from 'lucide-react';
import { LiveSuggestion } from '../hooks/useLiveSuggestions';

interface LiveSuggestionsProps {
  latestSuggestion: LiveSuggestion | null;
  isAnalyzing: boolean;
  allSuggestions: LiveSuggestion[];
}

export const LiveSuggestions = ({ latestSuggestion, isAnalyzing, allSuggestions }: LiveSuggestionsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Si pas de suggestion et pas en cours d'analyse, ne rien afficher
  if (!latestSuggestion && !isAnalyzing) {
    return null;
  }

  // Si dismissed, ne rien afficher
  if (isDismissed) {
    return null;
  }

  // Réafficher quand nouvelle suggestion arrive
  if (latestSuggestion && isDismissed) {
    setIsDismissed(false);
  }

  return (
    <div className="fixed top-20 right-8 z-40 max-w-md">
      {/* Version compacte */}
      {!isExpanded && latestSuggestion && (
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-sunset-200 overflow-hidden animate-slide-in-right">
          <div className="bg-gradient-to-r from-sunset-500 to-coral-500 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-sunset-600" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Suggestions IA</h3>
                  <p className="text-xs text-white/80">Segment {latestSuggestion.segment_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExpanded(true)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                  title="Développer"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsDismissed(true)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                  title="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {latestSuggestion.summary && (
            <div className="p-4 bg-gradient-to-br from-orange-50 to-red-50">
              <p className="text-sm text-cocoa-700 line-clamp-2">
                {latestSuggestion.summary}
              </p>
            </div>
          )}

          {latestSuggestion.suggestions.length > 0 && (
            <div className="px-4 py-3 border-t border-orange-100">
              <p className="text-xs font-semibold text-sunset-600 mb-2">
                💡 {latestSuggestion.suggestions.length} suggestion(s)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Version expandée */}
      {isExpanded && (
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-sunset-200 overflow-hidden max-h-[80vh] flex flex-col animate-slide-in-right">
          <div className="bg-gradient-to-r from-sunset-500 to-coral-500 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-sunset-600" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Suggestions en temps réel</h3>
                  <p className="text-xs text-white/80">{allSuggestions.length} segment(s) analysé(s)</p>
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                title="Réduire"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {latestSuggestion && (
              <>
                {/* Résumé */}
                {latestSuggestion.summary && (
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                    <h4 className="font-semibold text-cocoa-800 mb-2 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-sunset-600" />
                      Résumé de ce segment
                    </h4>
                    <p className="text-sm text-cocoa-700">{latestSuggestion.summary}</p>
                  </div>
                )}

                {/* Points clés */}
                {latestSuggestion.key_points.length > 0 && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Points clés
                    </h4>
                    <ul className="space-y-2">
                      {latestSuggestion.key_points.map((point, index) => (
                        <li key={index} className="text-sm text-green-700 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                {latestSuggestion.suggestions.length > 0 && (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                      Questions à clarifier
                    </h4>
                    <ul className="space-y-2">
                      {latestSuggestion.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-blue-700 flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">?</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sujets à explorer */}
                {latestSuggestion.topics_to_explore.length > 0 && (
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-purple-600" />
                      Sujets à explorer
                    </h4>
                    <ul className="space-y-2">
                      {latestSuggestion.topics_to_explore.map((topic, index) => (
                        <li key={index} className="text-sm text-purple-700 flex items-start gap-2">
                          <span className="text-purple-500 mt-0.5">→</span>
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* Indicateur de chargement */}
            {isAnalyzing && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-sunset-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-600">Analyse en cours...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

