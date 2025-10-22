import { Mic } from 'lucide-react';
import { useState } from 'react';

interface FloatingStartButtonProps {
  onStartRecording: () => void;
  isVisible: boolean;
}

export const FloatingStartButton = ({ onStartRecording, isVisible }: FloatingStartButtonProps) => {
  const [isAnimating, setIsAnimating] = useState(false);

  if (!isVisible) return null;

  const handleClick = () => {
    // Simple fade-out puis navigation immédiate
    setIsAnimating(true);
    setTimeout(() => {
      onStartRecording();
      setIsAnimating(false);
    }, 200); // fade-out court
  };

  return (
    <div className="fixed bottom-16 right-16 z-40">
      {/* Fade-out seulement */}
      
      <button
        onClick={handleClick}
        className={`relative w-28 h-28 bg-gradient-to-br from-coral-500 to-coral-600 rounded-full shadow-2xl flex items-center justify-center transition-opacity duration-200 hover:shadow-coral-500/50 group ${
          isAnimating ? 'opacity-0' : 'opacity-100'
        }`}
        title="Démarrer un enregistrement"
      >
        {/* Ondes pulsantes en arrière-plan */}
        <div className="absolute inset-0 bg-coral-400 rounded-full opacity-20 animate-ping pointer-events-none" style={{ animationDuration: '2s' }}></div>
        <div className="absolute inset-0 bg-coral-400 rounded-full opacity-30 animate-pulse pointer-events-none" style={{ animationDuration: '2s' }}></div>
        
        {/* Cercle de brillance */}
        <div className="absolute inset-2 bg-gradient-to-tr from-white/30 to-transparent rounded-full pointer-events-none"></div>
        
        {/* Icône micro */}
        <div className="relative">
          <Mic className="w-12 h-12 text-white drop-shadow-lg" />
        </div>

        {/* Texte au survol */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-cocoa-800 text-white px-5 py-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-xl">
          <span className="text-base font-bold">Démarrer</span>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-cocoa-800"></div>
        </div>
      </button>
    </div>
  );
};

