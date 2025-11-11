import axios from 'axios';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek/deepseek-chat';

// Create OpenRouter client
const openRouterClient = axios.create({
  baseURL: OPENROUTER_API_URL,
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://your-app-domain.com',
    'X-Title': 'Live Class AI Assistant'
  }
});

// --- Helper to clean JSON markdown wrappers ---
function cleanJSON(content) {
  return content.replace(/```json/gi, '').replace(/```/g, '').trim();
}

// --- Helper to bulletize text ---
function bulletize(text) {
  if (Array.isArray(text)) {
    return text.filter(Boolean).map(line => line.trim());
  }
  return text
    .split(/\n|\./)
    .map(line => line.trim())
    .filter(Boolean);
}

// --- Summarize Transcript ---
export async function summarizeText(transcript) {
  try {
    const prompt = `
You are an AI assistant that helps students by analyzing class transcripts.

Please analyze the following transcript and return ONLY valid JSON (no markdown, no extra text):
{
  "summary": ["Main topic 1", "Main topic 2", ...],
  "keyPoints": ["Key point 1", "Key point 2", ...],
  "assignments": ["Assignment 1", "Assignment 2", ...]
}

Transcript:
${transcript}
`;

    const response = await openRouterClient.post('', {
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that analyzes educational content and provides structured summaries.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    });

    let content = cleanJSON(response.data.choices[0].message.content);

    try {
      const parsed = JSON.parse(content);

      return {
        summary: bulletize(parsed.summary || []),
        keyPoints: bulletize(parsed.keyPoints || []),
        assignments: bulletize(parsed.assignments || [])
      };
    } catch (parseError) {
      // Fallback: treat raw text as summary
      return {
        summary: bulletize(content),
        keyPoints: [],
        assignments: []
      };
    }
  } catch (error) {
    console.error('DeepSeek summarization error:', error.response?.data || error.message);

    if (error.response?.status === 401) throw new Error('Invalid OpenRouter API key');
    if (error.response?.status === 429) throw new Error('Rate limit exceeded. Please try again later.');

    throw new Error(`Summarization failed: ${error.message}`);
  }
}

// --- Q&A ---
export async function answerQuestion(question, transcript, summary = []) {
  try {
    const context = summary.length
      ? `Summary:\n${summary.join('\n')}\n\nFull Transcript:\n${transcript}`
      : transcript;

    const prompt = `
Based on the following class content, please answer the student's question.
Be specific and reference the actual content from the class when possible.

Class Content:
${context}

Student Question: ${question}

Answer:
`;

    const response = await openRouterClient.post('', {
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI tutor that answers questions based on class transcripts. Always base your answers on the provided class content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 800
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('DeepSeek Q&A error:', error.response?.data || error.message);

    if (error.response?.status === 401) throw new Error('Invalid OpenRouter API key');
    if (error.response?.status === 429) throw new Error('Rate limit exceeded. Please try again later.');

    throw new Error(`Q&A processing failed: ${error.message}`);
  }
}

// --- Quiz Generation ---
export async function generateQuiz(transcript, difficulty = 'medium') {
  try {
    const prompt = `
Based on the following class transcript, generate a quiz with 5 multiple-choice questions.
Difficulty level: ${difficulty}

Format response strictly as JSON:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correct": "A",
      "explanation": "Brief explanation of the correct answer"
    }
  ]
}

Transcript:
${transcript}
`;

    const response = await openRouterClient.post('', {
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an educational AI that creates quizzes based on class content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 2000
    });

    const content = cleanJSON(response.data.choices[0].message.content);

    try {
      return JSON.parse(content);
    } catch {
      throw new Error('Failed to parse quiz response');
    }
  } catch (error) {
    console.error('Quiz generation error:', error.response?.data || error.message);
    throw new Error(`Quiz generation failed: ${error.message}`);
  }
}
