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
  BookOpen,
  Zap,
  Cpu
} from 'lucide-react';
import { generateQuestionsFromMaterial } from '../services/api';
import { generateLocalQuestionsFromText } from '../services/localExamGenerator';
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
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('text');
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

      if (file.name.endsWith('.txt')) {
        const text = await file.text();
        setTextContent((prev) => (prev ? prev + '\n\n' + text : text));
        setActiveTab('text');
        continue;
      }

      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setError('Please upload textbook photos (JPG, PNG, WEBP), PDFs, or text notes.');
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

  // Instant Offline Generation Fallback (Guaranteed to work 100% of the time, zero API needed)
  const handleInstantOfflineGenerate = () => {
    const textToUse = textContent.trim() || 'General science fundamentals, laws, key terms, definitions, and curriculum concepts.';
    const result = generateLocalQuestionsFromText(textToUse, options);
    
    onQuestionsGenerated(result.questions, {
      subject: options.subject || result.detectedSubject,
      totalMarks: result.suggestedTotalMarks,
      durationMinutes: result.suggestedTimeMinutes
    });

    onClose();
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
        throw new Error('Could not parse questions from this material. Use Instant Offline Generation below!');
      }
    } catch (err: any) {
      console.error('Question generation failed:', err);
      const errMsg = err.message || 'AI API returned an error.';
      setError(errMsg);

      // Auto-scroll modal to top so user clearly sees the error and the 1-click fallback button
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
                AI &amp; Smart Engine reads scanned chapters, textbook pages, or lesson text
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
          {/* Prominent Error Notification Banner with 1-Click Instant Fallback */}
          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 text-xs rounded-2xl border border-rose-200 dark:border-rose-800 shadow-sm animate-fade-in space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block mb-0.5">Online AI Error:</span>
                  <span className="break-all">{error}</span>
                </div>
              </div>

              {/* Instant No-API Solution */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Bypass AI APIs: Generate questions instantly using built-in offline engine!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleInstantOfflineGenerate}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-bold rounded-xl shadow-md hover:brightness-110 transition active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  ⚡ Generate Instantly (No API Needed)
                </button>
              </div>
            </div>
          )}

          {/* Quick Tab Bar */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Paste Notes / Chapter Text (Recommended)</span>
            </button>
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
          </div>

          {/* Tab 1: Text input (Recommended, works 100% reliably) */}
          {activeTab === 'text' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Paste Chapter, Syllabus, or Lesson Notes:
                </label>
                <button
                  type="button"
                  onClick={() => setTextContent(
                    'Photosynthesis is the biological process by which green plants, algae, and certain bacteria convert light energy into chemical energy stored in glucose molecules. Chlorophyll is the green pigment located within the thylakoid membranes of chloroplasts that absorbs sunlight. The light-dependent reactions take place in the thylakoid membranes where water molecules are split through photolysis into oxygen and protons. The light-independent reactions, known as the Calvin cycle, occur in the stroma where carbon dioxide is fixed by the enzyme RuBisCO to form glyceraldehyde-3-phosphate (G3P). The overall equation is: 6CO2 + 6H2O + light energy yields C6H12O6 + 6O2. Factors affecting the rate of photosynthesis include light intensity, carbon dioxide concentration, and ambient temperature.'
                  )}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  Insert Sample Biology Notes
                </button>
              </div>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={6}
                placeholder="Paste lesson passages, definitions, formulas, or syllabus content here..."
                className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
              />
            </div>
          )}

          {/* Tab 2: File Uploader */}
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
                  Upload photos of textbook pages, handwritten notes, past papers, or syllabus outlines.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supported formats: JPG, PNG, WEBP, PDF, TXT (up to 50MB)
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,.txt"
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

          {/* Options & Curricular Controls */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <span>Exam Generation Settings</span>
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
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-slate-600 dark:text-slate-400">
                  Total Questions Needed
                </label>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                  {options.questionCount} Questions Selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={options.questionCount}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(50, Number(e.target.value) || 1));
                    setOptions({ ...options, questionCount: val });
                  }}
                  className="w-28 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white font-bold text-center"
                />
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {[5, 10, 15, 20, 25, 30, 40].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setOptions({ ...options, questionCount: count })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        options.questionCount === count
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
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

            {/* Difficulty */}
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
                  <option value="hard">Advanced / Critical Thinking</option>
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
              <span>Ready to analyze material and generate {options.questionCount} questions</span>
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

            {/* Offline Instant Generator Button */}
            <button
              type="button"
              onClick={handleInstantOfflineGenerate}
              disabled={isGenerating}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition cursor-pointer"
              title="Works 100% of the time with zero external API dependencies"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Offline Instant</span>
            </button>

            {/* Online AI Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (files.length === 0 && !textContent.trim())}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition active:scale-95 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>AI Generate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
