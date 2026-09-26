export type QuestionType =
  | 'multiple_choice'
  | 'short_answer'
  | 'true_false'
  | 'fill_blank'
  | 'essay';

export interface ExamQuestion {
  id: string;
  number: number;
  type: QuestionType;
  question: string;
  options?: string[]; // e.g., ["A) Chlorophyll", "B) Hemoglobin", "C) Carotenoid", "D) Melanin"]
  answer: string;
  explanation?: string;
  marks: number;
  section?: string; // e.g. "SECTION A: MULTIPLE CHOICE"
}

export interface ExamMetadata {
  institutionName: string;
  logoUrl?: string; // School / College Crest or Badge
  department?: string; // e.g. "Department of Basic & Applied Sciences"
  term?: string; // e.g. "Term 1", "First Semester", "Final Mock"
  academicYear?: string; // e.g. "2026/2027"
  examTitle: string; // e.g. "FIRST SEMESTER EXAMINATION 2026/2027"
  subject: string; // e.g. "ADVANCED BIOLOGY"
  gradeLevel: string; // e.g. "GRADE 11 / SENIOR SECONDARY 2"
  durationMinutes: number; // e.g. 90
  totalMarks: number;
  date: string;
  instructions: string[];
  enableStudentInfoBox: boolean; // Name, Roll No, Date, Signature
}

export interface ExamPrintConfig {
  layoutColumns: 1 | 2; // 1 column standard or 2 columns compact
  fontSize: 'compact' | 'standard' | 'large'; // 10pt, 11pt, 12pt
  spacing: 'compact' | 'standard' | 'spacious';
  printMode: 'all_with_answers_at_end' | 'student_only' | 'answers_only';
  answerKeyOnNewPage: boolean; // whether answer key starts with page break
  showAnswerLinesForTheory: boolean; // dotted lines for student written responses
  answerLinesCount: number; // 2, 3, 4 lines
  showMarksPerQuestion: boolean;
  watermarkText?: string;
}

export interface TextbookUploadPayload {
  textContent?: string;
  images: Array<{
    name: string;
    mimeType: string;
    data: string; // base64
    previewUrl?: string;
  }>;
}

export interface GenerateOptions {
  examTitle: string;
  subject: string;
  gradeLevel: string;
  questionCount: number;
  questionTypes: QuestionType[];
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  bloomsTaxonomy: string;
  additionalInstructions: string;
}
