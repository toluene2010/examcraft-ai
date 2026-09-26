import { ExamQuestion, GenerateOptions, QuestionType } from '../types/exam';

/**
 * Robust Client-Side Heuristic Parser & Exam Generator
 * 
 * Works 100% offline without any API keys, without network connections,
 * and with zero dependencies. Extracts questions, facts, definitions,
 * cloze tests (fill in blanks), and theory questions directly from text.
 */
export function generateLocalQuestionsFromText(
  text: string,
  options: GenerateOptions
): {
  detectedSubject: string;
  suggestedTotalMarks: number;
  suggestedTimeMinutes: number;
  questions: ExamQuestion[];
} {
  const cleanText = text.trim();
  const paragraphs = cleanText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 15);

  // Extract sentences
  const sentences = cleanText
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter((s) => s.length >= 25 && s.length <= 250);

  const desiredCount = options.questionCount || 10;
  const targetTypes = options.questionTypes.length > 0
    ? options.questionTypes
    : ['multiple_choice', 'short_answer'];

  const questions: ExamQuestion[] = [];
  let questionIndex = 1;

  // Key subject detection
  let detectedSubject = options.subject || 'General Assessment';
  const lower = cleanText.toLowerCase();
  if (lower.includes('photosynthesis') || lower.includes('cell') || lower.includes('organism') || lower.includes('biology')) {
    detectedSubject = 'Biology / Natural Sciences';
  } else if (lower.includes('gravity') || lower.includes('velocity') || lower.includes('current') || lower.includes('force')) {
    detectedSubject = 'Physics / Physical Sciences';
  } else if (lower.includes('reaction') || lower.includes('element') || lower.includes('molecule') || lower.includes('acid')) {
    detectedSubject = 'Chemistry';
  } else if (lower.includes('equation') || lower.includes('triangle') || lower.includes('ratio') || lower.includes('percentage')) {
    detectedSubject = 'Mathematics';
  } else if (lower.includes('market') || lower.includes('demand') || lower.includes('capital') || lower.includes('inflation')) {
    detectedSubject = 'Economics & Commerce';
  } else if (lower.includes('government') || lower.includes('revolution') || lower.includes('century') || lower.includes('war')) {
    detectedSubject = 'History & Social Studies';
  }

  // Pre-identified vocabulary keywords for distractors
  const extractedWords = Array.from(
    new Set(
      cleanText
        .split(/[^a-zA-Z0-9_-]+/)
        .filter((w) => w.length >= 5 && !/^(about|which|their|there|would|could|these|those|after|before|because|between|during|through|without)$/i.test(w))
    )
  );

  // Helper to pick distractors
  const getDistractors = (answer: string): string[] => {
    const pool = extractedWords.filter((w) => w.toLowerCase() !== answer.toLowerCase());
    const shuffled = pool.sort(() => 0.5 - Math.random());
    const distractors = shuffled.slice(0, 3);
    while (distractors.length < 3) {
      distractors.push(['Chlorophyll', 'Mitochondria', 'Equilibrium', 'Kinetic', 'Respiration', 'Oxidation'][distractors.length]);
    }
    return distractors;
  };

  // 1. Detect if the text already contains written questions (e.g. "1.", "Q1:", "What is...?")
  const explicitQuestionRegex = /(?:^|\n)(?:Q(?:\d+)?[:.]|\d+[\).])\s*([^\n\?]+[\?\.])/g;
  let match;
  while ((match = explicitQuestionRegex.exec(cleanText)) !== null && questions.length < desiredCount) {
    const rawQ = match[1].trim();
    if (rawQ.length > 10) {
      questions.push({
        id: 'local-extracted-' + questionIndex,
        number: questionIndex,
        type: 'short_answer',
        question: rawQ.endsWith('?') ? rawQ : `${rawQ}?`,
        answer: 'Detailed response required based on syllabus criteria.',
        explanation: 'Review textbook chapter notes for complete mark allocation.',
        marks: 2,
        section: 'SECTION B: THEORY & SHORT ANSWER'
      });
      questionIndex++;
    }
  }

  // 2. Synthesize questions from informational sentences
  for (const sentence of sentences) {
    if (questions.length >= desiredCount) break;

    // A. "is defined as", "refers to", "is the process of" -> Definitions
    const defMatch = sentence.match(/^([A-Z][a-zA-Z\s]{2,25})\s+(?:is defined as|is known as|refers to|is the process of|is a|is an)\s+(.+)$/i);
    if (defMatch) {
      const term = defMatch[1].trim();
      const definition = defMatch[2].trim();

      if (targetTypes.includes('multiple_choice') && Math.random() > 0.4) {
        const distractors = getDistractors(term);
        const optionsList = [term, ...distractors].sort(() => 0.5 - Math.random());
        const letterIndex = optionsList.indexOf(term);
        const letters = ['A', 'B', 'C', 'D'];
        const formattedOptions = optionsList.map((opt, i) => `${letters[i]}) ${opt}`);
        const correctAnswer = `${letters[letterIndex]}) ${term}`;

        questions.push({
          id: 'local-q-' + questionIndex,
          number: questionIndex,
          type: 'multiple_choice',
          question: `Which of the following is defined as: "${definition.replace(/\.$/, '')}"?`,
          options: formattedOptions,
          answer: correctAnswer,
          explanation: `Correct definition: ${term} is ${definition}`,
          marks: 1,
          section: 'SECTION A: MULTIPLE CHOICE'
        });
        questionIndex++;
        continue;
      } else {
        questions.push({
          id: 'local-q-' + questionIndex,
          number: questionIndex,
          type: 'short_answer',
          question: `Define and briefly explain the significance of "${term}".`,
          answer: `${term} is ${definition}`,
          explanation: `Full mark awarded for complete definition and correct key terms.`,
          marks: 2,
          section: 'SECTION B: SHORT ANSWER & THEORY'
        });
        questionIndex++;
        continue;
      }
    }

    // B. True / False candidate
    if (targetTypes.includes('true_false') && Math.random() > 0.6) {
      const isTrue = Math.random() > 0.3;
      questions.push({
        id: 'local-q-' + questionIndex,
        number: questionIndex,
        type: 'true_false',
        question: `True or False: ${sentence.replace(/\.$/, '')}.`,
        options: ['A) True', 'B) False'],
        answer: isTrue ? 'A) True' : 'B) False',
        explanation: `Based on syllabus reference: "${sentence}"`,
        marks: 1,
        section: 'SECTION A: OBJECTIVE'
      });
      questionIndex++;
      continue;
    }

    // C. Fill in the Blank candidate
    if (targetTypes.includes('fill_blank') || targetTypes.includes('multiple_choice')) {
      const words = sentence.split(' ');
      const candidateWords = words.filter((w) => w.length > 5 && /^[a-zA-Z]+$/.test(w));
      if (candidateWords.length > 0) {
        const targetWord = candidateWords[Math.floor(Math.random() * candidateWords.length)];
        const blankedSentence = sentence.replace(new RegExp(`\\b${targetWord}\\b`, 'i'), '__________');

        if (targetTypes.includes('multiple_choice')) {
          const distractors = getDistractors(targetWord);
          const optionsList = [targetWord, ...distractors].sort(() => 0.5 - Math.random());
          const letterIndex = optionsList.indexOf(targetWord);
          const letters = ['A', 'B', 'C', 'D'];
          const formattedOptions = optionsList.map((opt, i) => `${letters[i]}) ${opt}`);
          const correctAnswer = `${letters[letterIndex]}) ${targetWord}`;

          questions.push({
            id: 'local-q-' + questionIndex,
            number: questionIndex,
            type: 'multiple_choice',
            question: `Complete the statement: ${blankedSentence}`,
            options: formattedOptions,
            answer: correctAnswer,
            explanation: `Complete statement: ${sentence}`,
            marks: 1,
            section: 'SECTION A: MULTIPLE CHOICE'
          });
          questionIndex++;
          continue;
        } else {
          questions.push({
            id: 'local-q-' + questionIndex,
            number: questionIndex,
            type: 'fill_blank',
            question: `Fill in the missing word: ${blankedSentence}`,
            answer: targetWord,
            explanation: `Textbook context: ${sentence}`,
            marks: 1,
            section: 'SECTION A: OBJECTIVE'
          });
          questionIndex++;
          continue;
        }
      }
    }

    // D. Theory / Short answer candidate
    questions.push({
      id: 'local-q-' + questionIndex,
      number: questionIndex,
      type: 'short_answer',
      question: `Explain the fundamental concept underlying: "${sentence.replace(/\.$/, '')}".`,
      answer: `Explanatory points based on: ${sentence}`,
      explanation: 'Marking scheme: Award marks for clarity, accuracy, and appropriate terminology.',
      marks: 3,
      section: 'SECTION B: SHORT ANSWER & THEORY'
    });
    questionIndex++;
  }

  // 3. If text was short or sentences were few, fill with curriculum questions
  const fallbackCurriculum = [
    {
      q: 'State and explain two fundamental laws or principles governing this topic.',
      type: 'short_answer' as QuestionType,
      marks: 4,
      ans: 'Key laws stated clearly with corresponding formulas or conditions.'
    },
    {
      q: 'Differentiate between primary components and secondary factors discussed in this material.',
      type: 'essay' as QuestionType,
      marks: 5,
      ans: 'Comprehensive comparative breakdown with at least two distinguishing criteria.'
    },
    {
      q: 'Which of the following best describes the main objective of the topic studied?',
      type: 'multiple_choice' as QuestionType,
      marks: 1,
      options: ['A) Empirical verification', 'B) Theoretical formulation', 'C) Systematic classification', 'D) Experimental observation'],
      ans: 'A) Empirical verification'
    },
    {
      q: 'Summarize the practical applications of this knowledge in real-world scenarios.',
      type: 'short_answer' as QuestionType,
      marks: 3,
      ans: 'At least two practical examples clearly outlined.'
    }
  ];

  while (questions.length < desiredCount) {
    const item = fallbackCurriculum[(questionIndex - 1) % fallbackCurriculum.length];
    questions.push({
      id: 'local-q-fb-' + questionIndex,
      number: questionIndex,
      type: item.type,
      question: item.q,
      options: item.options,
      answer: item.ans,
      explanation: 'Official curriculum standard marking criterion.',
      marks: item.marks,
      section: item.type === 'multiple_choice' ? 'SECTION A: MULTIPLE CHOICE' : 'SECTION B: THEORY'
    });
    questionIndex++;
  }

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  return {
    detectedSubject,
    suggestedTotalMarks: totalMarks,
    suggestedTimeMinutes: Math.max(30, questions.length * 3),
    questions
  };
}
