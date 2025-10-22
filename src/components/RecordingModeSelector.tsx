import { Mic, Monitor, Video } from 'lucide-react';

interface RecordingModeSelectorProps {
  selectedMode: 'microphone' | 'system' | 'visio';
  onModeChange: (mode: 'microphone' | 'system' | 'visio') => void;
  disabled?: boolean;
}

export const RecordingModeSelector = ({ selectedMode, onModeChange, disabled = false }: RecordingModeSelectorProps) => {
  const modes = [
    {
      id: 'microphone' as const,
      label: 'Mode Présentiel',
      description: 'Enregistrer uniquement votre voix',
      icon: Mic,
      color: 'bg-blue-500',
    },
    {
      id: 'visio' as const,
      label: 'Mode Visio',
      description: 'Microphone + Audio système simultanément',
      icon: Video,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Mode d'enregistrement</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;
          
          return (
            <button
              key={mode.id}
              onClick={() => !disabled && onModeChange(mode.id)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200
                ${isSelected 
                  ? 'border-coral-500 bg-coral-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center space-x-3">
                <div className={`
                  p-2 rounded-lg text-white
                  ${mode.color}
                `}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-medium text-gray-900">{mode.label}</h4>
                  <p className="text-sm text-gray-600 mt-1">{mode.description}</p>
                </div>
              </div>
              
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-coral-500 rounded-full"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {selectedMode === 'visio' && (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Video className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-purple-800">Mode Visio activé</p>
              <p className="text-xs text-purple-600 mt-1">
                Vous devrez partager votre écran/onglet avec l'audio ET autoriser l'accès au microphone.
                Les deux sources audio seront mixées ensemble.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
