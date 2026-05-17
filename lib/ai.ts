import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const TIMEOUT_MS = 15000;

// OpenRouter fallback chain (tried in order if Groq is unavailable)
const OPENROUTER_MODEL_CHAIN = [
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];

function readEnvFile(): Record<string, string> {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const result: Record<string, string> = {};
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match) result[match[1]] = match[2].trim();
    }
    return result;
  } catch { return {}; }
}

async function tryGroq(env: Record<string, string>, systemPrompt: string, userPrompt: string): Promise<string> {
  const groqKey = env['GROQ_API_KEY'] || process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('No GROQ_API_KEY configured');

  const client = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: groqKey,
    timeout: TIMEOUT_MS,
  });

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 500,
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty Groq response');
  return content;
}

async function tryOpenRouter(env: Record<string, string>, systemPrompt: string, userPrompt: string): Promise<string> {
  const orKey = env['OPENROUTER_API_KEY'] || process.env.OPENROUTER_API_KEY;
  if (!orKey || orKey === 'dummy-key') throw new Error('No valid OPENROUTER_API_KEY configured');

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: orKey,
    defaultHeaders: { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'IPL Akinator' },
    timeout: TIMEOUT_MS,
  });

  const errors: string[] = [];
  for (const model of OPENROUTER_MODEL_CHAIN) {
    console.log(`AI Provider: Trying OpenRouter → ${model}`);
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
      });
      const content = response.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response');
      const parsed = JSON.parse(content);
      if (parsed.error) throw new Error(parsed.error.message);
      console.log(`AI Provider: ✅ Success with ${model}`);
      return content;
    } catch (e: any) {
      const msg = e.message || '';
      console.warn(`AI Provider: ❌ ${model} — ${msg.substring(0, 80)}`);
      errors.push(msg);
      const isRetryable = msg.includes('429') || msg.includes('rate') ||
        msg.includes('upstream') || msg.includes('timeout') ||
        msg.includes('503') || msg.includes('502') || msg.includes('Empty');
      if (!isRetryable) break;
    }
  }
  throw new Error(`OpenRouter failed: ${errors[0]?.substring(0, 100)}`);
}

export async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const env = readEnvFile();

  // 1. Try Groq first (14,400 free req/day, sub-second speed)
  try {
    console.log('AI Provider: Trying Groq (llama-3.3-70b-versatile)...');
    const result = await tryGroq(env, systemPrompt, userPrompt);
    console.log('AI Provider: ✅ Groq success');
    return result;
  } catch (e: any) {
    const msg = e.message || '';
    if (!msg.includes('No GROQ_API_KEY')) {
      console.warn('AI Provider: Groq failed —', msg.substring(0, 100));
    }
  }

  // 2. Fall back to OpenRouter free model chain
  console.log('AI Provider: Falling back to OpenRouter...');
  return tryOpenRouter(env, systemPrompt, userPrompt);
}
