import { NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';
import fs from 'fs';
import path from 'path';

function detectActiveProvider(): string {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      if (content.match(/^GROQ_API_KEY=(.+)$/m)) return 'Groq';
      if (content.match(/^OPENROUTER_API_KEY=(.+)$/m)) return 'OpenRouter';
    }
  } catch { }
  if (process.env.GROQ_API_KEY) return 'Groq';
  if (process.env.OPENROUTER_API_KEY) return 'OpenRouter';
  return 'None';
}

export async function GET() {
  const startTime = Date.now();
  const provider = detectActiveProvider();

  try {
    const testResult = await callAI(
      'You are a system health checker. Respond ONLY with this valid JSON: { "status": "OK" }',
      'Test connection'
    );

    const latency = Date.now() - startTime;
    const ok = testResult.toUpperCase().includes('OK');

    return NextResponse.json({
      status: ok ? 'healthy' : 'degraded',
      provider,
      latency,
    });
  } catch (error: any) {
    const isRateLimited = error.message?.includes('429') || error.message?.includes('rate');
    return NextResponse.json({
      status: isRateLimited ? 'degraded' : 'offline',
      provider: isRateLimited ? `${provider} (Rate Limited)` : 'Offline',
      error: error.message?.substring(0, 120),
      latency: Date.now() - startTime,
    });
  }
}
