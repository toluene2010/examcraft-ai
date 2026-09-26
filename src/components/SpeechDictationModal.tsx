import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Sparkles, Plus, X, Volume2, AlertCircle, Check, Copy } from 'lucide-react';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { refineSpokenQuestion } from '../services/api';
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
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [copied, setCopied] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const {
    isListening,
    transcript,
    interimText,
    audioLevel,
    isSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript
  } = useSpeechToText({
    continuous: true,
    lang: selectedLanguage
  });

  // Automatically start listening when modal opens
  useEffect(() => {
    if (isOpen && isSupported) {
      startListening();
    } else {
      stopListening();
    }
  }, [isOpen, isSupported, selectedLanguage]);

  if (!isOpen) return null;

  const handleRefineWithAI = async () => {
    const fullText = (transcript + ' ' + interimText).trim();
    if (!fullText) {
      setAiError('Please speak or type some text first.');
      return;
    }

    setIsProcessingAI(true);
    setAiError(null);
    try {
      const refinedQuestion = await refineSpokenQuestion(
        fullText,
        subject,
        nextQuestionNumber
      );
      onAddQuestion(refinedQuestion);
      resetTranscript();
      onClose();
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Failed to refine question with AI. You can still insert it as raw question.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleInsertRaw = () => {
    const fullText = (transcript + ' ' + interimText).trim();
    if (!fullText) return;

    const newQ: ExamQuestion = {
      id: 'raw-' + Date.now(),
      number: nextQuestionNumber,
      type: 'short_answer',
      question: fullText,
      answer: '',
      marks: 2
    };

    onAddQuestion(newQ);
    resetTranscript();
    onClose();
  };

  const handleCopy = () => {
    const fullText = (transcript + ' ' + interimText).trim();
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl transition ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Real-Time Speech-to-Text Question Setter
                {isListening && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] font-bold tracking-wide uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    Live Recording
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Speak exam questions naturally. AI will format into MCQ, Theory, and Answer Keys!
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopListening();
              onClose();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Audio Visualizer Bar */}
        <div className="bg-slate-900 px-6 py-3 flex items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-3 flex-1">
            <Volume2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <div className="flex-1 flex items-center gap-1 h-6">
              {Array.from({ length: 28 }).map((_, i) => {
                // Wave bar height animated based on audioLevel
                const threshold = (i / 28) * 80;
                const active = isListening && audioLevel > threshold;
                const height = active
                  ? Math.max(6, Math.min(24, Math.sin((i + audioLevel / 10)) * 14 + 10))
                  : 4;
                return (
                  <div
                    key={i}
                    style={{ height: `${height}px` }}
                    className={`flex-1 rounded-full transition-all duration-75 ${
                      active
                        ? 'bg-gradient-to-t from-indigo-500 to-rose-400'
                        : 'bg-slate-700/60'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Language selector */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="text-xs bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none"
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="en-NG">English (West Africa / Nigeria)</option>
            <option value="en-IN">English (India)</option>
            <option value="fr-FR">Français</option>
            <option value="es-ES">Español</option>
          </select>
        </div>

        {/* Speech Transcript Output Area */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {!isSupported && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs rounded-xl border border-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Web Speech API is not supported in this browser. You can type in the box below or switch to Chrome/Edge/Safari.</span>
            </div>
          )}

          {speechError && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs rounded-xl border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{speechError}. Check microphone permissions in your browser.</span>
            </div>
          )}

          {aiError && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs rounded-xl border border-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>{aiError}</span>
            </div>
          )}

          <div className="relative">
            <div className="flex items-center justify-between mb-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Real-Time Dictated Text</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 transition"
                  title="Copy text"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={resetTranscript}
                  className="hover:text-rose-600 transition"
                  title="Clear text"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="relative min-h-[160px] max-h-[220px] overflow-y-auto p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 focus-within:border-indigo-500 transition">
              <textarea
                value={interimText ? (transcript ? `${transcript} ${interimText}` : interimText) : transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Click the microphone button below or start speaking clearly into your mic... E.g. 'Question: Which organelle is known as the powerhouse of the cell? Option A: Nucleus, Option B: Mitochondria, Option C: Ribosome, Option D: Golgi Body. The correct answer is B, 2 marks.'"
                className="w-full h-full bg-transparent resize-none border-none focus:outline-none text-slate-900 dark:text-slate-100 text-sm leading-relaxed"
                rows={5}
              />
              {interimText && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                  <span>Hearing speech in real time...</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Voice Command Cheat Sheet */}
          <div className="bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/40 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Voice Dictation Shortcuts &amp; Syntax:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 text-[11px]">
              <div>
                <strong className="text-indigo-700 dark:text-indigo-300">MCQ:</strong> "Question [text], Option A [text], Option B [text], Option C [text], Option D [text], Answer is [B]"
              </div>
              <div>
                <strong className="text-indigo-700 dark:text-indigo-300">True/False:</strong> "State True or False: [statement]. Answer is True."
              </div>
              <div>
                <strong className="text-indigo-700 dark:text-indigo-300">Theory / Essay:</strong> "Explain the law of conservation of momentum. 5 marks. Answer key: statement, formula, and units."
              </div>
              <div>
                <strong className="text-indigo-700 dark:text-indigo-300">Marks:</strong> Say "Two marks" or "Five marks" to auto-assign question points.
              </div>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => {
              if (isListening) stopListening();
              else startListening();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30'
                : 'bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Pause Listening</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Resume Listening</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInsertRaw}
              disabled={!(transcript.trim() || interimText.trim()) || isProcessingAI}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-semibold disabled:opacity-50 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Insert As Question Text</span>
            </button>

            <button
              onClick={handleRefineWithAI}
              disabled={!(transcript.trim() || interimText.trim()) || isProcessingAI}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition active:scale-95 cursor-pointer"
            >
              {isProcessingAI ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>AI Formatting Question...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>AI Auto-Format Question &amp; Answer</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
