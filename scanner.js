'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = '/Users/laurent/Documents/CLAUDE_PROJETS';
const DOSSIERS_EXCLUS = new Set(['venv', 'node_modules', '.git', 'dist', '__pycache__']);

const SENTINELLES = [
  { fichier: 'package.json',     stack: 'Node.js', emoji: '🟢' },
  { fichier: 'requirements.txt', stack: 'Python',  emoji: '🐍' },
  { fichier: 'pyproject.toml',   stack: 'Python',  emoji: '🐍' },
  { fichier: 'Cargo.toml',       stack: 'Rust',    emoji: '🦀' },
  { fichier: 'go.mod',           stack: 'Go',      emoji: '🐹' },
  { fichier: 'Gemfile',          stack: 'Ruby',    emoji: '💎' },
  { fichier: 'pom.xml',          stack: 'Java',    emoji: '☕' },
  { fichier: 'build.gradle',     stack: 'Java',    emoji: '☕' },
];

/**
 * Exécute une commande git dans un répertoire donné.
 * Retourne null en cas d'échec ou si ce n'est pas un repo git.
 */
function gitExec(commande, cwd) {
  try {
    return execSync(commande, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Calcule le nombre de jours depuis un timestamp Unix.
 * Retourne null si le timestamp est absent ou invalide.
 */
function calculerJours(timestampUnix) {
  if (!timestampUnix) return null;
  const ts = parseInt(timestampUnix, 10);
  if (isNaN(ts)) return null;
  return Math.floor((Date.now() / 1000 - ts) / 86400);
}

/**
 * Convertit un nombre de jours en libellé relatif en français.
 */
function joursEnTexte(jours) {
  if (jours === null) return 'sans git';
  if (jours === 0)    return "aujourd'hui";
  if (jours === 1)    return 'il y a 1 jour';
  if (jours < 30)     return `il y a ${jours} jours`;
  if (jours < 365)    return `il y a ${Math.floor(jours / 30)} mois`;
  return `il y a ${Math.floor(jours / 365)} an(s)`;
}

/**
 * Calcule le rayon de la bulle (D-10).
 * Formule : clamp(28, 28 + (30 - jours) * 0.8, 56)
 * Retourne 28 si jours est null (pas de git).
 */
function calculerRayon(jours) {
  if (jours === null) return 28;
  return Math.max(28, Math.min(56, 28 + (30 - jours) * 0.8));
}

/**
 * Calcule l'opacité de la bulle (D-05).
 * Sans git → 0.4
 * < 7 jours → 1.0
 * 7–30 jours → 0.6
 * > 30 jours → 0.3
 */
function calculerOpacite(jours, hasGit) {
  if (!hasGit || jours === null) return 0.4;
  if (jours < 7)   return 1.0;
  if (jours <= 30) return 0.6;
  return 0.3;
}

/**
 * Scanne le workspace et retourne un tableau de ProjectRecord.
 * @returns {ProjectRecord[]}
 */
function scannerWorkspace() {
  return fs.readdirSync(WORKSPACE, { withFileTypes: true })
    .filter(e => e.isDirectory() && !DOSSIERS_EXCLUS.has(e.name) && !e.name.startsWith('.'))
    .map(e => {
      const chemin = path.join(WORKSPACE, e.name);
      const hasGit = fs.existsSync(path.join(chemin, '.git'));

      // Détection multi-stack avec déduplication par nom de stack (D-01, D-02)
      const stacksDetectees = new Map();
      for (const s of SENTINELLES) {
        if (!stacksDetectees.has(s.stack) && fs.existsSync(path.join(chemin, s.fichier))) {
          stacksDetectees.set(s.stack, { stack: s.stack, emoji: s.emoji });
        }
      }
      const stacks = stacksDetectees.size > 0
        ? Array.from(stacksDetectees.values())
        : [{ stack: e.name, emoji: null }]; // D-03 : fallback nom du dossier

      // Extraction données git
      const brancheRaw = hasGit ? gitExec('git rev-parse --abbrev-ref HEAD', chemin) : null;
      const timestampRaw = hasGit ? gitExec('git log -1 --format=%ct', chemin) : null;
      const jours = calculerJours(timestampRaw);
      const branche = brancheRaw || (hasGit ? 'branche inconnue' : null);

      return {
        id:                 e.name,
        nom:                e.name,
        chemin,
        has_git:            hasGit,
        stacks,
        branche,
        jours_depuis_commit: jours,
        date_relative:      hasGit ? joursEnTexte(jours) : 'sans git',
        rayon:              calculerRayon(jours),
        opacite:            calculerOpacite(jours, hasGit),
        has_gsd:            fs.existsSync(path.join(chemin, '.planning')),
      };
    });
}

module.exports = { scannerWorkspace };
