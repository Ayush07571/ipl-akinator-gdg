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

const SYSTEM_PROMPT = `
You are the DEDUCTOR AGENT for an IPL Cricket Akinator game.
Identify the top 10 most probable players based on Q&A history.

Return ONLY this exact JSON format:
{
  "candidates": [
    { "name": "Virat Kohli", "probability": 85, "team": "RCB", "role": "Batsman" }
  ],
  "readyToGuess": false,
  "topGuess": "Virat Kohli",
  "reasoning": "Test case."
}
`;

async function main() {
  const modelToTest = 'meta-llama/llama-3.2-3b-instruct:free';
  console.log(`Testing model in JSON Mode: ${modelToTest}...`);
  try {
    const response = await openrouter.chat.completions.create({
      model: modelToTest,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { 
          role: 'user', 
          content: JSON.stringify({ 
            history: [
              { question: "IS YOUR STAR AN INDIAN NATIONAL?", answer: "yes" }
            ],
            questionNumber: 1
          }) 
        }
      ],
      response_format: { type: 'json_object' }
    });
    console.log("SUCCESS! Response choices content:", response.choices ? response.choices[0].message.content : "No choices!");
    console.log("Full response object:", JSON.stringify(response, null, 2));
  } catch (err) {
    console.error("FAILED! Error details:", err);
  }
}

main();
