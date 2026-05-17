const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const groqKey = env.match(/^GROQ_API_KEY=(.+)$/m)?.[1]?.trim();

if (!groqKey) { console.error('❌ GROQ_API_KEY not found!'); process.exit(1); }

const client = new OpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: groqKey, timeout: 15000 });

(async () => {
  console.log('Testing Groq (llama-3.3-70b-versatile)...');
  const start = Date.now();
  try {
    const r = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'Reply with JSON: {"status":"OK","message":"Groq is working!"}' }],
      response_format: { type: 'json_object' },
      max_tokens: 50,
    });
    const latency = Date.now() - start;
    console.log(`✅ Groq SUCCESS in ${latency}ms!`);
    console.log('Response:', r.choices[0].message.content);
  } catch (e) {
    console.log(`❌ Groq FAILED: ${e.message}`);
  }
})();
