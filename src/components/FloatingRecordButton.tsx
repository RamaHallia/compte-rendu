import { Square, Pause, Play } from 'lucide-react';

interface FloatingRecordButtonProps {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export const FloatingRecordButton = ({
  isRecording,
  isPaused,
  recordingTime,
  onPause,
  onResume,
  onStop,
}: FloatingRecordButtonProps) => {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isRecording) return null;

  return (
    <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50">
      {/* Zone étendue pour maintenir le hover */}
      <div className="relative flex items-center gap-2 md:gap-4 group pr-2 md:pr-4">
        {/* Boutons Pause et Arrêt (à gauche, visibles au hover sur desktop, toujours visibles sur mobile) */}
        <div className="flex items-center gap-2 md:gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 transform translate-x-0 md:translate-x-6 md:group-hover:translate-x-0 pointer-events-auto md:pointer-events-none md:group-hover:pointer-events-auto">
          {isPaused ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onResume();
              }}
              className="p-2.5 md:p-3.5 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full transition-all shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95"
              title="Reprendre"
            >
              <Play className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPause();
              }}
              className="p-2.5 md:p-3.5 bg-gradient-to-br from-sunset-500 to-sunset-600 hover:from-sunset-600 hover:to-sunset-700 text-white rounded-full transition-all shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95"
              title="Pause"
            >
              <Pause className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onStop();
            }}
            className="p-2.5 md:p-3.5 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full transition-all shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95"
            title="Arrêter"
          >
            <Square className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Bouton principal rond avec animation douce */}
        <div className="relative">
          {/* Ondes douces en arrière-plan */}
          <div className="absolute inset-0 bg-coral-400 rounded-full opacity-20 animate-ping pointer-events-none" style={{ animationDuration: '2s' }}></div>
          <div className="absolute inset-0 bg-coral-400 rounded-full opacity-30 animate-pulse pointer-events-none" style={{ animationDuration: '2s' }}></div>
          
          {/* Bouton rond principal */}
          <div className="relative w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-coral-500 to-coral-600 rounded-full shadow-2xl flex flex-col items-center justify-center border-2 md:border-4 border-white transition-transform hover:scale-105 cursor-pointer">
            {/* Indicateur d'enregistrement */}
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-white rounded-full animate-pulse shadow-lg mb-1 md:mb-2" />
            
            {/* Timer */}
            <span className="font-mono font-bold text-white text-xs md:text-sm">
              {formatTime(recordingTime)}
            </span>

            {/* Indicateur de pause */}
            {isPaused && (
              <div className="absolute bottom-2 md:bottom-3 left-0 right-0">
                <p className="text-[10px] md:text-xs text-white font-bold text-center tracking-wider">PAUSE</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
