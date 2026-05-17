import OpenAI from 'openai';

// Fall back to a dummy-key if the key is commented out or missing.
// This prevents the OpenAI SDK from throwing a fatal startup crash during module evaluation.
export const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || 'dummy-key',
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'IPL Akinator'
  }
});

// meta-llama/llama-3.3-70b-instruct:free — confirmed working, 70B, excellent JSON instruction following
export const MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
