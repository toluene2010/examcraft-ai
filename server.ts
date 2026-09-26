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

// Helper: Call Groq API (Supports both text LLaMA 3.3 and Vision models)
async function callGroqChat(apiKey: string, messages: any[], hasImages = false, responseJson = true) {
  // Use Groq's multimodal vision model when images are present, otherwise LLaMA 3.3
  const model = hasImages ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';
  
  const body: any = {
    model,
    messages,
    temperature: 0.2
  };
  if (responseJson && !hasImages) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// Helper: Call OpenRouter API
async function callOpenRouterChat(apiKey: string, messages: any[], responseJson = true) {
  const body: any = {
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    messages,
    temperature: 0.2
  };
  if (responseJson) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://examcraft.ai',
      'X-Title': 'ExamCraft AI'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenRouter API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// Helper to clean and extract JSON from model responses (markdown blocks etc.)
function extractJsonFromText(rawText: string): any {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    hasGroqKey: !!process.env.GROQ_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Endpoint: Generate questions from uploaded textbook/notebook/notes
app.post('/api/generate-questions', async (req, res) => {
  try {
    const customProvider = req.headers['x-ai-provider'] as string;
    const clientKey = req.headers['x-custom-api-key'] as string;

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

    const promptText = `
You are an expert exam setter and pedagogy curriculum specialist.
Generate high-quality examination questions based STRICTLY and COMPREHENSIVELY on the provided textbook/notebook materials.

EXAM DETAILS:
- Title: ${examTitle}
- Subject: ${subject}
- Grade/Level: ${gradeLevel}
- Desired Question Count: ${questionCount}
- Allowed Question Types: ${questionTypes.join(', ')}
- Difficulty Level: ${difficulty}
- Target Bloom's Taxonomy: ${bloomsTaxonomy}
${additionalInstructions ? `- Additional Special Instructions: ${additionalInstructions}` : ''}

REQUIREMENTS:
1. Divide questions logically: SECTION A for Multiple Choice (objective), SECTION B for Short Answer / Theory.
2. For multiple_choice questions, provide EXACTLY 4 distinct, plausible options labeled "A) ...", "B) ...", "C) ...", "D) ...".
3. Provide the full correct answer clearly stated.
4. Provide an explanation / marking scheme point for the teacher's answer key at the end of the exam paper.
5. Assign marks to each question (e.g. 1 mark for MCQ, 2-5 for short answer).

Return ONLY a valid JSON object matching this schema:
{
  "detectedSubject": "${subject}",
  "suggestedTotalMarks": ${questionCount * 2},
  "suggestedTimeMinutes": ${questionCount * 3},
  "summary": "Generated from study material",
  "questions": [
    {
      "number": 1,
      "type": "multiple_choice",
      "question": "Question text here?",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "answer": "A) Option 1",
      "explanation": "Rationale for answer key",
      "marks": 1,
      "section": "SECTION A: OBJECTIVE"
    }
  ]
}
`;

    // 1. If Groq selected OR if Groq key provided
    const effectiveGroqKey = clientKey || process.env.GROQ_API_KEY;
    if ((customProvider === 'groq' || (!process.env.GEMINI_API_KEY && effectiveGroqKey)) && effectiveGroqKey) {
      const hasImages = images && images.length > 0;
      
      const contentParts: any[] = [];
      if (textContent.trim()) {
        contentParts.push({ type: 'text', text: `TEXTBOOK MATERIAL CONTENT:\n${textContent}\n\n${promptText}` });
      } else {
        contentParts.push({ type: 'text', text: promptText });
      }

      if (hasImages) {
        for (const img of images) {
          const imgUrl = img.data.startsWith('data:') ? img.data : `data:${img.mimeType || 'image/jpeg'};base64,${img.data}`;
          contentParts.push({
            type: 'image_url',
            image_url: { url: imgUrl }
          });
        }
      }

      const messages = [
        {
          role: 'system',
          content: 'You are an educational test designer that produces JSON exam question papers. Always return strictly valid JSON only.'
        },
        {
          role: 'user',
          content: hasImages ? contentParts : `${promptText}\n\nTEXTBOOK MATERIAL CONTENT:\n${textContent}`
        }
      ];

      const groqText = await callGroqChat(effectiveGroqKey, messages, hasImages, true);
      const parsed = extractJsonFromText(groqText);
      return res.json({ success: true, data: parsed });
    }

    // 2. If OpenRouter selected
    const effectiveOpenRouterKey = clientKey || process.env.OPENROUTER_API_KEY;
    if (customProvider === 'openrouter' && effectiveOpenRouterKey && (!images || images.length === 0)) {
      const messages = [
        {
          role: 'system',
          content: 'You are an educational test designer that produces JSON exam question papers. Always return strictly valid JSON only.'
        },
        {
          role: 'user',
          content: `${promptText}\n\nTEXTBOOK MATERIAL CONTENT:\n${textContent}`
        }
      ];

      const orText = await callOpenRouterChat(effectiveOpenRouterKey, messages, true);
      const parsed = extractJsonFromText(orText);
      return res.json({ success: true, data: parsed });
    }

    // 3. Fallback: Gemini (Requires GEMINI_API_KEY)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'Please click the "AI Provider" button in the top header, select Groq, and paste your free Groq key.'
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const contents: any[] = [];

    if (images && images.length > 0) {
      for (const img of images) {
        contents.push({
          inlineData: {
            mimeType: img.mimeType || 'image/jpeg',
            data: img.data.replace(/^data:[^;]+;base64,/, '')
          }
        });
      }
    }

    if (textContent.trim()) {
      contents.push({
        text: `TEXTBOOK / LESSON TEXT MATERIAL:\n${textContent}\n\n${promptText}`
      });
    } else {
      contents.push({
        text: promptText
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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
          required: ['detectedSubject', 'questions', 'suggestedTotalMarks']
        }
      }
    });

    const parsedData = JSON.parse(response.text || '{}');
    res.json({
      success: true,
      data: parsedData
    });
  } catch (error: any) {
    console.error('Error generating questions:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate questions from material.'
    });
  }
});

// Endpoint: AI refine speech transcript into formatted question
app.post('/api/refine-speech-question', async (req, res) => {
  try {
    const customProvider = req.headers['x-ai-provider'] as string;
    const clientKey = req.headers['x-custom-api-key'] as string;

    const { rawTranscript, subject = 'General', currentQuestionNumber = 1 } = req.body;
    if (!rawTranscript || !rawTranscript.trim()) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

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

Return JSON in this format:
{
  "number": ${currentQuestionNumber},
  "type": "multiple_choice",
  "question": "Question statement here?",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "answer": "A) ...",
  "explanation": "Why this is correct",
  "marks": 1
}
`;

    // 1. Try Groq if selected or if Groq key exists
    const effectiveGroqKey = clientKey || process.env.GROQ_API_KEY;
    if ((customProvider === 'groq' || (!process.env.GEMINI_API_KEY && effectiveGroqKey)) && effectiveGroqKey) {
      const messages = [
        { role: 'system', content: 'You are an exam setter formatting spoken questions into clean JSON. Always return valid JSON only.' },
        { role: 'user', content: prompt }
      ];
      const groqResp = await callGroqChat(effectiveGroqKey, messages, false, true);
      const parsed = extractJsonFromText(groqResp);
      return res.json({ success: true, question: parsed });
    }

    // 2. Try OpenRouter if selected
    const effectiveOpenRouterKey = clientKey || process.env.OPENROUTER_API_KEY;
    if (customProvider === 'openrouter' && effectiveOpenRouterKey) {
      const messages = [
        { role: 'system', content: 'You are an exam setter formatting spoken questions into clean JSON. Always return valid JSON only.' },
        { role: 'user', content: prompt }
      ];
      const orResp = await callOpenRouterChat(effectiveOpenRouterKey, messages, true);
      const parsed = extractJsonFromText(orResp);
      return res.json({ success: true, question: parsed });
    }

    // 3. Default: Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'Please select Groq in AI Settings and paste your free Groq key.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
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

// Endpoint: AI Audio Transcription fallback
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
      model: 'gemini-3.8-flash',
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
