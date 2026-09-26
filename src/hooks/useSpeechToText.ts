import { useState, useEffect, useRef, useCallback } from 'react';

// Web Speech API interface declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface UseSpeechToTextOptions {
  onFinalTranscript?: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  continuous?: boolean;
  lang?: string;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}) {
  const {
    onFinalTranscript,
    onInterimTranscript,
    continuous = true,
    lang = 'en-US'
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const shouldKeepListeningRef = useRef(false);

  // Initialize Speech Recognition
  useEffect(() => {
    const win = typeof window !== 'undefined' ? (window as unknown as IWindow) : null;
    const SpeechRecognition = win?.SpeechRecognition || win?.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let currentInterim = '';
      let currentFinal = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          currentFinal += item[0].transcript + ' ';
        } else {
          currentInterim += item[0].transcript;
        }
      }

      if (currentFinal) {
        setTranscript((prev) => {
          const updated = (prev ? prev + ' ' : '') + currentFinal.trim();
          onFinalTranscript?.(updated);
          return updated;
        });
      }

      setInterimText(currentInterim);
      onInterimTranscript?.(currentInterim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Don't show error on intentional abort or no-speech in continuous mode
      if (event.error === 'no-speech') {
        return;
      }
      if (event.error === 'aborted') {
        return;
      }
      console.warn('Speech recognition warning:', event.error);
      setError(`Microphone error: ${event.error}`);
    };

    recognition.onend = () => {
      // If continuous mode is enabled and user hasn't explicitly stopped, restart
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // ignore already started error
        }
      } else {
        setIsListening(false);
        stopAudioLevelMonitoring();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldKeepListeningRef.current = false;
      try {
        recognition.stop();
      } catch (e) {}
      stopAudioLevelMonitoring();
    };
  }, [lang, continuous]);

  // Audio level monitoring via Web Audio API (optional, will not block recognition)
  const startAudioLevelMonitoring = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      microphoneStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));

        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (err) {
      console.warn('Audio level monitoring not active or denied:', err);
    }
  };

  const stopAudioLevelMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach((track) => track.stop());
      microphoneStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  const startListening = useCallback(async () => {
    setError(null);
    shouldKeepListeningRef.current = true;

    // Start speech recognition directly without waiting on or failing from audio context
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: any) {
        // Recognition might already be running
        if (err.name !== 'InvalidStateError') {
          console.warn('Recognition start error:', err);
        }
      }
    }

    // Try starting volume level visualizer in background
    startAudioLevelMonitoring().catch(() => {});
  }, []);

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    stopAudioLevelMonitoring();
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimText('');
  }, []);

  return {
    isListening,
    transcript,
    interimText,
    audioLevel,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript
  };
}
