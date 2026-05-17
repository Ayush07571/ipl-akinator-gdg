const https = require('https');

https.get('https://openrouter.ai/api/v1/models', (resp) => {
  let data = '';

  resp.on('data', (chunk) => {
    data += chunk;
  });

  resp.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log("Active OpenRouter Free Models:");
      const freeModels = result.data.filter(m => m.id.includes(':free') || (m.pricing && parseFloat(m.pricing.prompt) === 0));
      freeModels.forEach(m => {
        console.log(`- ${m.id} (${m.name})`);
      });
    } catch (e) {
      console.error("Parsing failed:", e.message);
    }
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});
