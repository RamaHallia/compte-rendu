import { Mic, Square, Pause, Play } from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  isStarting?: boolean;
}

export const RecordingControls = ({
  isRecording,
  isPaused,
  recordingTime,
  onStart,
  onPause,
  onResume,
  onStop,
  isStarting = false,
}: RecordingControlsProps) => {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex items-center gap-5">
        {!isRecording ? (
          <div className="relative">
            {/* Ondes douces en arrière-plan */}
            <div className="absolute inset-0 bg-coral-400 rounded-full opacity-20 animate-ping" style={{ animationDuration: '2s' }}></div>
            <div className="absolute inset-0 bg-coral-400 rounded-full opacity-30 animate-pulse" style={{ animationDuration: '2s' }}></div>
            
            {/* Bouton rond principal */}
            <button
              onClick={onStart}
              disabled={isStarting}
              className={`relative w-40 h-40 rounded-full transition-all shadow-2xl flex flex-col items-center justify-center border-4 border-white ${
                isStarting 
                  ? 'bg-gradient-to-br from-gray-400 to-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-br from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 hover:scale-110 shadow-coral-500/50 hover:shadow-coral-500/70'
              }`}
            >
              {isStarting ? (
                <>
                  <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
                  <span className="font-bold text-white text-sm">Démarrage...</span>
                </>
              ) : (
                <>
                  <Mic className="w-16 h-16 text-white mb-2" />
                  <span className="font-bold text-white text-sm">Démarrer</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={onResume}
                className="flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white w-20 h-20 rounded-2xl transition-all shadow-xl hover:shadow-2xl hover:scale-105"
                title="Resume"
              >
                <Play className="w-9 h-9" />
              </button>
            ) : (
              <button
                onClick={onPause}
                className="flex items-center justify-center bg-gradient-to-br from-sunset-500 to-sunset-600 hover:from-sunset-600 hover:to-sunset-700 text-white w-20 h-20 rounded-2xl transition-all shadow-xl hover:shadow-2xl hover:scale-105"
                title="Pause"
              >
                <Pause className="w-9 h-9" />
              </button>
            )}

            <button
              onClick={onStop}
              className="flex items-center justify-center bg-gradient-to-br from-cocoa-700 to-cocoa-800 hover:from-cocoa-800 hover:to-cocoa-900 text-white w-20 h-20 rounded-2xl transition-all shadow-xl hover:shadow-2xl hover:scale-105"
              title="Stop"
            >
              <Square className="w-9 h-9" />
            </button>
          </>
        )}
      </div>

      <div className="text-6xl font-mono font-bold bg-gradient-to-r from-coral-600 to-sunset-600 bg-clip-text text-transparent">
        {formatTime(recordingTime)}
      </div>

      {isRecording && (
        <div className="flex items-center gap-3 px-6 py-3 bg-coral-50 border border-coral-200 rounded-full">
          <div className="w-3 h-3 bg-coral-500 rounded-full animate-pulse shadow-lg shadow-coral-500/50" />
          <span className="font-bold text-coral-700">
            {isPaused ? 'Recording Paused' : 'Recording...'}
          </span>
        </div>
      )}
    </div>
  );
};
