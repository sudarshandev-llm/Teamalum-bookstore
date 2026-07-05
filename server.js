const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const MIME = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'
};

http.createServer((req, res) => {
  let filePath = '.' + (req.url === '/' ? '/index.html' : req.url);
  const ext = path.extname(filePath);
  
  // Special case for auth callback
  if (filePath === './auth/callback.html' || filePath === './auth/callback') {
    filePath = './auth/callback.html';
  }
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback - serve index.html for non-file routes
        fs.readFile('./index.html', (err2, content2) => {
          if (err2) { res.writeHead(500); res.end('Server error'); return; }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content2, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(content, 'utf-8');
  });
}).listen(PORT, () => console.log(`Server running on port ${PORT}`));
