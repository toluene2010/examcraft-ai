import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Plus,
  CheckCircle,
  HelpCircle,
  Award,
  Layers,
  Sparkles
} from 'lucide-react';
import { ExamQuestion, QuestionType } from '../types/exam';
import { useSpeechToText } from '../hooks/useSpeechToText';

interface QuestionCardProps {
  question: ExamQuestion;
  index: number;
  totalQuestions: number;
  onUpdate: (updated: ExamQuestion) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  totalQuestions,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown
}) => {
  const [activeSpeechField, setActiveSpeechField] = useState<string | null>(null);

  const {
    isListening,
    transcript,
    interimText,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechToText({
    continuous: false,
    onFinalTranscript: (text) => {
      if (!activeSpeechField) return;
      handleSpeechInput(activeSpeechField, text);
    }
  });

  const handleSpeechInput = (fieldName: string, text: string) => {
    if (!text.trim()) return;

    if (fieldName === 'question') {
      onUpdate({
        ...question,
        question: (question.question ? question.question + ' ' : '') + text.trim()
      });
    } else if (fieldName.startsWith('option-')) {
      const optIdx = parseInt(fieldName.split('-')[1]);
      const currentOpts = question.options ? [...question.options] : [];
      const prefix = ['A) ', 'B) ', 'C) ', 'D) ', 'E) '][optIdx] || '';
      currentOpts[optIdx] = prefix + text.trim().replace(/^[A-E]\)\s*/i, '');
      onUpdate({
        ...question,
        options: currentOpts
      });
    } else if (fieldName === 'answer') {
      onUpdate({
        ...question,
        answer: text.trim()
      });
    } else if (fieldName === 'explanation') {
      onUpdate({
        ...question,
        explanation: (question.explanation ? question.explanation + ' ' : '') + text.trim()
      });
    }

    setActiveSpeechField(null);
    stopListening();
    resetTranscript();
  };

  const toggleFieldDictation = (field: string) => {
    if (activeSpeechField === field && isListening) {
      stopListening();
      setActiveSpeechField(null);
      resetTranscript();
    } else {
      setActiveSpeechField(field);
      resetTranscript();
      startListening();
    }
  };

  const updateType = (newType: QuestionType) => {
    let newOptions = question.options;
    if (newType === 'multiple_choice' && (!newOptions || newOptions.length < 2)) {
      newOptions = ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'];
    } else if (newType === 'true_false') {
      newOptions = ['A) True', 'B) False'];
    }

    onUpdate({
      ...question,
      type: newType,
      options: newOptions
    });
  };

  const handleOptionChange = (optIdx: number, val: string) => {
    const opts = question.options ? [...question.options] : [];
    opts[optIdx] = val;
    onUpdate({
      ...question,
      options: opts
    });
  };

  const addOption = () => {
    const opts = question.options ? [...question.options] : [];
    const prefix = ['A', 'B', 'C', 'D', 'E', 'F'][opts.length] || 'Option';
    opts.push(`${prefix}) Option ${opts.length + 1}`);
    onUpdate({ ...question, options: opts });
  };

  const removeOption = (optIdx: number) => {
    const opts = question.options ? [...question.options] : [];
    opts.splice(optIdx, 1);
    onUpdate({ ...question, options: opts });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 transition hover:border-slate-300 dark:hover:border-slate-700">
      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs">
            {question.number}
          </span>

          {/* Question Type selector */}
          <select
            value={question.type}
            onChange={(e) => updateType(e.target.value as QuestionType)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="multiple_choice">Multiple Choice (MCQ)</option>
            <option value="short_answer">Short Answer / Theory</option>
            <option value="true_false">True / False</option>
            <option value="fill_blank">Fill in Blank</option>
            <option value="essay">Essay / Long Response</option>
          </select>

          {/* Section tag (optional) */}
          <input
            type="text"
            value={question.section || ''}
            onChange={(e) => onUpdate({ ...question, section: e.target.value })}
            placeholder="Section (e.g. Section A)"
            className="hidden sm:block text-[11px] font-medium text-slate-500 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-2 py-0.5 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 max-w-[120px]"
          />
        </div>

        {/* Right side controls: Marks, Move, Duplicate, Delete */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg text-xs font-bold mr-1">
            <Award className="w-3.5 h-3.5 text-indigo-500" />
            <input
              type="number"
              min="1"
              max="100"
              value={question.marks}
              onChange={(e) => onUpdate({ ...question, marks: parseInt(e.target.value) || 1 })}
              className="w-10 bg-transparent text-center font-bold focus:outline-none border-b border-indigo-300 dark:border-indigo-700"
            />
            <span className="text-[10px] uppercase">pts</span>
          </div>

          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
            title="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === totalQuestions - 1}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
            title="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={onDuplicate}
            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Duplicate question"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Delete question"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question Text with Dedicated Mic Dictation */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Question Text:
            </label>
            <button
              onClick={() => toggleFieldDictation('question')}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                activeSpeechField === 'question' && isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
              title="Speak into this question"
            >
              <Mic className="w-3 h-3" />
              <span>{activeSpeechField === 'question' && isListening ? 'Listening...' : 'Voice Dictate'}</span>
            </button>
          </div>

          <textarea
            value={question.question}
            onChange={(e) => onUpdate({ ...question, question: e.target.value })}
            placeholder="Type or speak the exam question prompt..."
            rows={2}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-3 text-slate-900 dark:text-slate-100 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />

          {activeSpeechField === 'question' && isListening && interimText && (
            <div className="text-[11px] text-rose-600 dark:text-rose-400 italic mt-1 animate-pulse">
              Hearing: "{interimText}"
            </div>
          )}
        </div>

        {/* Options for MCQ / True False */}
        {(question.type === 'multiple_choice' || question.type === 'true_false') && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Options (Click radio to mark correct answer):
              </span>
              {question.type === 'multiple_choice' && (
                <button
                  onClick={addOption}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Option</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {question.options?.map((opt, optIdx) => {
                const isCorrect = question.answer && (
                  question.answer.trim().toLowerCase() === opt.trim().toLowerCase() ||
                  question.answer.trim().startsWith(opt.substring(0, 2))
                );

                return (
                  <div
                    key={optIdx}
                    className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                      isCorrect
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onUpdate({ ...question, answer: opt })}
                      className={`h-4 w-4 rounded-full border flex items-center justify-center cursor-pointer shrink-0 ${
                        isCorrect
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                      title="Set as correct answer"
                    >
                      {isCorrect && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </button>

                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(optIdx, e.target.value)}
                      className="flex-1 bg-transparent border-none text-xs text-slate-800 dark:text-slate-100 focus:outline-none font-medium"
                    />

                    {/* Inline Mic dictation for option */}
                    <button
                      type="button"
                      onClick={() => toggleFieldDictation(`option-${optIdx}`)}
                      className={`p-1 rounded-md text-slate-400 hover:text-indigo-600 transition ${
                        activeSpeechField === `option-${optIdx}` && isListening ? 'text-rose-500 animate-pulse' : ''
                      }`}
                      title="Dictate option"
                    >
                      <Mic className="w-3 h-3" />
                    </button>

                    {question.type === 'multiple_choice' && (question.options?.length || 0) > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(optIdx)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                        title="Remove option"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Answer & Explanation (Placed at the end of exam paper) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Correct Answer / Solution:</span>
              </label>
              <button
                onClick={() => toggleFieldDictation('answer')}
                className={`p-1 rounded text-slate-400 hover:text-emerald-600 transition ${
                  activeSpeechField === 'answer' && isListening ? 'text-rose-500 animate-pulse' : ''
                }`}
                title="Speak answer"
              >
                <Mic className="w-3 h-3" />
              </button>
            </div>
            <input
              type="text"
              value={question.answer}
              onChange={(e) => onUpdate({ ...question, answer: e.target.value })}
              placeholder="e.g. B) Mitochondria or model formula"
              className="w-full rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 px-3 py-1.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Marking Scheme / Explanation (End Key):</span>
              </label>
              <button
                onClick={() => toggleFieldDictation('explanation')}
                className={`p-1 rounded text-slate-400 hover:text-indigo-600 transition ${
                  activeSpeechField === 'explanation' && isListening ? 'text-rose-500 animate-pulse' : ''
                }`}
                title="Speak explanation"
              >
                <Mic className="w-3 h-3" />
              </button>
            </div>
            <input
              type="text"
              value={question.explanation || ''}
              onChange={(e) => onUpdate({ ...question, explanation: e.target.value })}
              placeholder="Rationale / textbook reference for the answer key..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
