const https = require('https');
const fs = require('fs');
const path = require('path');

let openRouterKey = "";
try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  const match = envContent.match(/OPENROUTER_API_KEY=(.*)/);
  if (match) openRouterKey = match[1].trim();
} catch (e) {}

https.get('https://openrouter.ai/api/v1/models', {
  headers: { 'Authorization': `Bearer ${openRouterKey}` }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const parsed = JSON.parse(data);
    // Filter only :free models
    const freeModels = parsed.data
      .filter(m => m.id.includes(':free'))
      .map(m => ({ id: m.id, name: m.name }));
    
    console.log(`Found ${freeModels.length} free models currently active on OpenRouter:\n`);
    freeModels.forEach(m => console.log(`- ${m.id}  (${m.name})`));
  });
}).on('error', e => console.error('Error:', e.message));
