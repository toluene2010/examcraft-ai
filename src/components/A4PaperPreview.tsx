import React, { useRef, useState } from 'react';
import {
  Printer,
  FileCheck,
  Columns2,
  FileText,
  Eye,
  Download,
  Settings2,
  CheckCircle,
  HelpCircle,
  Hash,
  FileDown,
  Loader2
} from 'lucide-react';
import { ExamMetadata, ExamPrintConfig, ExamQuestion } from '../types/exam';
import { exportExamToPDF, exportExamToWord } from '../services/exportService';

interface A4PaperPreviewProps {
  metadata: ExamMetadata;
  questions: ExamQuestion[];
  config: ExamPrintConfig;
  onUpdateConfig: (config: ExamPrintConfig) => void;
}

export const A4PaperPreview: React.FC<A4PaperPreviewProps> = ({
  metadata,
  questions,
  config,
  onUpdateConfig
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDirectPDFExport = async () => {
    if (!printRef.current) return;
    setIsExportingPDF(true);
    try {
      const filename = `${(metadata.subject || 'Exam').replace(/[^a-z0-9]/gi, '_')}_A4_Paper.pdf`;
      await exportExamToPDF(printRef.current, filename);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      // Fallback to browser print
      window.print();
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleWordExport = async () => {
    setIsExportingWord(true);
    try {
      await exportExamToWord(metadata, questions, config);
    } catch (err) {
      console.error('Failed to export Word doc:', err);
    } finally {
      setIsExportingWord(false);
    }
  };

  const totalCalculatedMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

  // Group questions by section if any
  const groupedSections: { [key: string]: ExamQuestion[] } = {};
  questions.forEach((q) => {
    const sec = q.section || (q.type === 'multiple_choice' || q.type === 'true_false' ? 'SECTION A: OBJECTIVE QUESTIONS' : 'SECTION B: THEORY & PROBLEM SOLVING');
    if (!groupedSections[sec]) groupedSections[sec] = [];
    groupedSections[sec].push(q);
  });

  const sectionKeys = Object.keys(groupedSections);

  return (
    <div className="space-y-6">
      {/* Controls Bar (Hidden during printing) */}
      <div className="no-print bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Columns Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => onUpdateConfig({ ...config, layoutColumns: 1 })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                config.layoutColumns === 1
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>1 Column</span>
            </button>
            <button
              onClick={() => onUpdateConfig({ ...config, layoutColumns: 2 })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                config.layoutColumns === 2
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="2 Columns: Fits more questions per A4 sheet to save paper"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>2 Columns (Eco-Fit)</span>
            </button>
          </div>

          {/* Font Scale */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-medium text-[11px] text-slate-400 uppercase">Text Size:</span>
            <select
              value={config.fontSize}
              onChange={(e) => onUpdateConfig({ ...config, fontSize: e.target.value as any })}
              className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 border-none font-medium focus:outline-none"
            >
              <option value="compact">Compact (10pt)</option>
              <option value="standard">Standard (11pt)</option>
              <option value="large">Spacious (12pt)</option>
            </select>
          </div>

          {/* Print Target Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="font-medium text-[11px] text-slate-400 uppercase">Output:</span>
            <select
              value={config.printMode}
              onChange={(e) => onUpdateConfig({ ...config, printMode: e.target.value as any })}
              className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 border-none font-medium focus:outline-none"
            >
              <option value="all_with_answers_at_end">Exam + Answer Key at End</option>
              <option value="student_only">Student Question Paper Only</option>
              <option value="answers_only">Teacher Answer Guide Only</option>
            </select>
          </div>

          {/* Answer on new page toggle */}
          {config.printMode !== 'student_only' && (
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.answerKeyOnNewPage}
                onChange={(e) => onUpdateConfig({ ...config, answerKeyOnNewPage: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
              />
              <span>Page Break for Answer Key</span>
            </label>
          )}

          {/* Answer writing lines toggle */}
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.showAnswerLinesForTheory}
              onChange={(e) => onUpdateConfig({ ...config, showAnswerLinesForTheory: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
            />
            <span>Dotted Student Answer Lines</span>
          </label>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Export to Word (.docx) */}
          <button
            onClick={handleWordExport}
            disabled={isExportingWord}
            className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Download editable Microsoft Word document (.docx) to modify questions"
          >
            {isExportingWord ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-blue-200" />
            )}
            <span>Export Word (.docx)</span>
          </button>

          {/* Export Direct PDF */}
          <button
            onClick={handleDirectPDFExport}
            disabled={isExportingPDF}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Download A4 PDF directly without browser print dialog"
          >
            {isExportingPDF ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-rose-200" />
            )}
            <span>{isExportingPDF ? 'Generating...' : 'Direct PDF'}</span>
          </button>

          {/* Primary Print / Save PDF Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
            title="Open browser print dialog for A4 physical printer or PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Print A4</span>
          </button>
        </div>
      </div>

      {/* A4 Paper Simulation Container */}
      <div className="flex justify-center p-2 sm:p-6 bg-slate-200/80 dark:bg-slate-950 rounded-3xl overflow-x-auto">
        <div
          ref={printRef}
          className={`a4-paper-container bg-white text-slate-900 shadow-2xl relative transition-all ${
            config.fontSize === 'compact'
              ? 'text-[10pt] leading-[1.35]'
              : config.fontSize === 'large'
              ? 'text-[12pt] leading-[1.5]'
              : 'text-[11pt] leading-[1.4]'
          }`}
          style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '16mm 16mm 16mm 16mm',
            boxSizing: 'border-box',
            fontFamily: "'Crimson Pro', Georgia, serif"
          }}
        >
          {/* Watermark (if configured) */}
          {config.watermarkText && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none overflow-hidden opacity-5">
              <span className="text-8xl font-black uppercase -rotate-45 tracking-widest text-slate-900">
                {config.watermarkText}
              </span>
            </div>
          )}

          {/* EXAM PAPER CONTENT (When mode includes questions) */}
          {config.printMode !== 'answers_only' && (
            <div className="exam-body-content">
              {/* Institution Header & Title */}
              <div className="border-b-2 border-slate-900 pb-3 mb-4">
                <div className="flex items-center justify-center gap-4 mb-1">
                  {metadata.logoUrl && (
                    <img
                      src={metadata.logoUrl}
                      alt="School Crest"
                      className="w-14 h-14 object-contain shrink-0"
                    />
                  )}
                  <div className="text-center">
                    <h1 className="text-lg font-bold tracking-wider uppercase font-sans mb-0.5 text-slate-950">
                      {metadata.institutionName || 'INSTITUTION EXAMINATION BOARD'}
                    </h1>
                    {metadata.department && (
                      <div className="text-xs font-semibold uppercase tracking-wide font-sans text-slate-700">
                        {metadata.department}
                      </div>
                    )}
                    <h2 className="text-base font-bold uppercase tracking-wide font-sans text-slate-900">
                      {metadata.examTitle || 'SEMESTER EXAMINATION'}
                    </h2>
                    {metadata.academicYear && (
                      <div className="text-xs font-medium font-sans text-slate-600">
                        {metadata.academicYear}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap justify-between items-center text-xs font-sans font-semibold border-t border-slate-300 pt-1.5 px-2 text-slate-800">
                  <span>SUBJECT: <strong className="uppercase">{metadata.subject || '—'}</strong></span>
                  <span>CLASS: <strong className="uppercase">{metadata.gradeLevel || '—'}</strong></span>
                  <span>TIME ALLOWED: <strong>{metadata.durationMinutes || 60} MINUTES</strong></span>
                  <span>TOTAL MARKS: <strong>{totalCalculatedMarks} MARKS</strong></span>
                </div>
              </div>

              {/* Student Identification Box (Name, Roll, Signature) */}
              {metadata.enableStudentInfoBox && (
                <div className="mb-4 border border-slate-400 rounded-sm p-2 font-sans text-xs bg-slate-50/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                    <div className="flex items-end">
                      <span className="font-bold text-slate-700 shrink-0 mr-2">STUDENT NAME:</span>
                      <div className="flex-1 border-b border-dotted border-slate-600 min-h-[16px]" />
                    </div>
                    <div className="flex items-end">
                      <span className="font-bold text-slate-700 shrink-0 mr-2">ROLL NO / ID:</span>
                      <div className="flex-1 border-b border-dotted border-slate-600 min-h-[16px]" />
                    </div>
                    <div className="flex items-end">
                      <span className="font-bold text-slate-700 shrink-0 mr-2">DATE:</span>
                      <div className="flex-1 border-b border-dotted border-slate-600 min-h-[16px]" />
                    </div>
                    <div className="flex items-end">
                      <span className="font-bold text-slate-700 shrink-0 mr-2">SIGNATURE:</span>
                      <div className="flex-1 border-b border-dotted border-slate-600 min-h-[16px]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions Section */}
              {metadata.instructions && metadata.instructions.length > 0 && (
                <div className="mb-4 font-sans text-[10pt] bg-slate-50 p-2.5 rounded border-l-3 border-slate-700">
                  <span className="font-bold uppercase tracking-wider block text-[10pt] mb-1">
                    General Instructions to Candidates:
                  </span>
                  <ol className="list-decimal pl-5 space-y-0.5 text-slate-800">
                    {metadata.instructions.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Questions Area (1-column or 2-column) */}
              {questions.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-300 rounded font-sans text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">No questions added yet.</p>
                  <p className="text-[11px] mt-1">Use Voice Dictation or Textbook Upload in the Editor to add questions.</p>
                </div>
              ) : (
                <div
                  className={`questions-flow ${
                    config.layoutColumns === 2 ? 'columns-2 gap-6' : 'space-y-4'
                  }`}
                >
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      className="question-item avoid-break mb-3.5 pb-2 break-inside-avoid"
                    >
                      {/* Question prompt */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-slate-950 flex-1">
                          <span className="font-bold mr-1.5">{q.number}.</span>
                          <span>{q.question}</span>
                        </div>
                        {config.showMarksPerQuestion && (
                          <span className="font-sans font-bold text-[9pt] text-slate-600 shrink-0 ml-2">
                            [{q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}]
                          </span>
                        )}
                      </div>

                      {/* Options for MCQ / True-False */}
                      {(q.type === 'multiple_choice' || q.type === 'true_false') && q.options && (
                        <div className="mt-1.5 pl-5 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-slate-800 font-sans text-[10.5pt]">
                          {q.options.map((opt, optIndex) => (
                            <div key={optIndex} className="flex items-start gap-1.5">
                              <span className="font-semibold">{opt.substring(0, 2)}</span>
                              <span>{opt.substring(2).trim()}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Dotted lines for student answer writing if short answer / essay */}
                      {config.showAnswerLinesForTheory &&
                        (q.type === 'short_answer' || q.type === 'essay' || q.type === 'fill_blank') && (
                          <div className="mt-2 pl-4 space-y-2">
                            {Array.from({ length: q.type === 'essay' ? 4 : config.answerLinesCount || 2 }).map(
                              (_, lineIdx) => (
                                <div
                                  key={lineIdx}
                                  className="border-b border-dotted border-slate-300 h-4 w-full"
                                />
                              )
                            )}
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ANSWER PLACE AT THE END (As explicitly required: "and answer place at the end") */}
          {config.printMode !== 'student_only' && questions.length > 0 && (
            <div
              className={`answer-key-section mt-8 pt-4 border-t-2 border-dashed border-slate-800 avoid-break ${
                config.answerKeyOnNewPage ? 'page-break' : ''
              }`}
            >
              <div className="text-center mb-4">
                <div className="inline-block bg-slate-900 text-white font-sans font-bold uppercase tracking-widest text-[9.5pt] px-4 py-1 rounded-sm mb-1">
                  OFFICIAL EXAMINATION MARKING SCHEME &amp; ANSWER KEY
                </div>
                <p className="font-sans text-[9pt] text-slate-600">
                  {metadata.examTitle} • {metadata.subject} • (Total: {totalCalculatedMarks} Marks)
                </p>
              </div>

              {/* Quick-Grade Rapid Matrix */}
              <div className="mb-4 bg-slate-50 border border-slate-300 p-2.5 rounded font-sans text-xs">
                <div className="font-bold text-slate-900 uppercase tracking-wider text-[9pt] mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Rapid Grading Matrix:</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-1.5">
                  {questions.map((q) => {
                    const cleanAnswer = q.answer.length > 20 ? q.answer.substring(0, 18) + '...' : q.answer;
                    return (
                      <div
                        key={q.id}
                        className="bg-white border border-slate-200 px-2 py-1 rounded text-center flex items-center justify-between font-mono text-[9pt]"
                      >
                        <span className="font-bold text-slate-700">Q{q.number}:</span>
                        <span className="font-semibold text-indigo-900 font-sans truncate ml-1">
                          {cleanAnswer || '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Full Detailed Solutions & Explanations */}
              <div className="space-y-3 font-sans text-[10pt]">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[10pt] border-b border-slate-300 pb-1">
                  Comprehensive Solutions &amp; Grading Points:
                </h4>

                <div
                  className={`solutions-grid ${
                    config.layoutColumns === 2 ? 'columns-2 gap-6' : 'space-y-2.5'
                  }`}
                >
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      className="avoid-break mb-2.5 pb-2 border-b border-slate-200 break-inside-avoid text-xs"
                    >
                      <div className="flex items-baseline justify-between gap-1 font-bold text-slate-900">
                        <span>Question {q.number} ({q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}):</span>
                      </div>

                      <div className="mt-0.5 text-slate-900 font-semibold">
                        <span className="text-emerald-700 font-bold mr-1">Answer:</span>
                        <span>{q.answer || 'Refer to teacher guide'}</span>
                      </div>

                      {q.explanation && (
                        <div className="mt-0.5 text-slate-600 text-[10px] leading-tight italic">
                          <span className="font-bold not-italic text-slate-500 mr-1">Rationale / Rubric:</span>
                          <span>{q.explanation}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* End of Examination Marker */}
              <div className="mt-6 pt-3 text-center border-t border-slate-400 font-sans text-[9pt] font-bold text-slate-600 uppercase tracking-widest">
                *** END OF EXAMINATION PAPER ***
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
