'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKSPACE = process.env.WORKSPACE || path.resolve(__dirname, '..');
const DOSSIERS_EXCLUS = new Set(['venv', 'node_modules', '.git', 'dist', '__pycache__']);

// Exclure le répertoire courant (map_project lui-même) du scan pour éviter
// qu'il se retrouve comme nœud sur sa propre carte (WR-02).
const NOM_DOSSIER_COURANT = path.basename(__dirname);

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
  const diff = Math.floor((Date.now() / 1000 - ts) / 86400);
  return Math.max(0, diff); // garantir ≥ 0 (horloge déréglée ou timestamp futur)
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
 * Calcule le rayon de la bulle selon les 5 paliers D-02.
 * null (sans git) → 12, 0j → 50, <7j → 40, <30j → 30, <90j → 20, ≥90j → 12
 */
function calculerRayon(jours) {
  if (jours === null) return 12;  // sans git (D-03)
  if (jours === 0)    return 50;
  if (jours < 7)      return 40;
  if (jours < 30)     return 30;
  if (jours < 90)     return 20;
  return 12;
}

/**
 * Calcule l'opacité de la bulle (D-01).
 * Sans git uniquement → 0.4 ; tous les projets avec git → 1.0
 */
function calculerOpacite(jours, hasGit) {
  if (!hasGit || jours === null) return 0.4;  // sans git uniquement (D-01, D-03)
  return 1.0;  // tous les projets avec git ont opacité 1.0
}

/**
 * Lit le statut GSD depuis le fichier STATE.md d'un projet.
 * Retourne le statut (string) ou null si STATE.md absent.
 */
function lireStatutGSD(cheminProjet) {
  const stateFile = path.join(cheminProjet, '.planning', 'STATE.md');
  try {
    const contenu = fs.readFileSync(stateFile, 'utf8');
    const match = contenu.match(/^status:\s*(.+)$/m);
    return match ? match[1].trim() : 'unknown';
  } catch {
    return null;  // pas de STATE.md → anneau tireté (D-05)
  }
}

/**
 * Construit un ProjectRecord pour un répertoire donné.
 * @param {string} chemin - Chemin absolu du projet
 * @param {string} id - Identifiant unique (nom ou parent/nom)
 * @param {string} nom - Nom affiché
 * @returns {object} ProjectRecord enrichi Phase 2
 */
function construireRecord(chemin, id, nom) {
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
    : [{ stack: nom, emoji: null }]; // D-03 : fallback nom du dossier

  // Extraction données git
  const brancheRaw = hasGit ? gitExec('git rev-parse --abbrev-ref HEAD', chemin) : null;
  const timestampRaw = hasGit ? gitExec('git log -1 --format=%ct', chemin) : null;
  const jours = calculerJours(timestampRaw);
  const branche = brancheRaw || (hasGit ? 'branche inconnue' : null);

  // Dernier message de commit (Phase 3 — tooltip INT-01)
  const commitMsgRaw = hasGit ? gitExec('git log -1 --format=%s', chemin) : null;
  const last_commit = commitMsgRaw
    ? commitMsgRaw.slice(0, 60) + (commitMsgRaw.length > 60 ? '…' : '')
    : null;

  // Statut GSD (Phase 2)
  const statutGSD = lireStatutGSD(chemin);

  return {
    id,
    nom,
    chemin,
    has_git:             hasGit,
    stacks,
    branche,
    jours_depuis_commit: jours,
    date_relative:       hasGit ? joursEnTexte(jours) : 'sans git',
    rayon:               calculerRayon(jours),
    opacite:             calculerOpacite(jours, hasGit),
    has_gsd:             fs.existsSync(path.join(chemin, '.planning')),
    has_state:           statutGSD !== null,
    phase_gsd:           statutGSD,
    last_commit,
  };
}

// Cache simple pour éviter que chaque requête HTTP bloque la boucle d'événements
// avec de multiples execSync (WR-01). TTL = 30 secondes.
let _cacheResultats = null;
let _cacheTsMs = 0;
const CACHE_TTL_MS = 30_000;

/** Invalide manuellement le cache (appelé par le watcher à chaque changement). */
function invaliderCache() {
  _cacheResultats = null;
}

/**
 * Scanne le workspace et retourne un tableau de ProjectRecord.
 * Depth 2 : inclut les sous-projets ayant au moins une sentinelle (D-13 à D-16).
 * Le résultat est mis en cache 30 s pour limiter les appels execSync bloquants.
 * @returns {ProjectRecord[]}
 */
function scannerWorkspace() {
  const maintenant = Date.now();
  if (_cacheResultats && (maintenant - _cacheTsMs) < CACHE_TTL_MS) {
    return _cacheResultats;
  }
  const resultats = [];

  const entrees = fs.readdirSync(WORKSPACE, { withFileTypes: true })
    .filter(e => e.isDirectory()
      && !DOSSIERS_EXCLUS.has(e.name)
      && !e.name.startsWith('.')
      && e.name !== NOM_DOSSIER_COURANT  // WR-02 : exclure map_project lui-même
    );

  for (const e of entrees) {
    const chemin = path.join(WORKSPACE, e.name);

    // Projet racine (depth 1)
    resultats.push(construireRecord(chemin, e.name, e.name));

    // Sous-projets (depth 2) — D-13 à D-16
    try {
      const sousEntrees = fs.readdirSync(chemin, { withFileTypes: true })
        .filter(s => s.isDirectory() && !DOSSIERS_EXCLUS.has(s.name) && !s.name.startsWith('.'));

      for (const s of sousEntrees) {
        const sousChemin = path.join(chemin, s.name);
        // D-14 : ignorer les sous-dossiers sans sentinelle
        const aSentinelle = SENTINELLES.some(sent => fs.existsSync(path.join(sousChemin, sent.fichier)));
        if (!aSentinelle) continue;

        // D-15 : identifiant et nom = parent/sous-dossier
        const sousId = `${e.name}/${s.name}`;
        resultats.push(construireRecord(sousChemin, sousId, sousId));
      }
    } catch {
      // Ignorer les erreurs de lecture des sous-dossiers (permissions, etc.)
    }
  }

  _cacheResultats = resultats;
  _cacheTsMs = Date.now();
  return resultats;
}

module.exports = { scannerWorkspace, lireStatutGSD, invaliderCache, WORKSPACE };
