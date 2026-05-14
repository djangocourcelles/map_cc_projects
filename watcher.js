'use strict';

const chokidar  = require('chokidar');
const WebSocket = require('ws');
const { scanWorkspace, invalidateCache, WORKSPACE } = require('./scanner');

const PATTERNS = [
  `${WORKSPACE}/**/.planning/STATE.md`,
  `${WORKSPACE}/**/.git/COMMIT_EDITMSG`,
  // Detect project creation/deletion
  `${WORKSPACE}/*/CLAUDE.md`,
  `${WORKSPACE}/*/package.json`,
  `${WORKSPACE}/*/requirements.txt`,
  `${WORKSPACE}/*/pyproject.toml`,
];

/**
 * Starts the chokidar watcher and wires up WebSocket broadcasts.
 * @param {WebSocketServer} wss - WebSocketServer instance to broadcast on
 * @returns {FSWatcher} The chokidar instance (for clean shutdown if needed)
 */
function startWatcher(wss) {
  let timer = null;

  const watcher = chokidar.watch(PATTERNS, {
    ignoreInitial: true,
    persistent: true,
    // Negative lookahead keeps COMMIT_EDITMSG while ignoring the rest of .git
    ignored: /node_modules|\.git[/\\](?!COMMIT_EDITMSG)|venv|dist|__pycache__/,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  function rescanAndBroadcast() {
    invalidateCache();
    let projects;
    try {
      projects = scanWorkspace();
    } catch (err) {
      console.error('[watcher] Rescan error:', err.message);
      return;
    }
    const payload = JSON.stringify({ type: 'update', projects });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload, (err) => {
          if (err) console.error('[watcher] Send error:', err.message);
        });
      }
    });
  }

  // Debounce 500ms to avoid bursts on rapid file changes
  function triggerDebounce() {
    clearTimeout(timer);
    timer = setTimeout(rescanAndBroadcast, 500);
  }

  watcher
    .on('add',    triggerDebounce)
    .on('change', triggerDebounce)
    .on('unlink', triggerDebounce)
    .on('error',  (err) => console.error('[watcher] Error:', err.message));

  return watcher;
}

module.exports = { startWatcher };
