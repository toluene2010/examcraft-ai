import { ExamQuestion, GenerateOptions, TextbookUploadPayload } from '../types/exam';

export interface GenerateQuestionsResponse {
  success: boolean;
  data: {
    detectedSubject?: string;
    suggestedTotalMarks: number;
    suggestedTimeMinutes?: number;
    summary?: string;
    questions: Array<{
      number: number;
      type: string;
      question: string;
      options?: string[];
      answer: string;
      explanation?: string;
      marks: number;
      section?: string;
    }>;
  };
}

export async function generateQuestionsFromMaterial(
  payload: TextbookUploadPayload,
  options: GenerateOptions
): Promise<GenerateQuestionsResponse> {
  const response = await fetch('/api/generate-questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      textContent: payload.textContent || '',
      images: payload.images.map((img) => ({
        mimeType: img.mimeType,
        data: img.data
      })),
      options
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error: ${response.status}`);
  }

  return response.json();
}

export async function refineSpokenQuestion(
  rawTranscript: string,
  subject: string,
  currentQuestionNumber: number
): Promise<ExamQuestion> {
  const response = await fetch('/api/refine-speech-question', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      rawTranscript,
      subject,
      currentQuestionNumber
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to refine question');
  }

  const result = await response.json();
  const q = result.question;
  return {
    id: 'speech-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    number: q.number || currentQuestionNumber,
    type: (q.type as any) || 'multiple_choice',
    question: q.question,
    options: q.options || [],
    answer: q.answer || '',
    explanation: q.explanation || '',
    marks: q.marks || 1
  };
}

export async function transcribeAudioRecording(
  audioBase64: string,
  mimeType = 'audio/webm'
): Promise<string> {
  const response = await fetch('/api/transcribe-audio', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      audioData: audioBase64,
      mimeType
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to transcribe audio recording');
  }

  const result = await response.json();
  return result.transcript || '';
}
