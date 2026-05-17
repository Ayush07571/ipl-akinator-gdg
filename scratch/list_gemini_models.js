const https = require('https');
const fs = require('fs');
const path = require('path');

let geminiKey = "";
try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  const match = envContent.match(/GEMINI_API_KEY=(.*)/);
  if (match) geminiKey = match[1].trim();
} catch (e) {
  console.error("Could not read .env.local:", e.message);
}

if (!geminiKey) {
  console.error("Gemini key is missing!");
  process.exit(1);
}

function listModels() {
  console.log("Fetching active model list from Google Gemini...");
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (res.statusCode === 200) {
          console.log("✅ Successfully retrieved models:");
          parsed.models.forEach(m => {
            console.log(`- ${m.name} (${m.displayName})`);
          });
        } else {
          console.log(`❌ Failed! Response:`, JSON.stringify(parsed, null, 2));
        }
      } catch (e) {
        console.log(`❌ JSON Parse Error:`, data);
      }
    });
  }).on('error', (e) => {
    console.error(`Request error: ${e.message}`);
  });
}

listModels();
