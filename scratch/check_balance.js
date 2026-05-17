const https = require('https');
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

if (!apiKey) {
  console.error("API Key is missing!");
  process.exit(1);
}

const options = {
  hostname: 'openrouter.ai',
  path: '/api/v1/auth/key',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log("=== OpenRouter Key Status ===");
      console.log("Response status code:", res.statusCode);
      if (result.data) {
        console.log("Label:", result.data.label);
        console.log("Limit (USD):", result.data.limit);
        console.log("Usage (USD):", result.data.usage);
        const remaining = (result.data.limit || 0) - (result.data.usage || 0);
        console.log("Remaining Balance (USD):", remaining.toFixed(4));
        console.log("Is Key Valid:", remaining > 0 ? "YES! Ready for paid models." : "NO (No credits or inactive key)");
      } else {
        console.log("Raw Response:", data);
      }
    } catch (e) {
      console.error("Failed to parse response:", e.message, "Raw data was:", data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.end();
