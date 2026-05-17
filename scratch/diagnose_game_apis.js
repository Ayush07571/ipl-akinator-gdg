const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const https = require('https');

let openRouterKey = "";
let geminiKey = "";

try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  const openRouterMatch = envContent.match(/OPENROUTER_API_KEY=(.*)/);
  if (openRouterMatch) openRouterKey = openRouterMatch[1].trim();

  const geminiMatch = envContent.match(/GEMINI_API_KEY=(.*)/);
  if (geminiMatch) geminiKey = geminiMatch[1].trim();
} catch (e) {
  console.log("Could not read .env.local:", e.message);
}

console.log("=========================================");
console.log("🔍 IPL Akinator API Diagnostic Console");
console.log("=========================================");
console.log("OpenRouter API Key Status:", openRouterKey ? "PRESENT (sk-or-v1-...)" : "MISSING ❌");
console.log("Gemini API Key Status:    ", geminiKey ? "PRESENT (AI Studio)" : "MISSING ❌");
console.log("-----------------------------------------");

async function testOpenRouter() {
  if (!openRouterKey) {
    console.log("Skipping OpenRouter check (no key).");
    return;
  }
  console.log("Testing OpenRouter API...");
  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: openRouterKey,
  });

  try {
    const response = await openrouter.chat.completions.create({
      model: 'deepseek/deepseek-v4-flash:free',
      messages: [{ role: 'user', content: 'Say hello in 3 words' }],
    });
    console.log("✅ OpenRouter SUCCESS:", response.choices[0].message.content.trim());
  } catch (err) {
    console.log("❌ OpenRouter FAILED!");
    console.log("Error Message:", err.message);
    if (err.message.includes("429") || err.message.includes("Rate limit")) {
      console.log("\n💡 EXPLANATION: Your OpenRouter free key has exceeded its daily or minute-based rate limits!");
      console.log("To resolve this, either add credits to your OpenRouter key, or add a free GEMINI_API_KEY.");
    }
  }
}

function testGemini() {
  if (!geminiKey) {
    console.log("\n💡 GEMINI API KEY IS MISSING in .env.local!");
    console.log("1. Go to https://aistudio.google.com/ and create a free key in 15 seconds.");
    console.log("2. Add it to .env.local: GEMINI_API_KEY=your_key");
    console.log("This will permanently resolve all rate limits and timeouts.");
    return;
  }

  console.log("\nTesting Google Gemini API...");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
  
  const postData = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: 'Say hello in 3 words' }] }],
    generationConfig: { responseMimeType: "application/json" }
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log("✅ Google Gemini SUCCESS! Key is active and fully functional.");
      } else {
        console.log("❌ Google Gemini FAILED. Status Code:", res.statusCode);
        console.log("Response:", data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Gemini request error: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

async function run() {
  await testOpenRouter();
  testGemini();
}

run();
