'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = process.env.WORKSPACE || path.resolve(__dirname, '..');
const EXCLUDED_DIRS = new Set(['venv', 'node_modules', '.git', 'dist', '__pycache__']);

// Exclude the current directory (map_project itself) so it doesn't appear as its own node.
const CURRENT_DIR_NAME = path.basename(__dirname);

const STACK_MARKERS = [
  { file: 'package.json',     stack: 'Node.js', emoji: '🟢' },
  { file: 'requirements.txt', stack: 'Python',  emoji: '🐍' },
  { file: 'pyproject.toml',   stack: 'Python',  emoji: '🐍' },
  { file: 'Cargo.toml',       stack: 'Rust',    emoji: '🦀' },
  { file: 'go.mod',           stack: 'Go',      emoji: '🐹' },
  { file: 'Gemfile',          stack: 'Ruby',    emoji: '💎' },
  { file: 'pom.xml',          stack: 'Java',    emoji: '☕' },
  { file: 'build.gradle',     stack: 'Java',    emoji: '☕' },
];

/** Runs a git command in the given directory. Returns null on failure or if not a git repo. */
function runGit(command, cwd) {
  try {
    return execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

/** Computes days elapsed since a Unix timestamp. Returns null if missing or invalid. */
function computeDays(unixTimestamp) {
  if (!unixTimestamp) return null;
  const ts = parseInt(unixTimestamp, 10);
  if (isNaN(ts)) return null;
  const diff = Math.floor((Date.now() / 1000 - ts) / 86400);
  return Math.max(0, diff); // guard against future timestamps or clock drift
}

/** Converts a day count to a human-readable relative label. */
function daysToLabel(days) {
  if (days === null) return 'no git';
  if (days === 0)    return 'today';
  if (days === 1)    return '1 day ago';
  if (days < 30)     return `${days} days ago`;
  if (days < 365)    return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

/**
 * Computes bubble radius from 5 activity tiers.
 * null (no git) → 12, 0d → 50, <7d → 40, <30d → 30, <90d → 20, ≥90d → 12
 */
function computeRadius(days) {
  if (days === null) return 12;
  if (days === 0)    return 50;
  if (days < 7)      return 40;
  if (days < 30)     return 30;
  if (days < 90)     return 20;
  return 12;
}

/** Computes bubble opacity. Projects without git → 0.4; all others → 1.0. */
function computeOpacity(days, hasGit) {
  if (!hasGit || days === null) return 0.4;
  return 1.0;
}

/** Reads the GSD status from a project's STATE.md. Returns null if absent. */
function readGsdStatus(projectPath) {
  const stateFile = path.join(projectPath, '.planning', 'STATE.md');
  try {
    const content = fs.readFileSync(stateFile, 'utf8');
    const match = content.match(/^status:\s*(.+)$/m);
    return match ? match[1].trim() : 'unknown';
  } catch {
    return null; // no STATE.md → dashed ring
  }
}

/**
 * Builds a ProjectRecord for a given directory.
 * @param {string} dirPath  - Absolute path to the project
 * @param {string} id       - Unique identifier (name or parent/name)
 * @param {string} name     - Display name
 * @returns {object} ProjectRecord
 */
function buildRecord(dirPath, id, name) {
  const hasGit = fs.existsSync(path.join(dirPath, '.git'));

  // Multi-stack detection with deduplication by stack name
  const detectedStacks = new Map();
  for (const m of STACK_MARKERS) {
    if (!detectedStacks.has(m.stack) && fs.existsSync(path.join(dirPath, m.file))) {
      detectedStacks.set(m.stack, { stack: m.stack, emoji: m.emoji });
    }
  }
  const stacks = detectedStacks.size > 0
    ? Array.from(detectedStacks.values())
    : [{ stack: name, emoji: null }]; // fallback: folder name

  // Git metadata
  const branchRaw    = hasGit ? runGit('git rev-parse --abbrev-ref HEAD', dirPath) : null;
  const timestampRaw = hasGit ? runGit('git log -1 --format=%ct', dirPath) : null;
  const days         = computeDays(timestampRaw);
  const branch       = branchRaw || (hasGit ? 'unknown branch' : null);

  // Last commit subject (used in tooltip)
  const commitMsgRaw = hasGit ? runGit('git log -1 --format=%s', dirPath) : null;
  const last_commit  = commitMsgRaw
    ? commitMsgRaw.slice(0, 60) + (commitMsgRaw.length > 60 ? '…' : '')
    : null;

  const gsdStatus = readGsdStatus(dirPath);

  return {
    id,
    name,
    path:              dirPath,
    has_git:           hasGit,
    stacks,
    branch,
    days_since_commit: days,
    date_label:        hasGit ? daysToLabel(days) : 'no git',
    radius:            computeRadius(days),
    opacity:           computeOpacity(days, hasGit),
    has_gsd:           fs.existsSync(path.join(dirPath, '.planning')),
    has_state:         gsdStatus !== null,
    gsd_status:        gsdStatus,
    last_commit,
  };
}

// Simple cache to avoid blocking the event loop with repeated execSync calls. TTL = 30s.
let _cachedResults  = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS  = 30_000;

/** Manually invalidates the cache (called by the watcher on every change). */
function invalidateCache() {
  _cachedResults = null;
}

/**
 * Scans the workspace and returns an array of ProjectRecord.
 * Depth 2: includes sub-projects that have at least one stack marker.
 * Results are cached for 30s to limit blocking execSync calls.
 * @returns {ProjectRecord[]}
 */
function scanWorkspace() {
  const now = Date.now();
  if (_cachedResults && (now - _cacheTimestamp) < CACHE_TTL_MS) {
    return _cachedResults;
  }
  const results = [];

  const entries = fs.readdirSync(WORKSPACE, { withFileTypes: true })
    .filter(e => e.isDirectory()
      && !EXCLUDED_DIRS.has(e.name)
      && !e.name.startsWith('.')
      && e.name !== CURRENT_DIR_NAME
    );

  for (const e of entries) {
    const dirPath = path.join(WORKSPACE, e.name);

    // Root project (depth 1)
    results.push(buildRecord(dirPath, e.name, e.name));

    // Sub-projects (depth 2)
    try {
      const subEntries = fs.readdirSync(dirPath, { withFileTypes: true })
        .filter(s => s.isDirectory() && !EXCLUDED_DIRS.has(s.name) && !s.name.startsWith('.'));

      for (const s of subEntries) {
        const subPath = path.join(dirPath, s.name);
        // Skip sub-directories without a stack marker
        const hasMarker = STACK_MARKERS.some(m => fs.existsSync(path.join(subPath, m.file)));
        if (!hasMarker) continue;

        const subId = `${e.name}/${s.name}`;
        results.push(buildRecord(subPath, subId, subId));
      }
    } catch {
      // Ignore unreadable sub-directories (permission errors, etc.)
    }
  }

  _cachedResults  = results;
  _cacheTimestamp = Date.now();
  return results;
}

module.exports = { scanWorkspace, readGsdStatus, invalidateCache, WORKSPACE };
