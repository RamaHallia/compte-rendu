import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isActive: boolean;
  barColor?: string;
  bgColor?: string;
}

export const AudioVisualizer = ({
  stream,
  isActive,
  barColor = '#FF6B4A',
  bgColor = 'transparent',
}: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const freqBufferRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const cssWidth = canvas.clientWidth || 600;
      const cssHeight = 140;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!isActive || !stream || !canvasRef.current) return;

    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const audioCtx: AudioContext = new AudioCtx();
    audioContextRef.current = audioCtx;

    const analyser = audioCtx.createAnalyser();
    // FFT plus grande pour plus de précision, et smoothing modéré pour la réactivité
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.75;
    analyserRef.current = analyser;

    if (stream.getAudioTracks().length === 0) {
      return () => {
        audioCtx.close();
      };
    }
    const source = audioCtx.createMediaStreamSource(stream);
    sourceRef.current = source;
    source.connect(analyser);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    // Buffer de fréquences pour des barres claires et nettes
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    freqBufferRef.current = freqData;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const mid = Math.floor(h / 2) + 0.5; // alignement pixel parfait

      // Nettoyage complet
      ctx.clearRect(0, 0, w, h);

      // Récupérer les fréquences
      analyser.getByteFrequencyData(freqData);

      // Paramètres des barres (scalés pour Hi-DPI)
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const barWidth = Math.max(2, Math.floor(3 * dpr));
      const gap = Math.max(1, Math.floor(2 * dpr));
      const total = Math.floor(w / (barWidth + gap));

      // Nombre d'échantillons à agréger par barre
      const step = Math.max(1, Math.floor(freqData.length / total));

      ctx.fillStyle = barColor as any; // couleur unie, pas de dégradé

      for (let i = 0; i < total; i++) {
        // Moyenne locale pour un rendu stable
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += freqData[i * step + j] || 0;
        }
        const value = sum / step; // 0..255
        // Hauteur proportionnelle, avec une légère courbe pour l'œil
        const norm = Math.pow(value / 255, 0.9);
        const barH = Math.max(2, Math.floor(norm * (h * 0.9)));

        const x = Math.floor(i * (barWidth + gap)) + 0.5; // alignement net
        const yTop = mid - barH;
        const yBottom = mid;

        // Barres miroir (haut et bas) pour un style pro
        ctx.fillRect(x, yTop, barWidth, barH);
        ctx.fillRect(x, yBottom, barWidth, barH);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (analyserRef.current) analyserRef.current.disconnect();
      if (sourceRef.current) sourceRef.current.disconnect();
      audioCtx.close();
    };
  }, [isActive, stream, barColor]);

  return (
    <div className="flex justify-center items-center w-full py-4 px-2 rounded-xl" style={{ background: bgColor }}>
      <canvas
        ref={canvasRef}
        className="rounded-lg w-full h-[140px]"
        style={{ display: isActive ? 'block' : 'none', maxWidth: '100%' }}
      />
      {!isActive && (
        <div className="flex items-center justify-center h-[140px] w-full text-cocoa-500/70 text-sm">
          Visualisation en pause
        </div>
      )}
    </div>
  );
};

