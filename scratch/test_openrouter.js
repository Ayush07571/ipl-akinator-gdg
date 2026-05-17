const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

let apiKey = "";
try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  const match = envContent.match(/OPENROUTER_API_KEY=(.*)/);
  if (match) apiKey = match[1].trim();
} catch (e) {
  console.error("Could not read .env.local:", e.message);
}

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: apiKey,
});

async function main() {
  const modelToTest = 'deepseek/deepseek-v4-flash:free';
  console.log(`Sending test request in JSON Mode to model: ${modelToTest}`);
  try {
    const response = await openrouter.chat.completions.create({
      model: modelToTest,
      messages: [
        { role: 'system', content: 'You must respond ONLY in valid JSON. Format: { "message": "hello" }' },
        { role: 'user', content: 'Say hello!' }
      ],
      response_format: { type: 'json_object' }
    });
    console.log("SUCCESS! Response:", response.choices[0].message.content);
  } catch (err) {
    console.error("FAILED! Error details:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
    }
  }
}

main();
