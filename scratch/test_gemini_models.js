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

async function testModel(modelName) {
  return new Promise((resolve) => {
    console.log(`\nTesting Gemini Model: ${modelName}...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
    
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
        console.log(`HTTP Status: ${res.statusCode}`);
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log(`✅ Success! Response:`, parsed.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
            resolve(true);
          } else {
            console.log(`❌ Failed! Response Error:`, JSON.stringify(parsed.error || parsed, null, 2));
            resolve(false);
          }
        } catch (e) {
          console.log(`❌ JSON Parse Error:`, data);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`Request error: ${e.message}`);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

async function run() {
  const success25 = await testModel('gemini-2.5-flash');
  const success15 = await testModel('gemini-1.5-flash');
  console.log("\n==============================");
  console.log("Summary:");
  console.log("Gemini 2.5 Flash:", success25 ? "ACTIVE ✅" : "INACTIVE ❌");
  console.log("Gemini 1.5 Flash:", success15 ? "ACTIVE ✅" : "INACTIVE ❌");
  console.log("==============================");
}

run();
