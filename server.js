// Local development server for the Team Alum Bookstore.
//
// The site is a static SPA (no build step). Vercel serves it directly; this
// server just mimics that behaviour for `npm start`.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

// Paths that map to a file that is not named after the route.
const ALIASES = {
  '/admin': '/admin-subscriptions.html',
  '/admin/': '/admin-subscriptions.html',
  '/admin.team': '/admin-subscriptions.html',
  '/admin.team.html': '/admin-subscriptions.html',
  '/auth/callback': '/auth/callback.html',
};

// Never serve these, even in local development.
const DENY = [
  /^\/\.env(\..*)?$/i,
  /^\/\.git(\/|$)/i,
  /^\/\.vercel(\/|$)/i,
  /^\/\.github(\/|$)/i,
  /^\/supabase\//i,
  /^\/scripts\//i,
  /^\/vercel\.json$/i,
  /^\/package(-lock)?\.json$/i,
];

function send(res, status, file, type) {
  fs.readFile(path.join(ROOT, file), (err, buf) => {
    if (err) { res.writeHead(500); res.end('Server error'); return; }
    res.writeHead(status, {
      'Content-Type': type,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(buf);
  });
}

http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400); res.end('Bad request'); return;
  }

  const alias = ALIASES[pathname.replace(/\/+$/, '') || '/'];
  if (alias) { send(res, 200, alias, MIME['.html']); return; }

  if (DENY.some(re => re.test(pathname))) { res.writeHead(403); res.end('Forbidden'); return; }

  if (pathname === '/' || pathname === '') { send(res, 200, 'index.html', MIME['.html']); return; }

  // Block path traversal: everything must resolve inside ROOT.
  const target = path.normalize(path.join(ROOT, pathname));
  if (!target.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.stat(target, (err, stat) => {
    if (!err && stat.isFile()) {
      send(res, 200, path.relative(ROOT, target), MIME[path.extname(target)] || 'application/octet-stream');
      return;
    }
    // Unknown route -> 404 page, matching the Vercel deployment.
    send(res, 404, '404.html', MIME['.html']);
  });
}).listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
