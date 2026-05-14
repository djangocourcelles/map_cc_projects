'use strict';

const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const { exec, execFile } = require('child_process');
const { scanWorkspace, WORKSPACE } = require('./scanner');

const { WebSocketServer } = require('ws');
const { startWatcher } = require('./watcher');

const PORT       = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
};

const server = http.createServer((req, res) => {
  // GET /api/projects
  if (req.method === 'GET' && req.url === '/api/projects') {
    let projects;
    try {
      projects = scanWorkspace();
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(projects));
    return;
  }

  // GET /open — opens a project in VS Code
  if (req.url.startsWith('/open') && req.method === 'GET') {
    const params      = new URL(req.url, 'http://localhost').searchParams;
    const projectPath = params.get('path') || '';
    const safeWorkspace = WORKSPACE.endsWith('/') ? WORKSPACE : WORKSPACE + '/';
    if (!projectPath.startsWith(safeWorkspace)) {
      res.writeHead(400); res.end('Invalid path'); return;
    }
    execFile('code', [projectPath], err => {
      if (err) console.error('[open] VS Code error:', err.message);
    });
    res.writeHead(204); res.end();
    return;
  }

  // Static files
  const normalizedUrl  = req.url.split('?')[0];
  const relativeFile   = normalizedUrl === '/' ? 'index.html' : normalizedUrl;
  const filePath       = path.join(PUBLIC_DIR, relativeFile);

  // Directory traversal guard — compare with trailing separator to avoid prefix collisions
  const safePrefix = PUBLIC_DIR.endsWith(path.sep) ? PUBLIC_DIR : PUBLIC_DIR + path.sep;
  if (!filePath.startsWith(safePrefix) && filePath !== PUBLIC_DIR) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'text/plain',
    });
    res.end(data);
  });
});

// WebSocket server sharing the same HTTP port
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  ws.on('error', (err) => console.error('[ws] Client error:', err.message));
});

server.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
  console.log(`Scanning workspace: ${WORKSPACE}`);
  exec(`open http://localhost:${PORT}`, (err) => {
    if (err) console.error('Could not open browser:', err.message);
  });
  startWatcher(wss);
  console.log('[watcher] Watching STATE.md + COMMIT_EDITMSG');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} already in use. Stop the existing process or use PORT=3001 node server.js`
    );
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});
