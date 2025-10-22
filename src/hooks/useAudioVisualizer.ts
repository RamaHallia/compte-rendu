import { useState, useEffect, useRef } from 'react';

export const useAudioVisualizer = (stream: MediaStream | null, isRecording: boolean) => {
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(40).fill(0.2));
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !isRecording) {
      // Réinitialiser les niveaux quand l'enregistrement s'arrête
      setAudioLevels(Array(40).fill(0.2));
      
      // Nettoyer les ressources
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      return;
    }

    // Créer le contexte audio et l'analyseur
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024; // Plus de détails
    analyser.smoothingTimeConstant = 0.7; // Plus fluide
    analyserRef.current = analyser;

    // Connecter le stream à l'analyseur
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Fonction pour analyser l'audio en temps réel
    const updateLevels = () => {
      if (!analyserRef.current) return;

      analyser.getByteFrequencyData(dataArray);

      // Créer 40 barres pour un effet d'onde continue
      const barCount = 40;
      const barWidth = Math.floor(bufferLength / barCount);
      const newLevels: number[] = [];

      for (let i = 0; i < barCount; i++) {
        const start = i * barWidth;
        const end = start + barWidth;
        let sum = 0;

        // Calculer la moyenne pour cette bande de fréquence
        for (let j = start; j < end && j < bufferLength; j++) {
          sum += dataArray[j];
        }

        const average = sum / barWidth;
        // Plus sensible à la voix (division par 120 au lieu de 180)
        const normalized = Math.max(0.2, Math.min(1, average / 120));
        newLevels.push(normalized);
      }

      setAudioLevels(newLevels);
      animationFrameRef.current = requestAnimationFrame(updateLevels);
    };

    updateLevels();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stream, isRecording]);

  return audioLevels;
};

