const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

let openRouterKey = "";
try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  const match = envContent.match(/OPENROUTER_API_KEY=(.*)/);
  if (match) openRouterKey = match[1].trim();
} catch (e) {
  console.error("Could not read .env.local:", e.message);
}

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: openRouterKey,
});

// Best candidates for our use case (strong instruction-following, currently live)
const CANDIDATES = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',
  'deepseek/deepseek-v4-flash:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];

async function testModel(modelId) {
  process.stdout.write(`Testing ${modelId}... `);
  try {
    const response = await openrouter.chat.completions.create({
      model: modelId,
      messages: [{ role: 'user', content: 'Say hello in 3 words' }],
      max_tokens: 20,
    });
    const text = response.choices[0].message.content.trim();
    console.log(`✅ WORKING — "${text}"`);
    return true;
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('429')) console.log(`❌ RATE LIMITED`);
    else if (msg.includes('404')) console.log(`❌ RETIRED (404)`);
    else console.log(`❌ ERROR: ${msg.substring(0, 80)}`);
    return false;
  }
}

async function run() {
  console.log(`\nSweeping ${CANDIDATES.length} best free models with your key...\n`);
  const working = [];
  for (const model of CANDIDATES) {
    const ok = await testModel(model);
    if (ok) working.push(model);
  }

  console.log('\n==============================');
  if (working.length > 0) {
    console.log('✅ WORKING MODELS (use these!):');
    working.forEach(m => console.log('  -', m));
    console.log(`\n👉 Best pick: ${working[0]}`);
  } else {
    console.log('❌ No free models worked. Your IP/account may be rate limited across all free models.');
    console.log('   Solution: Add $1-$2 credit to your OpenRouter account to bypass all limits.');
  }
  console.log('==============================');
}

run();
