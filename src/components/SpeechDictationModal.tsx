import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Check, X, AlertCircle, Copy, ArrowRight, RefreshCw, Volume2 } from 'lucide-react';
import { refineSpokenQuestion, transcribeAudioRecording } from '../services/api';
import { ExamQuestion } from '../types/exam';

interface SpeechDictationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddQuestion: (question: ExamQuestion) => void;
  subject: string;
  nextQuestionNumber: number;
}

export const SpeechDictationModal: React.FC<SpeechDictationModalProps> = ({
  isOpen,
  onClose,
  onAddQuestion,
  subject,
  nextQuestionNumber
}) => {
  const [dictationText, setDictationText] = useState('');
  const [interimSpoken, setInterimSpoken] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');

  // References
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isManuallyStoppedRef = useRef(false);

  // Check browser speech support
  const isWebSpeechSupported =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Stop recording cleanup
  const stopRecording = () => {
    isManuallyStoppedRef.current = true;
    setIsRecording(false);
    setInterimSpoken('');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
  };

  // Start recording
  const startRecording = async () => {
    setErrorMessage(null);
    isManuallyStoppedRef.current = false;
    setInterimSpoken('');

    // Method 1: Web Speech Recognition
    if (isWebSpeechSupported) {
      try {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch (e) {}
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLanguage;

        recognition.onstart = () => {
          setIsRecording(true);
          setErrorMessage(null);
        };

        // KEY FIX: Only commit final sentences to dictationText once, keep interim separate
        recognition.onresult = (event: any) => {
          let interimStr = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result.isFinal) {
              const phrase = result[0].transcript.trim();
              if (phrase) {
                setDictationText((prev) => {
                  const cleanedPrev = prev.trim();
                  return cleanedPrev ? `${cleanedPrev} ${phrase}` : phrase;
                });
              }
            } else {
              interimStr += result[0].transcript;
            }
          }
          setInterimSpoken(interimStr);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition warning:', event.error);
          if (event.error === 'not-allowed') {
            setErrorMessage('Microphone access was denied. Please allow microphone permission in your browser address bar.');
            setIsRecording(false);
          } else if (event.error === 'no-speech') {
            // User paused speaking, do not error out
          } else if (event.error !== 'aborted') {
            setErrorMessage(`Microphone note: ${event.error}`);
          }
        };

        recognition.onend = () => {
          // If the user didn't explicitly click "Stop", auto-restart for continuous dictation
          if (!isManuallyStoppedRef.current && isOpen) {
            try {
              recognition.start();
            } catch (err) {
              setIsRecording(false);
            }
          } else {
            setIsRecording(false);
            setInterimSpoken('');
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
        return;
      } catch (err: any) {
        console.warn('Web Speech start error, falling back to MediaRecorder:', err);
      }
    }

    // Method 2: Fallback to MediaRecorder + Gemini Speech API
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(stream);

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            await handleTranscribeBlob(audioBlob);
          }
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (micErr: any) {
        console.error('Microphone error:', micErr);
        setErrorMessage('Could not access microphone. Please check permissions or type directly.');
        setIsRecording(false);
      }
    } else {
      setErrorMessage('Speech recognition is not supported in this browser. Please type directly into the box.');
    }
  };

  const handleTranscribeBlob = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        try {
          const text = await transcribeAudioRecording(base64Audio, blob.type || 'audio/webm');
          if (text) {
            setDictationText((prev) => (prev ? `${prev} ${text}` : text));
          }
        } catch (err: any) {
          console.error('Transcription error:', err);
        } finally {
          setIsTranscribing(false);
        }
      };
    } catch (err) {
      setIsTranscribing(false);
    }
  };

  // Lifecycle
  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      setDictationText('');
      setInterimSpoken('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Clean stutter / duplicated words helper button
  const cleanStutteredText = () => {
    const raw = (dictationText + (interimSpoken ? ` ${interimSpoken}` : '')).trim();
    if (!raw) return;

    // Remove repeated consecutive identical words or short phrases
    const words = raw.split(/\s+/);
    const cleanedWords: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const current = words[i];
      const prev = cleanedWords[cleanedWords.length - 1];
      if (!prev || current.toLowerCase() !== prev.toLowerCase()) {
        cleanedWords.push(current);
      }
    }

    setDictationText(cleanedWords.join(' '));
    setInterimSpoken('');
  };

  // Direct OK Button Action
  const handleInsertRaw = () => {
    const fullText = (dictationText + (interimSpoken ? ` ${interimSpoken}` : '')).trim();
    if (!fullText) {
      setErrorMessage('Please speak or type a question first.');
      return;
    }

    const newQ: ExamQuestion = {
      id: 'dictated-' + Date.now(),
      number: nextQuestionNumber,
      type: 'short_answer',
      question: fullText,
      answer: 'To be provided by teacher.',
      marks: 2
    };

    onAddQuestion(newQ);
    stopRecording();
    onClose();
  };

  // AI Auto-Format Action
  const handleRefineWithAI = async () => {
    const fullText = (dictationText + (interimSpoken ? ` ${interimSpoken}` : '')).trim();
    if (!fullText) {
      setErrorMessage('Please speak or type your question before clicking Auto-Format.');
      return;
    }

    setIsProcessingAI(true);
    setErrorMessage(null);

    try {
      const refinedQuestion = await refineSpokenQuestion(
        fullText,
        subject,
        nextQuestionNumber
      );
      onAddQuestion(refinedQuestion);
      stopRecording();
      onClose();
    } catch (err: any) {
      console.error('Refine question error:', err);
      // Automatically fall back to inserting the raw question so the user is never stuck
      handleInsertRaw();
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleCopy = () => {
    const text = (dictationText + (interimSpoken ? ` ${interimSpoken}` : '')).trim();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const currentDisplayValue = dictationText;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl transition ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                : 'bg-indigo-600 text-white'
            }`}>
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Dictate or Type Question
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click <strong className="text-emerald-600 dark:text-emerald-400">"Start Microphone"</strong> to speak, or edit anytime below.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopRecording();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Controls Bar */}
        <div className="bg-slate-900 px-6 py-3 flex items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (isRecording) {
                  stopRecording();
                } else {
                  startRecording();
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/40'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Stop Microphone</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Start Microphone (Click to Speak)</span>
                </>
              )}
            </button>

            {isRecording && (
              <span className="flex items-center gap-1.5 text-xs text-rose-300 font-medium animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Listening now... speak clearly
              </span>
            )}
            {isTranscribing && (
              <span className="text-xs text-indigo-300 animate-pulse font-medium">
                Transcribing audio...
              </span>
            )}
          </div>

          {/* Language Selector */}
          <select
            value={selectedLanguage}
            onChange={(e) => {
              setSelectedLanguage(e.target.value);
              if (isRecording) {
                stopRecording();
              }
            }}
            className="text-xs bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="en-NG">English (Nigeria)</option>
            <option value="en-IN">English (India)</option>
          </select>
        </div>

        {/* Question Text Box Area */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs rounded-2xl border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1">
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                Question Text:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cleanStutteredText}
                  className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold px-2 py-0.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                  title="Remove repeated words"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Clean Repeat Words</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition font-medium"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDictationText('');
                    setInterimSpoken('');
                  }}
                  className="hover:text-rose-600 transition font-medium text-slate-400 hover:text-rose-500"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="relative rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:border-indigo-500 transition shadow-inner">
              <textarea
                value={currentDisplayValue}
                onChange={(e) => setDictationText(e.target.value)}
                placeholder="Click 'Start Microphone' above and speak, or type your question here directly...&#10;&#10;e.g. 'One of the importance of agriculture is _______'"
                className="w-full min-h-[140px] p-4 bg-transparent resize-y border-none focus:outline-none text-slate-900 dark:text-slate-100 text-sm leading-relaxed"
                rows={5}
              />

              {/* Show live incoming interim speech nicely below the box */}
              {interimSpoken && (
                <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 animate-pulse text-indigo-500 shrink-0" />
                  <span className="font-medium italic">Hearing: "{interimSpoken}..."</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              Tip: You can edit the text directly at any time. When ready, click <strong>OK (Insert Question)</strong> below.
            </p>
          </div>
        </div>

        {/* Footer Controls - OK & Auto-Format */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              stopRecording();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            {/* Direct OK Button */}
            <button
              type="button"
              onClick={handleInsertRaw}
              disabled={!dictationText.trim() && !interimSpoken.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:shadow-none transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>OK (Insert Question)</span>
            </button>

            {/* Smart AI Format Button */}
            <button
              type="button"
              onClick={handleRefineWithAI}
              disabled={(!dictationText.trim() && !interimSpoken.trim()) || isProcessingAI}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition active:scale-95 cursor-pointer"
            >
              {isProcessingAI ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Formatting...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>AI Auto-Format (MCQ)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
