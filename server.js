'use strict';

const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const { exec } = require('child_process');
const { scannerWorkspace } = require('./scanner');

const { WebSocketServer } = require('ws');
const { demarrerWatcher } = require('./watcher');

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
  // Route API — GET /api/projects
  if (req.method === 'GET' && req.url === '/api/projects') {
    let projets;
    try {
      projets = scannerWorkspace();
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ erreur: err.message }));
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(projets));
    return;
  }

  // Route — GET /open (ouvre un projet dans VS Code — INT-02)
  if (req.url.startsWith('/open') && req.method === 'GET') {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const chemin = params.get('path') || '';
    if (!chemin.startsWith('/Users/laurent/Documents/CLAUDE_PROJETS/')) {
      res.writeHead(400); res.end('Chemin invalide'); return;
    }
    require('child_process').exec(`code "${chemin}"`, err => {
      if (err) console.error('[open] Erreur VS Code :', err.message);
    });
    res.writeHead(204); res.end();
    return;
  }

  // Fichiers statiques
  const urlNormalisee = req.url.split('?')[0]; // ignorer query strings
  const fichierRelatif = urlNormalisee === '/' ? 'index.html' : urlNormalisee;
  const filePath = path.join(PUBLIC_DIR, fichierRelatif);

  // Sécurité : empêcher les traversées de répertoire hors de PUBLIC_DIR
  // On compare avec le séparateur de chemin pour éviter qu'un préfixe de dossier
  // (/foo/public) soit confondu avec un dossier voisin (/foo/public2).
  const SAFE_PREFIX = PUBLIC_DIR.endsWith(path.sep) ? PUBLIC_DIR : PUBLIC_DIR + path.sep;
  if (!filePath.startsWith(SAFE_PREFIX) && filePath !== PUBLIC_DIR) {
    res.writeHead(403);
    res.end('Accès refusé');
    return;
  }

  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Fichier non trouvé');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'text/plain',
    });
    res.end(data);
  });
});

// WebSocket attaché au même port HTTP (INT-04)
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  ws.on('error', (err) => console.error('[ws] Erreur client :', err.message));
});

server.listen(PORT, () => {
  console.log(`Serveur démarré : http://localhost:${PORT}`);
  // Ouverture browser macOS natif — zéro dépendance (INFRA-02)
  exec(`open http://localhost:${PORT}`, (err) => {
    if (err) console.error('Impossible d\'ouvrir le browser :', err.message);
  });
  demarrerWatcher(wss);
  console.log('[watcher] Surveillance active — STATE.md + COMMIT_EDITMSG');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} déjà utilisé. Arrêter le processus existant ou utiliser PORT=3001 node server.js`
    );
  } else {
    console.error('Erreur serveur :', err.message);
  }
  process.exit(1);
});
