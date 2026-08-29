#!/usr/bin/env node
// Append-only project history: who did what to this project, when, with which model.
// Each entry carries the hash of the one before it, so a rewritten past is detectable.
//
//   route-history.mjs append --event <name> --model <id> [field ...]
//   route-history.mjs render [--limit N]
//   route-history.mjs verify
//   route-history.mjs tail [N]
//
// Entries are never edited. A correction is a new entry. Exit 1 on a broken chain.

import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const DEFAULT_FILE = 'docs/route/HISTORY.jsonl';

const KNOWN_EVENTS = new Set([
  'cycle.planned', 'cycle.executed', 'cycle.reviewed', 'cycle.repaired',
  'cycle.delivered', 'cycle.blocked', 'cycle.cancelled',
  'plan.revised', 'assumption.recorded', 'finding.refuted',
  'decision.recorded', 'map.updated', 'project.initialised',
]);

// --- helpers -----------------------------------------------------------------

const argv = process.argv.slice(2);
const command = argv[0] ?? 'render';

function opt(name, fallback = null) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1 || i + 1 >= argv.length) return fallback;
  const v = argv[i + 1];
  return v.startsWith('--') ? fallback : v;
}

const list = (name) => {
  const v = opt(name);
  return v === null ? [] : v.split(',').map((s) => s.trim()).filter(Boolean);
};

const file = opt('file', DEFAULT_FILE);

function git(args, fallback = null) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function localIso(d) {
  const pad = (n, w = 2) => String(Math.abs(n)).padStart(w, '0');
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
}

const digest = (entry) => {
  const { hash, ...rest } = entry;
  void hash;
  return 'sha256:' + createHash('sha256').update(JSON.stringify(rest)).digest('hex');
};

function read() {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((l, i) => ({ raw: l.trim(), line: i + 1 }))
    .filter((l) => l.raw !== '')
    .map((l) => {
      try {
        return { ...l, entry: JSON.parse(l.raw) };
      } catch {
        return { ...l, entry: null };
      }
    });
}

const prune = (o) => {
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'object' && !Array.isArray(v)) {
      const inner = prune(v);
      if (Object.keys(inner).length) out[k] = inner;
    } else {
      out[k] = v;
    }
  }
  return out;
};

// --- append ------------------------------------------------------------------

function append() {
  const event = opt('event');
  const model = opt('model');

  if (!event) fail('append needs --event (for example cycle.reviewed)');
  if (!model) fail('append needs --model: the history records which model acted, not that "an agent" did');
  if (!KNOWN_EVENTS.has(event)) {
    process.stderr.write(`warn: "${event}" is not a known event name; recording it anyway\n`);
  }

  const lines = read();
  const previous = lines.length ? lines[lines.length - 1].entry : null;

  // Key order is the hash input, so it is fixed here rather than left to the caller.
  const entry = prune({
    seq: lines.length + 1,
    ts: opt('ts', localIso(new Date())),
    event,
    actor: {
      model,
      harness: opt('harness', 'claude-code'),
      operator: opt('operator', operatorFromGit()),
    },
    change: {
      slug: opt('slug'),
      depth: opt('depth'),
      plan: opt('plan'),
      requirements: list('req'),
      scope: list('scope'),
    },
    cycle: {
      role: opt('role'),
      round: opt('round') === null ? null : Number(opt('round')),
      reviewer: opt('reviewer'),
      verdict: opt('verdict'),
      confirmed: opt('confirmed') === null ? null : Number(opt('confirmed')),
      refuted: opt('refuted') === null ? null : Number(opt('refuted')),
      discarded: opt('discarded') === null ? null : Number(opt('discarded')),
    },
    note: opt('note'),
    revision: opt('revision', git(['rev-parse', '--short', 'HEAD'])),
    prev: previous ? previous.hash ?? null : null,
  });

  entry.hash = digest(entry);

  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(entry) + '\n', 'utf8');
  process.stdout.write(`${file}: #${entry.seq} ${entry.event} ${entry.ts}\n`);
}

function operatorFromGit() {
  const name = git(['config', 'user.name']);
  const email = git(['config', 'user.email']);
  if (name && email) return `${name} <${email}>`;
  return name ?? email;
}

// --- verify ------------------------------------------------------------------

function verify() {
  const lines = read();
  if (!lines.length) {
    process.stdout.write(`${file}: empty\n`);
    return 0;
  }
  let broken = 0;
  let previousHash = null;

  for (const { entry, line } of lines) {
    if (entry === null) {
      process.stdout.write(`ERROR  ${file}:${line}  unparseable entry\n`);
      broken += 1;
      previousHash = null;
      continue;
    }
    if (digest(entry) !== entry.hash) {
      process.stdout.write(`ERROR  ${file}:${line}  #${entry.seq} content does not match its hash\n`);
      broken += 1;
    }
    if ((entry.prev ?? null) !== previousHash) {
      process.stdout.write(`ERROR  ${file}:${line}  #${entry.seq} does not link to the entry before it\n`);
      broken += 1;
    }
    previousHash = entry.hash ?? null;
  }

  process.stdout.write(`\n${lines.length} entries, ${broken} break(s)\n`);
  return broken === 0 ? 0 : 1;
}

// --- render ------------------------------------------------------------------

function render() {
  const lines = read().map((l) => l.entry).filter(Boolean);
  if (!lines.length) {
    process.stdout.write('# Project history\n\nNo entries yet.\n');
    return 0;
  }
  const limit = Number(opt('limit', '0')) || 0;
  const shown = limit > 0 ? lines.slice(-limit) : lines;

  const out = [];
  out.push('# Project history');
  out.push('');
  out.push(`${lines.length} entries. Append-only: an entry is never edited, and a correction is a`);
  out.push('new entry. Each carries the hash of the one before it — run `route-history.mjs verify`.');
  out.push('');
  out.push(`First: ${lines[0].ts} · Last: ${lines[lines.length - 1].ts}`);
  out.push('');

  const models = new Map();
  const operators = new Map();
  for (const e of lines) {
    const m = e.actor?.model ?? 'unknown';
    const o = e.actor?.operator ?? 'unknown';
    models.set(m, (models.get(m) ?? 0) + 1);
    operators.set(o, (operators.get(o) ?? 0) + 1);
  }
  out.push('## Who');
  out.push('');
  out.push('| Model | Entries |');
  out.push('| --- | --- |');
  for (const [m, n] of [...models].sort((a, b) => b[1] - a[1])) out.push(`| \`${m}\` | ${n} |`);
  out.push('');
  out.push('| Operator | Entries |');
  out.push('| --- | --- |');
  for (const [o, n] of [...operators].sort((a, b) => b[1] - a[1])) out.push(`| ${o} | ${n} |`);
  out.push('');

  out.push(`## Log${limit > 0 ? ` — last ${shown.length}` : ''}`);
  out.push('');
  out.push('| # | When | Event | Model | Change | Detail | Revision |');
  out.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const e of shown) {
    const detail = [
      e.cycle?.role,
      e.cycle?.round ? `round ${e.cycle.round}` : null,
      e.cycle?.reviewer ? `reviewer ${e.cycle.reviewer}` : null,
      e.cycle?.verdict,
      e.cycle?.confirmed !== undefined ? `${e.cycle.confirmed} confirmed` : null,
      e.cycle?.refuted !== undefined ? `${e.cycle.refuted} refuted` : null,
      e.note,
    ].filter(Boolean).join(' · ');
    out.push(`| ${e.seq} | ${e.ts} | \`${e.event}\` | \`${e.actor?.model ?? '—'}\` | ` +
      `${e.change?.slug ?? '—'}${e.change?.depth ? ` (${e.change.depth})` : ''} | ${detail || '—'} | ` +
      `${e.revision ? `\`${e.revision}\`` : '—'} |`);
  }
  out.push('');
  process.stdout.write(out.join('\n') + '\n');
  return 0;
}

function tail() {
  const n = Number(argv[1]) || 10;
  for (const { raw } of read().slice(-n)) process.stdout.write(raw + '\n');
  return 0;
}

function fail(message) {
  process.stderr.write(`route-history: ${message}\n`);
  process.exit(2);
}

switch (command) {
  case 'append': append(); process.exit(0); break;
  case 'verify': process.exit(verify()); break;
  case 'render': process.exit(render()); break;
  case 'tail': process.exit(tail()); break;
  default:
    fail(`unknown command "${command}". Use append, render, verify or tail.`);
}
