import React from 'react';
import {
  Mic,
  BookOpen,
  Printer,
  Plus,
  Eye,
  Edit3,
  Sparkles,
  FileCheck,
  RotateCcw,
  Share2,
  Settings,
  Cpu
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentTab: 'editor' | 'preview';
  onTabChange: (tab: 'editor' | 'preview') => void;
  onOpenSpeechModal: () => void;
  onOpenUploadModal: () => void;
  onOpenShareModal: () => void;
  onOpenSettingsModal: () => void;
  onAddManualQuestion: () => void;
  onResetExam: () => void;
  totalQuestions: number;
  totalMarks: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenSpeechModal,
  onOpenUploadModal,
  onOpenShareModal,
  onOpenSettingsModal,
  onAddManualQuestion,
  onResetExam,
  totalQuestions,
  totalMarks
}) => {
  const currentProvider = (typeof window !== 'undefined' && localStorage.getItem('examcraft_ai_provider')) || 'gemini';

  return (
    <header className="no-print sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-blue-500 text-white shadow-md shadow-indigo-600/20">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">
                ExamCraft <span className="text-indigo-600 dark:text-indigo-400">AI</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] uppercase tracking-wide">
                A4 PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Speech-to-Text &amp; Free AI Exam Setter
            </p>
          </div>
        </div>

        {/* View mode toggle (Editor vs A4 Preview) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => onTabChange('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              currentTab === 'editor'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editor ({totalQuestions})</span>
          </button>
          <button
            onClick={() => onTabChange('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              currentTab === 'preview'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>A4 Print View</span>
          </button>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          {/* AI Provider Switch Button */}
          <button
            onClick={onOpenSettingsModal}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
            title="Switch AI Engine: Groq (Free), OpenRouter (Free), or Gemini"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-500" />
            <span className="capitalize hidden lg:inline">{currentProvider}</span>
            <span className="px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
              AI
            </span>
          </button>

          {/* Real-time speech dictation trigger */}
          <button
            onClick={onOpenSpeechModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100 font-semibold text-xs transition cursor-pointer border border-rose-200 dark:border-rose-900/50"
            title="Convert speech to text in real time to set questions"
          >
            <Mic className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden md:inline">Speak Question</span>
          </button>

          {/* AI Textbook/Notebook upload trigger */}
          <button
            onClick={onOpenUploadModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 font-semibold text-xs transition cursor-pointer border border-indigo-200 dark:border-indigo-900/50"
            title="Upload textbook or notebook pages to generate exam questions"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">Upload Textbook</span>
          </button>

          {/* Share Exam Button */}
          <button
            onClick={onOpenShareModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 font-semibold text-xs transition cursor-pointer"
            title="Send or share exam paper with users via link, email, text, or PDF"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Direct Print Button */}
          <button
            onClick={() => {
              onTabChange('preview');
              setTimeout(() => window.print(), 150);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-xs transition active:scale-95 cursor-pointer shadow-xs"
            title="Print directly to A4 paper with answers at the end"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print A4</span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
