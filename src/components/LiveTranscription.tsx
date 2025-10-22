import { FileText, Mic } from 'lucide-react';

interface LiveTranscriptionProps {
  transcript: string;
  isRecording: boolean;
}

export const LiveTranscription = ({ transcript, isRecording }: LiveTranscriptionProps) => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-orange-100 overflow-hidden">
        <div className="bg-gradient-to-r from-coral-500 to-sunset-500 px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-7 h-7 text-white" />
              <h2 className="text-2xl font-bold text-white">Transcription en direct</h2>
            </div>
            {isRecording && (
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-lg" />
                <span className="text-white text-sm font-semibold">En cours...</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 min-h-[400px] max-h-[600px] overflow-y-auto">
          {transcript ? (
            <div className="space-y-4">
              <p className="text-cocoa-800 text-lg leading-relaxed whitespace-pre-wrap">
                {transcript}
              </p>
              {isRecording && (
                <span className="inline-block w-2 h-6 bg-gradient-to-b from-coral-500 to-sunset-500 animate-pulse ml-1 rounded-sm" />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-coral-100 to-sunset-100 rounded-full flex items-center justify-center mb-6">
                <Mic className="w-12 h-12 text-coral-500" />
              </div>
              <p className="text-cocoa-600 text-xl font-medium">
                {isRecording
                  ? "En attente de la parole..."
                  : "Commencez à enregistrer pour voir la transcription en direct"}
              </p>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-red-50 border-t-2 border-orange-100 px-8 py-4">
          <p className="text-sm text-cocoa-600 font-medium">
            La transcription s'affiche en temps réel pendant l'enregistrement
          </p>
        </div>
      </div>
    </div>
  );
};
