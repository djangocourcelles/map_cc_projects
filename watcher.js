'use strict';

const chokidar  = require('chokidar');
const WebSocket = require('ws');
const { scannerWorkspace } = require('./scanner');

const WORKSPACE = '/Users/laurent/Documents/CLAUDE_PROJETS';
const PATTERNS  = [
  `${WORKSPACE}/**/.planning/STATE.md`,
  `${WORKSPACE}/**/.git/COMMIT_EDITMSG`,
];

/**
 * Démarre la surveillance chokidar et branche le broadcast WebSocket.
 * @param {WebSocketServer} wss - Instance WebSocketServer à utiliser pour le broadcast
 * @returns {FSWatcher} L'instance chokidar (pour fermeture propre si besoin)
 */
function demarrerWatcher(wss) {
  let timer = null;

  const watcher = chokidar.watch(PATTERNS, {
    ignoreInitial: true,
    persistent: true,
    // D-07 : lookahead négatif pour garder COMMIT_EDITMSG (Pitfall 2)
    ignored: /node_modules|\.git[/\\](?!COMMIT_EDITMSG)|venv|dist|__pycache__/,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  function rescanEtBroadcast() {
    let projets;
    try {
      projets = scannerWorkspace();  // D-08 : rescan total
    } catch (err) {
      console.error('[watcher] Erreur rescan :', err.message);
      return;
    }
    const payload = JSON.stringify({ type: 'mise_a_jour', projets });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  // D-09 : debounce 500ms
  function declencherDebounce() {
    clearTimeout(timer);
    timer = setTimeout(rescanEtBroadcast, 500);
  }

  watcher
    .on('add',    declencherDebounce)
    .on('change', declencherDebounce)
    .on('unlink', declencherDebounce)
    .on('error',  (err) => console.error('[watcher] Erreur :', err.message));

  return watcher;
}

module.exports = { demarrerWatcher };
