import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parsers with high payload limit for textbook scans and images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Endpoint: Generate questions from uploaded textbook/notebook/notes
app.post('/api/generate-questions', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check environment variables.'
      });
    }

    const {
      textContent = '',
      images = [], // Array of { mimeType: string, data: string } (base64)
      options = {}
    } = req.body;

    if (!textContent.trim() && (!images || images.length === 0)) {
      return res.status(400).json({
        error: 'Please provide either textbook/notebook text or upload document images/PDF.'
      });
    }

    const {
      examTitle = 'Mid-Term Examination',
      subject = 'General Knowledge',
      gradeLevel = 'High School',
      questionCount = 10,
      questionTypes = ['multiple_choice', 'short_answer'],
      difficulty = 'medium',
      bloomsTaxonomy = 'mixed',
      additionalInstructions = ''
    } = options;

    const ai = new GoogleGenAI({ apiKey });

    // Build prompt
    const prompt = `
You are an expert exam setter and pedagogy curriculum specialist.
Your task is to generate high-quality examination questions based STRICTLY and COMPREHENSIVELY on the provided textbook/notebook materials.

EXAM DETAILS:
- Title: ${examTitle}
- Subject: ${subject}
- Grade/Level: ${gradeLevel}
- Desired Question Count: ${questionCount}
- Allowed Question Types: ${questionTypes.join(', ')}
- Difficulty Level: ${difficulty}
- Cognitive Level (Bloom's Taxonomy): ${bloomsTaxonomy}
${additionalInstructions ? `- Special Teacher Instructions: ${additionalInstructions}` : ''}

CRITICAL RULES:
1. Questions must test genuine understanding of concepts found in the uploaded textbook/notebook images or text.
2. For "multiple_choice", provide exactly 4 options labeled starting with "A) ", "B) ", "C) ", "D) ". Ensure only ONE option is objectively correct and plausible distractors are provided.
3. For "true_false", provide two options: "A) True" and "B) False".
4. For "fill_blank", clearly mark the blank as "_______" in the question text.
5. For "short_answer" or "essay", include the model answer or key grading criteria in the 'answer' field.
6. Provide an accurate and clear 'answer' for every single question.
7. Provide a concise 'explanation' or textbook reference for why the answer is correct.
8. Assign realistic 'marks' (e.g. 1 mark for MCQ/True-False, 2-3 marks for Short Answer, 5-10 for Essay).
9. All answers will be aggregated into an Answer Key placed at the end of the printed exam.

Format your response strictly as valid JSON adhering to the provided schema.
`;

    const contents: any[] = [];

    // Attach any uploaded document images or PDF pages
    if (Array.isArray(images) && images.length > 0) {
      for (const img of images) {
        if (img && img.data && img.mimeType) {
          contents.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data.replace(/^data:[^;]+;base64,/, '')
            }
          });
        }
      }
    }

    // Attach text content and prompt
    if (textContent.trim()) {
      contents.push({
        text: `EXCERPTS / NOTES FROM TEXTBOOK OR NOTEBOOK:\n${textContent}\n\n${prompt}`
      });
    } else {
      contents.push({
        text: prompt
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedSubject: { type: Type.STRING },
            suggestedTotalMarks: { type: Type.INTEGER },
            suggestedTimeMinutes: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  type: {
                    type: Type.STRING,
                    description: "One of: multiple_choice, short_answer, true_false, fill_blank, essay"
                  },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Array of 4 options for MCQ or True/False with A) B) C) D) prefix"
                  },
                  answer: {
                    type: Type.STRING,
                    description: "Correct answer (e.g., 'A) Mitochondria' or model explanation)"
                  },
                  explanation: {
                    type: Type.STRING,
                    description: "Brief rationale / textbook explanation for the answer key"
                  },
                  marks: { type: Type.INTEGER },
                  section: {
                    type: Type.STRING,
                    description: "e.g. 'SECTION A (Objective)' or 'SECTION B (Theory)'"
                  }
                },
                required: ['number', 'type', 'question', 'answer', 'marks']
              }
            }
          },
          required: ['questions', 'suggestedTotalMarks']
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Received empty response from Gemini model');
    }

    const parsedData = JSON.parse(responseText);
    res.json({
      success: true,
      data: parsedData
    });
  } catch (err: any) {
    console.error('Error generating exam questions:', err);
    res.status(500).json({
      error: err.message || 'Failed to generate questions. Please try again.'
    });
  }
});

// Endpoint: AI refine speech transcript into formatted question
app.post('/api/refine-speech-question', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const { rawTranscript, subject = 'General', currentQuestionNumber = 1 } = req.body;
    if (!rawTranscript || !rawTranscript.trim()) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
A teacher is setting an examination question by speaking aloud into their microphone.
Convert their raw spoken speech into a well-crafted, grammatically flawless exam question.

Teacher spoken transcript:
"${rawTranscript}"

Current Question Index: ${currentQuestionNumber}
Subject: ${subject}

Detect:
1. The exact question statement.
2. The question type ('multiple_choice', 'short_answer', 'true_false', 'fill_blank', 'essay').
3. If options were spoken (e.g., "option A ... option B ..."), extract exactly 4 neat options labeled "A) ...", "B) ...", "C) ...", "D) ...". If it is MCQ but fewer options were spoken, intelligently infer plausible distractors.
4. The correct answer (if spoken, or infer standard correct answer).
5. Appropriate marks (default 1 for MCQ/TF, 2 for short answer, 5 for essay if not spoken).
6. A concise explanation for the answer key at the end of the exam paper.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            number: { type: Type.INTEGER },
            type: { type: Type.STRING },
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            answer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            marks: { type: Type.INTEGER }
          },
          required: ['number', 'type', 'question', 'answer', 'marks']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, question: parsed });
  } catch (err: any) {
    console.error('Error refining spoken question:', err);
    res.status(500).json({ error: err.message || 'Failed to refine question' });
  }
});

// Endpoint: AI Audio Transcription fallback (when Web Speech API is not available or for voice recordings)
app.post('/api/transcribe-audio', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const { audioData, mimeType = 'audio/webm' } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const cleanBase64 = audioData.replace(/^data:[^;]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64
          }
        },
        {
          text: 'Transcribe this voice dictation from a teacher setting an exam question verbatim. Return only the transcribed text.'
        }
      ]
    });

    res.json({ success: true, transcript: response.text?.trim() || '' });
  } catch (err: any) {
    console.error('Error transcribing audio:', err);
    res.status(500).json({ error: err.message || 'Failed to transcribe audio' });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV === 'production' || hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ExamCraft server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
