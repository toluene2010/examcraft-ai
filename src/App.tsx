/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Mic,
  BookOpen,
  Printer,
  Sparkles,
  Download,
  Upload,
  RotateCcw,
  FileCheck,
  CheckCircle2,
  FileText,
  Volume2,
  Columns2
} from 'lucide-react';
import { Header } from './components/Header';
import { ExamHeaderEditor } from './components/ExamHeaderEditor';
import { QuestionCard } from './components/QuestionCard';
import { A4PaperPreview } from './components/A4PaperPreview';
import { SpeechDictationModal } from './components/SpeechDictationModal';
import { DocumentUploadModal } from './components/DocumentUploadModal';
import { ShareModal } from './components/ShareModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ExamMetadata, ExamPrintConfig, ExamQuestion } from './types/exam';

// Clean initial state for a fresh exam creation
const INITIAL_METADATA: ExamMetadata = {
  institutionName: '',
  department: '',
  academicYear: '',
  examTitle: 'EXAMINATION QUESTION PAPER',
  subject: '',
  gradeLevel: '',
  durationMinutes: 60,
  totalMarks: 0,
  date: '',
  instructions: [
    'Read all questions carefully before attempting.',
    'Write your candidate details clearly in the designated space.',
    'Calculators and electronic communication devices are not permitted unless authorized.'
  ],
  enableStudentInfoBox: true
};

const INITIAL_QUESTIONS: ExamQuestion[] = [];

const INITIAL_PRINT_CONFIG: ExamPrintConfig = {
  layoutColumns: 1,
  fontSize: 'standard',
  spacing: 'standard',
  printMode: 'all_with_answers_at_end',
  answerKeyOnNewPage: false,
  showAnswerLinesForTheory: true,
  answerLinesCount: 3,
  showMarksPerQuestion: true
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [metadata, setMetadata] = useState<ExamMetadata>(() => {
    const saved = localStorage.getItem('examcraft_v2_meta');
    return saved ? JSON.parse(saved) : INITIAL_METADATA;
  });
  const [questions, setQuestions] = useState<ExamQuestion[]>(() => {
    const saved = localStorage.getItem('examcraft_v2_questions');
    return saved ? JSON.parse(saved) : INITIAL_QUESTIONS;
  });
  const [printConfig, setPrintConfig] = useState<ExamPrintConfig>(() => {
    const saved = localStorage.getItem('examcraft_v2_print_config');
    return saved ? JSON.parse(saved) : INITIAL_PRINT_CONFIG;
  });

  const [isSpeechModalOpen, setIsSpeechModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Auto-save to localStorage for PWA offline persistence
  useEffect(() => {
    localStorage.setItem('examcraft_v2_meta', JSON.stringify(metadata));
  }, [metadata]);

  useEffect(() => {
    localStorage.setItem('examcraft_v2_questions', JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem('examcraft_v2_print_config', JSON.stringify(printConfig));
  }, [printConfig]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Re-number questions sequentially
  const renumberQuestions = (qList: ExamQuestion[]): ExamQuestion[] => {
    return qList.map((q, idx) => ({
      ...q,
      number: idx + 1
    }));
  };

  const handleAddManualQuestion = () => {
    const newQ: ExamQuestion = {
      id: 'q-' + Date.now(),
      number: questions.length + 1,
      type: 'multiple_choice',
      question: 'New question prompt...',
      options: ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'],
      answer: 'A) Option 1',
      marks: 1,
      section: 'SECTION A: OBJECTIVE'
    };
    setQuestions((prev) => [...prev, newQ]);
    showToast('New question added');
  };

  const handleAddSpeechQuestion = (q: ExamQuestion) => {
    setQuestions((prev) => renumberQuestions([...prev, q]));
    showToast(`Question ${questions.length + 1} added via speech dictation!`);
  };

  const handleQuestionsGeneratedFromUpload = (
    newQuestions: ExamQuestion[],
    updates?: { subject?: string; totalMarks?: number; durationMinutes?: number }
  ) => {
    setQuestions(renumberQuestions(newQuestions));
    if (updates) {
      setMetadata((prev) => ({
        ...prev,
        subject: updates.subject || prev.subject,
        totalMarks: updates.totalMarks || prev.totalMarks,
        durationMinutes: updates.durationMinutes || prev.durationMinutes
      }));
    }
    setActiveTab('preview');
    showToast(`Generated ${newQuestions.length} exam questions from textbook material!`);
  };

  const handleUpdateQuestion = (updated: ExamQuestion) => {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => renumberQuestions(prev.filter((q) => q.id !== id)));
    showToast('Question removed');
  };

  const handleDuplicateQuestion = (id: string) => {
    const found = questions.find((q) => q.id === id);
    if (!found) return;
    const duplicated: ExamQuestion = {
      ...found,
      id: 'q-' + Date.now(),
      question: found.question + ' (Copy)'
    };
    setQuestions((prev) => renumberQuestions([...prev, duplicated]));
    showToast('Question duplicated');
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const copy = [...questions];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    setQuestions(renumberQuestions(copy));
  };

  const handleReset = () => {
    if (window.confirm('Clear all questions and start a fresh exam paper?')) {
      setMetadata(INITIAL_METADATA);
      setQuestions([]);
      setPrintConfig(INITIAL_PRINT_CONFIG);
      showToast('Exam paper cleared for a fresh start');
    }
  };

  const handleExportJSON = () => {
    const examData = {
      metadata,
      questions,
      printConfig,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(examData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.subject.replace(/[^a-z0-9]/gi, '_')}_Exam_Paper.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exam paper exported as JSON backup');
  };

  const totalCalculatedMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Offline Status Indicator */}
      <OfflineIndicator />

      {/* Floating notification toast */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        currentTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSpeechModal={() => setIsSpeechModalOpen(true)}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onAddManualQuestion={handleAddManualQuestion}
        onResetExam={handleReset}
        totalQuestions={questions.length}
        totalMarks={totalCalculatedMarks}
      />

      {/* App Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: QUESTION EDITOR */}
        {activeTab === 'editor' && (
          <div className="space-y-6 animate-fade-in">
            {/* Quick Hero Banner with Voice & Upload calls to action */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 text-xs font-semibold mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Real-Time Speech &amp; Textbook AI Engine</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Set Examination Papers with Voice or Textbook Scans
                </h1>
                <p className="mt-2 text-indigo-200 text-xs sm:text-sm leading-relaxed">
                  Speak questions aloud with instant speech-to-text dictation, or upload textbook/notebook pages.
                  Everything is formatted directly for standard A4 paper with answers placed at the end.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setIsSpeechModalOpen(true)}
                    className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-rose-500/30 transition active:scale-95 cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Real-Time Voice Dictation</span>
                  </button>

                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center gap-2 bg-white text-indigo-900 hover:bg-indigo-50 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>Upload Textbook / Notebook</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('preview')}
                    className="flex items-center gap-2 bg-indigo-700/60 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium text-xs transition border border-indigo-500/40 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Preview A4 Sheet ({questions.length} Qs)</span>
                  </button>
                </div>
              </div>

              {/* Decorative background watermark */}
              <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none hidden lg:block">
                <FileCheck className="w-80 h-80 text-white" />
              </div>
            </div>

            {/* Exam Header Configuration */}
            <ExamHeaderEditor metadata={metadata} onChange={setMetadata} />

            {/* Questions Toolbar & Counter */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Exam Questions ({questions.length})
                </h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {totalCalculatedMarks} Total Marks
                </span>
              </div>

              <div className="flex items-center gap-2">
                {questions.length > 0 && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition cursor-pointer"
                    title="Clear all questions and start clean"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Paper</span>
                  </button>
                )}

                <button
                  onClick={handleExportJSON}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
                  title="Export questions backup"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Backup JSON</span>
                </button>

                <button
                  onClick={handleAddManualQuestion}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs transition active:scale-95 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            {questions.length === 0 ? (
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-12 text-center">
                <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 inline-block mb-3">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No examination questions yet
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Click below to speak questions aloud in real time, or upload a textbook photo/PDF to automatically formulate questions!
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <button
                    onClick={() => setIsSpeechModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 text-white font-semibold text-xs cursor-pointer shadow-md"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Speak Question</span>
                  </button>
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs cursor-pointer shadow-md"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Upload Textbook</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={idx}
                    totalQuestions={questions.length}
                    onUpdate={handleUpdateQuestion}
                    onDelete={() => handleDeleteQuestion(q.id)}
                    onDuplicate={() => handleDuplicateQuestion(q.id)}
                    onMoveUp={() => handleMoveQuestion(idx, 'up')}
                    onMoveDown={() => handleMoveQuestion(idx, 'down')}
                  />
                ))}
              </div>
            )}

            {/* Bottom Add Bar */}
            <div className="pt-4 flex justify-center gap-3">
              <button
                onClick={handleAddManualQuestion}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 text-slate-600 dark:text-slate-300 hover:text-indigo-600 font-semibold text-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question #{questions.length + 1}</span>
              </button>

              <button
                onClick={() => setIsSpeechModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-xs border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 transition cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>Dictate via Microphone</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: A4 PAPER PREVIEW & PRINT */}
        {activeTab === 'preview' && (
          <div className="animate-fade-in">
            <A4PaperPreview
              metadata={metadata}
              questions={questions}
              config={printConfig}
              onUpdateConfig={setPrintConfig}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <SpeechDictationModal
        isOpen={isSpeechModalOpen}
        onClose={() => setIsSpeechModalOpen(false)}
        onAddQuestion={handleAddSpeechQuestion}
        subject={metadata.subject}
        nextQuestionNumber={questions.length + 1}
      />

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onQuestionsGenerated={handleQuestionsGeneratedFromUpload}
        initialSubject={metadata.subject}
        initialGrade={metadata.gradeLevel}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        metadata={metadata}
        questions={questions}
        config={printConfig}
        onTriggerPrint={() => {
          setActiveTab('preview');
          setTimeout(() => window.print(), 200);
        }}
      />
    </div>
  );
}
