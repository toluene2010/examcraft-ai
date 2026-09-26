import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Printer,
  Mail,
  FileText,
  Download,
  QrCode,
  X,
  Send,
  ExternalLink
} from 'lucide-react';
import { ExamMetadata, ExamQuestion, ExamPrintConfig } from '../types/exam';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: ExamMetadata;
  questions: ExamQuestion[];
  config: ExamPrintConfig;
  onTriggerPrint: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  metadata,
  questions,
  config,
  onTriggerPrint
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');

  if (!isOpen) return null;

  const sharedAppUrl = 'https://ais-pre-e2mw3mnynvqdd3w3qq3q2w-351494158695.europe-west2.run.app';
  const currentUrl = typeof window !== 'undefined' && window.location.href ? window.location.href : sharedAppUrl;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sharedAppUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const generateFormattedPlainText = (): string => {
    let out = `==========================================================\n`;
    out += `${(metadata.institutionName || 'INSTITUTION EXAMINATION BOARD').toUpperCase()}\n`;
    if (metadata.department) out += `${metadata.department.toUpperCase()}\n`;
    out += `${metadata.examTitle.toUpperCase()}\n`;
    out += `SUBJECT: ${metadata.subject} | CLASS: ${metadata.gradeLevel}\n`;
    out += `TIME: ${metadata.durationMinutes} MINS | DATE: ${metadata.date}\n`;
    out += `==========================================================\n\n`;

    if (metadata.instructions && metadata.instructions.length > 0) {
      out += `INSTRUCTIONS:\n`;
      metadata.instructions.forEach((ins, i) => {
        out += `${i + 1}. ${ins}\n`;
      });
      out += `\n`;
    }

    out += `QUESTIONS:\n`;
    questions.forEach((q) => {
      out += `${q.number}. ${q.question} [${q.marks} Mark${q.marks === 1 ? '' : 's'}]\n`;
      if (q.options && q.options.length > 0) {
        q.options.forEach((opt) => {
          out += `    ${opt}\n`;
        });
      }
      out += `\n`;
    });

    out += `\n==========================================================\n`;
    out += `OFFICIAL ANSWER KEY & MARKING SCHEME (PLACED AT END)\n`;
    out += `==========================================================\n\n`;

    questions.forEach((q) => {
      out += `Q${q.number}: ${q.answer}\n`;
      if (q.explanation) {
        out += `  Rationale / Marking: ${q.explanation}\n`;
      }
    });

    return out;
  };

  const handleCopyPlainText = () => {
    const text = generateFormattedPlainText();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`${metadata.institutionName} - ${metadata.examTitle} (${metadata.subject})`);
    const body = encodeURIComponent(
      `Dear Colleague / Student,\n\nPlease find the examination paper for ${metadata.subject} (${metadata.gradeLevel}).\n\nYou can access, solve, or print the formatted A4 exam here:\n${currentUrl}\n\nExam Details:\n- Institution: ${metadata.institutionName}\n- Exam: ${metadata.examTitle}\n- Total Marks: ${questions.reduce((sum, q) => sum + (q.marks || 1), 0)}\n- Time: ${metadata.durationMinutes} mins\n\nBest regards,\nExam Examination Office`
    );
    window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${metadata.institutionName} - ${metadata.examTitle}`,
          text: `Examination Paper for ${metadata.subject} (${metadata.gradeLevel}) formatted for A4 printing.`,
          url: currentUrl
        });
      } catch (err) {
        // user dismissed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Send &amp; Share Exam Paper
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Send to teachers, students, or exam moderators
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Method 1: Instant A4 PDF Download & Word DOCX */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                Option 1: Export Document (PDF or Editable Word)
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Download formatted file to print, email, or edit in Microsoft Word / Google Docs.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={async () => {
                  const { exportExamToWord } = await import('../services/exportService');
                  await exportExamToWord(metadata, questions, config);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Word (.docx)</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onTriggerPrint();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Save / Print A4 PDF</span>
              </button>
            </div>
          </div>

          {/* Method 2: Shareable App Link */}
          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              Live App URL (Share with wife, colleagues, or students):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value="https://ais-dev-e2mw3mnynvqdd3w3qq3q2w-351494158695.europe-west2.run.app"
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300 text-xs font-mono select-all focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText('https://ais-dev-e2mw3mnynvqdd3w3qq3q2w-351494158695.europe-west2.run.app');
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Anyone with this link can open the application, dictate questions, upload notes, and export to Word or PDF.
            </p>
          </div>

          {/* Method 3: Email Exam to Recipient */}
          <div>
            <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              Option 3: Send via Email to Teacher or Student
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. principal@school.edu, student@gmail.com"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={handleEmailShare}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Open Email</span>
              </button>
            </div>
          </div>

          {/* Method 4: Copy Formatted Plain Text */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h5 className="font-semibold text-slate-800 dark:text-slate-200">
                Option 4: Copy Questions &amp; Answer Key as Plain Text
              </h5>
              <p className="text-[11px] text-slate-500">
                Paste directly into WhatsApp, Microsoft Word, Google Docs, or Telegram.
              </p>
            </div>
            <button
              onClick={handleCopyPlainText}
              className="flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-medium text-slate-700 dark:text-slate-300 transition cursor-pointer shrink-0 ml-3"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileText className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'Copied Full Exam!' : 'Copy Text'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <button
            onClick={handleNativeShare}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Mobile Device Share Sheet</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
