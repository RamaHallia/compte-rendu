import { useState, useEffect, useRef } from 'react';

export const useLiveTranscription = (isRecording: boolean, isPaused: boolean) => {
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' ';
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      setTranscript((prev) => {
        if (finalTranscript) {
          return prev + finalTranscript;
        }
        const lastFinalIndex = prev.lastIndexOf(' ');
        return prev.substring(0, lastFinalIndex + 1) + interimTranscript;
      });
    };

    recognition.onerror = (event: any) => {
      
      if (event.error === 'no-speech') {
        return;
      }
    };

    recognition.onend = () => {
      if (isRecording && !isPaused) {
        try {
          recognition.start();
        } catch (error) {
          
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isRecording && !isPaused) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        
      }
    } else {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        
      }
    }
  }, [isRecording, isPaused]);

  const resetTranscript = () => {
    setTranscript('');
  };

  return { transcript, resetTranscript };
};
