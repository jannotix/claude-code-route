#!/usr/bin/env node
// Emits a MAP.md skeleton for a repository. Structure, sizes, git churn and manifests only.
// No file content reaches the model: the script reads metadata, and prints aggregates.
//
//   node route-map.mjs [root] [--json] [--commits N] [--top N]
//
// Enrich the result one cycle at a time. A full-repository indexing pass is never the answer.

import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, relative, extname, basename, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'out', 'bin', 'obj',
  'vendor', 'target', '.next', '.nuxt', '.venv', 'venv', 'env', '__pycache__',
  'coverage', '.pytest_cache', '.mypy_cache', '.gradle', '.idea', '.vscode',
  'Pods', 'DerivedData', '.terraform', '.cache', 'tmp', '.route',
]);

const SOURCE_EXT = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.py', '.rb',
  '.go', '.rs', '.java', '.kt', '.kts', '.cs', '.php', '.swift', '.scala', '.ex',
  '.exs', '.clj', '.c', '.h', '.cc', '.cpp', '.hpp', '.m', '.mm', '.sql', '.sh',
]);

const MANIFESTS = [
  'package.json', 'pyproject.toml', 'requirements.txt', 'setup.py', 'go.mod',
  'Cargo.toml', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'composer.json',
  'Gemfile', 'mix.exs', 'pubspec.yaml', 'Package.swift',
];

const ENTRY_DIRS = /(^|[\\/])(routes?|controllers?|handlers?|endpoints?|consumers?|listeners?|subscribers?|jobs?|tasks?|workers?|commands?|api|cli|cmd|functions?|lambdas?)([\\/]|$)/i;
const ENTRY_FILES = /^(main|index|app|server|cli|program|entrypoint|__main__|manage|wsgi|asgi)\./i;
const TEST_PATH = /(^|[\\/])(tests?|spec|specs|__tests__|e2e|integration)([\\/]|$)|[._-](test|spec)\.[a-z]+$|^test_/i;
const GENERATED = /\.(g|gen|generated|pb|designer)\.[a-z]+$|_pb2\.pyi?$|\.min\.(js|css)$|(^|[\\/])(migrations?|generated|__generated__|proto_gen)([\\/]|$)/i;
const LOCKFILE = /^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|Gemfile\.lock|Cargo\.lock|composer\.lock|go\.sum)$/;

const MAX_FILES = 200000;

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(argv[i + 1]) || fallback;
};
const asJson = argv.includes('--json');
const commits = flag('commits', 500);
const top = flag('top', 20);
const root = argv.find((a) => !a.startsWith('--') && !/^\d+$/.test(a)) ?? '.';

// --- walk --------------------------------------------------------------------

const files = [];
let truncated = false;

function walk(dir) {
  if (files.length >= MAX_FILES) {
    truncated = true;
    return;
  }
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.github') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(full);
    } else if (e.isFile()) {
      let size = 0;
      try {
        size = statSync(full).size;
      } catch {
        continue;
      }
      files.push({ path: relative(root, full).split(sep).join('/'), size, name: e.name });
    }
  }
}

walk(root);

const source = files.filter((f) => SOURCE_EXT.has(extname(f.path)));
const tests = source.filter((f) => TEST_PATH.test(f.path));
const kb = (n) => `${Math.round(n / 1024)} KB`;

// --- modules -----------------------------------------------------------------

const moduleOf = (p) => {
  const parts = p.split('/');
  if (parts.length === 1) return '(root)';
  if (['src', 'lib', 'app', 'packages', 'apps', 'services', 'internal', 'pkg'].includes(parts[0]) && parts.length > 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
};

const modules = new Map();
for (const f of source) {
  const m = moduleOf(f.path);
  const e = modules.get(m) ?? { name: m, files: 0, bytes: 0, tests: 0 };
  e.files += 1;
  e.bytes += f.size;
  if (TEST_PATH.test(f.path)) e.tests += 1;
  modules.set(m, e);
}
const moduleRows = [...modules.values()].sort((a, b) => b.bytes - a.bytes);

// --- git churn ---------------------------------------------------------------

function churn() {
  try {
    const out = execFileSync('git', ['-C', root, 'log', '--format=', '--name-only', '-n', String(commits)], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const counts = new Map();
    for (const line of out.split('\n')) {
      const p = line.trim();
      if (!p || !SOURCE_EXT.has(extname(p))) continue;
      if (TEST_PATH.test(p)) continue;
      // git reports build output the walk skipped; churn on a generated file is noise.
      if (p.split('/').some((seg) => SKIP_DIRS.has(seg))) continue;
      counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([path, changes]) => ({ path, changes }))
      .sort((a, b) => b.changes - a.changes)
      .slice(0, top);
  } catch {
    return null;
  }
}

const hot = churn();

// --- candidates --------------------------------------------------------------

const entryPoints = source
  .filter((f) => ENTRY_FILES.test(basename(f.path)) || ENTRY_DIRS.test(f.path))
  .filter((f) => !TEST_PATH.test(f.path))
  .sort((a, b) => b.size - a.size)
  .slice(0, top);

const largest = source
  .filter((f) => !TEST_PATH.test(f.path))
  .sort((a, b) => b.size - a.size)
  .slice(0, 15);

const generated = files.filter((f) => GENERATED.test(f.path) || LOCKFILE.test(f.name)).slice(0, 25);

const manifests = files.filter((f) => MANIFESTS.includes(f.name) && f.path.split('/').length <= 3);

function deps(manifestPath) {
  try {
    if (basename(manifestPath) !== 'package.json') return null;
    const j = JSON.parse(readFileSync(join(root, manifestPath), 'utf8'));
    const d = Object.keys(j.dependencies ?? {}).length;
    const dev = Object.keys(j.devDependencies ?? {}).length;
    return `${d} direct, ${dev} dev`;
  } catch {
    return null;
  }
}

let revision = 'unknown';
try {
  revision = execFileSync('git', ['-C', root, 'rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
} catch {
  // not a git repository; entries carry no revision
}

// --- output ------------------------------------------------------------------

if (asJson) {
  process.stdout.write(JSON.stringify(
    { revision, truncated, totals: { files: files.length, source: source.length, tests: tests.length },
      modules: moduleRows, hot, entryPoints, largest, generated, manifests },
    null, 2) + '\n');
  process.exit(0);
}

const out = [];
const w = (s = '') => out.push(s);

w('# Repository map');
w();
w('Generated skeleton. Structure, sizes, change frequency and manifests only — no behaviour was');
w('read. Every row below is a **candidate**, not a fact: confirm one by reading the range it points');
w('at before relying on it.');
w();
w(`Revision: \`${revision}\``);
w(`Source files: ${source.length} (${tests.length} test) · ${kb(source.reduce((a, f) => a + f.size, 0))}`);
if (truncated) w(`**Truncated** at ${MAX_FILES} files. Narrow the root and run again.`);
w();
w('Enrich this one cycle at a time. Replace a candidate row with a confirmed `path:line` and a');
w('symbol as each cycle surveys the area it touches. A full-repository indexing pass is never run.');
w();

w('## Modules');
w();
w('| Module | Source files | Size | Tests | Test ratio |');
w('| --- | --- | --- | --- | --- |');
for (const m of moduleRows.slice(0, 30)) {
  const nonTest = m.files - m.tests;
  const ratio = nonTest === 0 ? '—' : (m.tests / nonTest).toFixed(2);
  w(`| \`${m.name}\` | ${m.files} | ${kb(m.bytes)} | ${m.tests} | ${ratio} |`);
}
w();
w('A module with a test ratio near zero is where an executed proof will be hardest to produce.');
w();

if (hot && hot.length) {
  w(`## Hot paths — last ${commits} commits`);
  w();
  w('Change frequency is the free priority signal: these are the files most work lands in, so they');
  w('are the ones worth a confirmed seam entry first.');
  w();
  w('| Changes | Path |');
  w('| --- | --- |');
  for (const h of hot) w(`| ${h.changes} | \`${h.path}\` |`);
  w();
} else {
  w('## Hot paths');
  w();
  w('No git history available. Prioritise by module size instead, and record seams as cycles touch them.');
  w();
}

w('## Entry point candidates');
w();
w('Matched by filename and directory convention. Confirm the handler and record `path:line`.');
w();
w('| Path | Size |');
w('| --- | --- |');
for (const e of entryPoints) w(`| \`${e.path}\` | ${kb(e.size)} |`);
w();

w('## Largest source files');
w();
w('Size alone is not a defect. A file far above its module\'s median is a god-object candidate and a');
w('likely place for a rule that was never placed.');
w();
w('| Path | Size |');
w('| --- | --- |');
for (const l of largest) w(`| \`${l.path}\` | ${kb(l.size)} |`);
w();

w('## Manifests');
w();
if (manifests.length) {
  w('| Path | Dependencies |');
  w('| --- | --- |');
  for (const m of manifests) w(`| \`${m.path}\` | ${deps(m.path) ?? '—'} |`);
} else {
  w('None found at depth 3 or above.');
}
w();

w('## Landmine candidates');
w();
if (generated.length) {
  w('Generated output, migrations and lockfiles. Confirm which are hand-edited before treating any as');
  w('off limits.');
  w();
  w('| Path |');
  w('| --- |');
  for (const g of generated) w(`| \`${g.path}\` |`);
} else {
  w('None matched by convention.');
}
w();

w('---');
w();
w('## Seams');
w();
w('Where to edit to change a behaviour. Empty until cycles fill it, and the section that pays for');
w('this file.');
w();
w('| Behaviour | Owner | Verified |');
w('| --- | --- | --- |');
w();
w('## Language');
w();
w('| Term | Meaning | Symbol | Context |');
w('| --- | --- | --- | --- |');
w();
w('## Invariant owners');
w();
w('| Invariant | Statement | Owner | Verified |');
w('| --- | --- | --- | --- |');
w();

process.stdout.write(out.join('\n') + '\n');
