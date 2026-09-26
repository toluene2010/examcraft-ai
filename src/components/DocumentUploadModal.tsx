import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Camera,
  FileText,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Image as ImageIcon,
  Sliders,
  HelpCircle,
  FileCheck,
  BookOpen
} from 'lucide-react';
import { generateQuestionsFromMaterial } from '../services/api';
import { ExamQuestion, GenerateOptions, QuestionType } from '../types/exam';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionsGenerated: (
    questions: ExamQuestion[],
    updates?: { subject?: string; totalMarks?: number; durationMinutes?: number }
  ) => void;
  initialSubject?: string;
  initialGrade?: string;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onQuestionsGenerated,
  initialSubject = '',
  initialGrade = ''
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [files, setFiles] = useState<
    Array<{ name: string; mimeType: string; data: string; previewUrl?: string }>
  >([]);
  const [textContent, setTextContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStage, setProgressStage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Form options
  const [options, setOptions] = useState<GenerateOptions>({
    examTitle: 'Term Examination',
    subject: initialSubject || 'General Science',
    gradeLevel: initialGrade || 'Secondary / High School',
    questionCount: 10,
    questionTypes: ['multiple_choice', 'short_answer'],
    difficulty: 'medium',
    bloomsTaxonomy: 'application_and_understanding',
    additionalInstructions: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSubject) setOptions((prev) => ({ ...prev, subject: initialSubject }));
    if (initialGrade) setOptions((prev) => ({ ...prev, gradeLevel: initialGrade }));
  }, [initialSubject, initialGrade]);

  // Clean up previews on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, [files]);

  if (!isOpen) return null;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setError(null);
    const newImages: typeof files = [];

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
      setError('Please upload at least one textbook/notebook image or paste text notes.');
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgressStage('Analyzing textbook material and diagrams...');

    try {
      const timer1 = setTimeout(() => setProgressStage('Formulating balanced questions & distractors...'), 2500);
      const timer2 = setTimeout(() => setProgressStage('Compiling answer key & marking scheme at the end...'), 5000);

      const response = await generateQuestionsFromMaterial(
        {
          images: files,
          textContent: textContent.trim()
        },
        options
      );

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (response && response.success && response.data && response.data.questions && response.data.questions.length > 0) {
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

        // Hand over to parent component and switch to A4 view!
        onQuestionsGenerated(mappedQuestions, {
          subject: response.data.detectedSubject || options.subject,
          totalMarks: response.data.suggestedTotalMarks,
          durationMinutes: response.data.suggestedTimeMinutes
        });

        // Close modal smoothly
        onClose();
      } else {
        throw new Error('AI could not parse questions from this image/text. Please ensure the photo has visible text or paste text directly.');
      }
    } catch (err: any) {
      console.error('Question generation failed:', err);
      const errMsg = err.message || 'Failed to generate questions. Please check your AI Provider Settings or try uploading clear text.';
      setError(errMsg);
      // Auto-scroll modal to top so user clearly sees the error
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
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
        <div ref={scrollContainerRef} className="p-6 flex-1 overflow-y-auto space-y-6 text-xs">
          {/* Prominent Error Notification Banner */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs rounded-2xl border border-rose-200 dark:border-rose-800 shadow-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block mb-0.5">Could not generate questions:</span>
                <span>{error}</span>
              </div>
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
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition shadow-sm cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Choose Photos / Scans</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition shadow-sm cursor-pointer sm:flex"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Snap Photo</span>
                  </button>
                </div>

                <p className="text-slate-500 dark:text-slate-400">
                  Upload photos of textbook pages, handwritten lesson notes, past papers, or syllabus outlines.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supported formats: JPG, PNG, WEBP, PDF (up to 50MB)
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Thumbnails of uploaded material */}
              {files.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Uploaded Material ({files.length} pages):
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles([])}
                      className="text-rose-500 hover:text-rose-600 font-semibold"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {files.map((f, idx) => (
                      <div
                        key={idx}
                        className="relative group border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800"
                      >
                        {f.previewUrl ? (
                          <img
                            src={f.previewUrl}
                            alt={f.name}
                            className="w-full h-24 object-cover"
                          />
                        ) : (
                          <div className="w-full h-24 flex flex-col items-center justify-center p-2 text-slate-500">
                            <FileCheck className="w-6 h-6 text-indigo-500 mb-1" />
                            <span className="text-[10px] truncate max-w-full">{f.name}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-rose-600 text-white rounded-full transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Text input */}
          {activeTab === 'text' && (
            <div className="space-y-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Paste Chapter, Passage, or Teacher's Summary Notes:
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={6}
                placeholder="Paste reading passages, key formulas, lesson notes, or questions here..."
                className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Options & Curricular Controls */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <span>AI Exam Generation Settings</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={options.subject}
                  onChange={(e) => setOptions({ ...options, subject: e.target.value })}
                  placeholder="e.g. Science &amp; Technology, Economics"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Target Grade</label>
                <input
                  type="text"
                  value={options.gradeLevel}
                  onChange={(e) => setOptions({ ...options, gradeLevel: e.target.value })}
                  placeholder="e.g. Grade 10 / SS2 / Year 11"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">Number of Questions</label>
              <select
                value={options.questionCount}
                onChange={(e) => setOptions({ ...options, questionCount: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
              >
                <option value={5}>5 Questions (Quick Quiz)</option>
                <option value={10}>10 Questions (Standard Test)</option>
                <option value={15}>15 Questions (Full Examination)</option>
                <option value={20}>20 Questions (Extended Paper)</option>
              </select>
            </div>

            {/* Allowed Question Types */}
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
                ].map((item) => {
                  const isChecked = options.questionTypes.includes(item.id as QuestionType);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleQuestionType(item.id as QuestionType)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty and Bloom's taxonomy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 w-full sm:w-auto text-center sm:text-left">
            {isGenerating ? (
              <span className="font-bold text-indigo-600 dark:text-indigo-400 animate-pulse flex items-center gap-2 justify-center sm:justify-start">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                {progressStage || 'Generating examination paper...'}
              </span>
            ) : (
              <span>Ready to analyze {files.length} uploaded files and generate {options.questionCount} questions</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition active:scale-95 cursor-pointer"
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
