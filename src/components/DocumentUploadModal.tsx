import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  X,
  BookOpen,
  Camera,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { GenerateOptions, QuestionType, TextbookUploadPayload } from '../types/exam';
import { generateQuestionsFromMaterial } from '../services/api';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionsGenerated: (
    questions: any[],
    metadataUpdates?: { subject?: string; totalMarks?: number; durationMinutes?: number }
  ) => void;
  initialSubject: string;
  initialGrade: string;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onQuestionsGenerated,
  initialSubject,
  initialGrade
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [files, setFiles] = useState<TextbookUploadPayload['images']>([]);
  const [textContent, setTextContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStage, setProgressStage] = useState<string>('');

  // Generation options
  const [options, setOptions] = useState<GenerateOptions>({
    examTitle: 'Term Examination',
    subject: initialSubject || 'Science & Technology',
    gradeLevel: initialGrade || 'Grade 10',
    questionCount: 10,
    questionTypes: ['multiple_choice', 'short_answer'],
    difficulty: 'mixed',
    bloomsTaxonomy: 'application_and_understanding',
    additionalInstructions: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setError(null);
    const newImages: TextbookUploadPayload['images'] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      // Support images and PDFs
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf' && !file.name.endsWith('.txt')) {
        setError('Please upload textbook images (JPG, PNG, WEBP), PDFs, or text notes.');
        continue;
      }

      if (file.name.endsWith('.txt')) {
        const text = await file.text();
        setTextContent((prev) => (prev ? prev + '\n\n' + text : text));
        setActiveTab('text');
        continue;
      }

      try {
        const base64 = await readFileAsBase64(file);
        newImages.push({
          name: file.name,
          mimeType: file.type || 'image/jpeg',
          data: base64,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
        });
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }

    setFiles((prev) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleQuestionType = (type: QuestionType) => {
    setOptions((prev) => {
      const exists = prev.questionTypes.includes(type);
      if (exists) {
        if (prev.questionTypes.length === 1) return prev; // Keep at least one
        return { ...prev, questionTypes: prev.questionTypes.filter((t) => t !== type) };
      } else {
        return { ...prev, questionTypes: [...prev.questionTypes, type] };
      }
    });
  };

  const handleGenerate = async () => {
    if (files.length === 0 && !textContent.trim()) {
      setError('Please upload at least one textbook/notebook image or enter text content.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgressStage('Analyzing textbook material and diagrams...');

    try {
      setTimeout(() => setProgressStage('Formulating balanced questions & distractors...'), 2500);
      setTimeout(() => setProgressStage('Compiling answer key & marking scheme at the end...'), 5000);

      const response = await generateQuestionsFromMaterial(
        {
          images: files,
          textContent: textContent.trim()
        },
        options
      );

      if (response.success && response.data.questions) {
        const mappedQuestions = response.data.questions.map((q, idx) => ({
          id: 'ai-' + Date.now() + '-' + idx,
          number: q.number || idx + 1,
          type: (q.type as QuestionType) || 'multiple_choice',
          question: q.question,
          options: q.options || [],
          answer: q.answer,
          explanation: q.explanation || '',
          marks: q.marks || 1,
          section: q.section
        }));

        onQuestionsGenerated(mappedQuestions, {
          subject: response.data.detectedSubject || options.subject,
          totalMarks: response.data.suggestedTotalMarks,
          durationMinutes: response.data.suggestedTimeMinutes
        });

        onClose();
      } else {
        throw new Error('No questions returned from AI analysis.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
      setProgressStage('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Upload Textbook or Notebook to Generate Exam
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI reads scanned chapters, textbook pages, or notebook handwriting to create A4-ready exam papers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 text-xs">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs rounded-xl border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Method Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Upload Pages / Photos / PDF ({files.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Paste Notes / Chapter Text</span>
            </button>
          </div>

          {/* Tab 1: File Uploader */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <div className="flex justify-center gap-3 mb-3">
                  <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                    <Upload className="w-6 h-6" />
                  </div>
                </div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Drop your textbook scans or notebook pages here
                </h4>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Supports textbook photos, notebook handwritten notes, and PDF chapters (up to 50MB)
                </p>

                <div className="flex justify-center gap-3 mt-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition cursor-pointer shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Choose Files</span>
                  </button>

                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl font-semibold text-xs transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Photo of Notebook</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.txt"
                    onChange={handleFileSelection}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelection}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Uploaded File Previews */}
              {files.length > 0 && (
                <div>
                  <h5 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Attached Materials ({files.length} pages):
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-xs"
                      >
                        {file.previewUrl ? (
                          <div className="h-24 w-full bg-slate-100 overflow-hidden flex items-center justify-center">
                            <img
                              src={file.previewUrl}
                              alt={file.name}
                              className="h-full w-full object-cover group-hover:scale-105 transition"
                            />
                          </div>
                        ) : (
                          <div className="h-24 w-full bg-indigo-50 dark:bg-indigo-950/40 flex flex-col items-center justify-center p-2 text-center">
                            <FileText className="w-8 h-8 text-indigo-500 mb-1" />
                            <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-medium truncate max-w-full">
                              PDF Document
                            </span>
                          </div>
                        )}
                        <div className="p-2 flex items-center justify-between text-[11px] bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                          <span className="truncate max-w-[90px] font-medium text-slate-700 dark:text-slate-300">
                            {file.name}
                          </span>
                          <button
                            onClick={() => removeFile(idx)}
                            className="text-slate-400 hover:text-rose-500 p-1 transition"
                            title="Remove page"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Text / Syllabus Notes */}
          {activeTab === 'text' && (
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Paste Chapter Excerpts, Lecture Transcripts, or Syllabus Content
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste notebook notes, textbook summary paragraphs, or topics here... E.g. 'Chapter 3: Photosynthesis light reaction occurs in thylakoid membranes where chlorophyll absorbs light energy...'"
                rows={8}
                className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-4 text-slate-900 dark:text-slate-100 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          )}

          {/* Exam Configuration Parameters */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Exam Generation Settings</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={options.subject}
                  onChange={(e) => setOptions({ ...options, subject: e.target.value })}
                  placeholder="e.g. Physics, Chemistry, Economics"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Target Grade</label>
                <input
                  type="text"
                  value={options.gradeLevel}
                  onChange={(e) => setOptions({ ...options, gradeLevel: e.target.value })}
                  placeholder="e.g. Grade 10 / High School"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Number of Questions</label>
                <select
                  value={options.questionCount}
                  onChange={(e) => setOptions({ ...options, questionCount: parseInt(e.target.value) || 10 })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value={5}>5 Questions (Quick Quiz)</option>
                  <option value={10}>10 Questions (Standard Test)</option>
                  <option value={15}>15 Questions (1 A4 Page Full)</option>
                  <option value={20}>20 Questions (2 A4 Pages)</option>
                  <option value={30}>30 Questions (Full Semester Exam)</option>
                </select>
              </div>
            </div>

            {/* Question Types Toggle */}
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Allowed Question Types
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'multiple_choice', label: 'Multiple Choice (MCQ)' },
                  { id: 'short_answer', label: 'Short Answer / Theory' },
                  { id: 'true_false', label: 'True / False' },
                  { id: 'fill_blank', label: 'Fill in Blanks' },
                  { id: 'essay', label: 'Essay / Long Response' }
                ].map((type) => {
                  const active = options.questionTypes.includes(type.id as QuestionType);
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleQuestionType(type.id as QuestionType)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                        active
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {active && <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Difficulty</label>
                <select
                  value={options.difficulty}
                  onChange={(e) => setOptions({ ...options, difficulty: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="mixed">Mixed (Balanced: 30% Easy, 50% Medium, 20% Hard)</option>
                  <option value="easy">Elementary / Foundational</option>
                  <option value="medium">Standard Curriculum (Medium)</option>
                  <option value="hard">Advanced / Olympiad / Critical Thinking</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Cognitive Level</label>
                <select
                  value={options.bloomsTaxonomy}
                  onChange={(e) => setOptions({ ...options, bloomsTaxonomy: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="application_and_understanding">Application &amp; Conceptual Understanding</option>
                  <option value="knowledge_recall">Knowledge &amp; Definitions Recall</option>
                  <option value="analysis_and_synthesis">Critical Analysis &amp; Problem Solving</option>
                  <option value="mixed">Comprehensive Balanced Mix</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Custom Teacher Instructions (Optional)
              </label>
              <input
                type="text"
                value={options.additionalInstructions}
                onChange={(e) => setOptions({ ...options, additionalInstructions: e.target.value })}
                placeholder="e.g. Include questions that require formula calculation with SI units, avoid trivia"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {isGenerating ? (
              <span className="font-medium text-indigo-600 dark:text-indigo-400 animate-pulse">
                {progressStage || 'Generating examination paper...'}
              </span>
            ) : (
              <span>Ready to analyze {files.length} uploaded files and generate {options.questionCount} questions</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || (files.length === 0 && !textContent.trim())}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition active:scale-95 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Textbook...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate Exam Questions</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
