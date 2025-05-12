const chokidar = require('chokidar');
const axios = require('axios');
const fs = require('fs');

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// Watch for file changes
chokidar.watch('/workspace', {
  ignored: /(^|[\/\\])\../,
  persistent: true
}).on('change', async (path) => {
  try {
    const content = fs.readFileSync(path, 'utf8');
    
    // Send to n8n webhook
    await axios.post(N8N_WEBHOOK_URL, {
      file: path,
      content: content,
      type: 'code-assist'
    });
  } catch (error) {
    console.error('Error processing file:', error);
  }
});