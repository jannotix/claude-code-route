#!/usr/bin/env node
// Deterministic checks for a route plan and for comment voice. No model calls, no dependencies.
//
//   node route-lint.mjs <planDir|PLAN.md> [sourcePath ...] [--json] [--no-comments]
//
// Enforces the two properties the cycle exists for: every requirement has a home, and every
// requirement closes on something that was executed. Exit 1 on error, 0 on warnings only.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, basename, sep } from 'node:path';

const ID_DEF = /^\s{0,3}(REQ|NFR|INV|ASSUMPTION)-(\d{1,4})\b/;
const ID_ANY = /\b(REQ|NFR|INV|ASSUMPTION)-(\d{1,4})\b/;
const AC_ANY = /\bAC-(\d{1,4})\.(\d{1,3})\b/g;
const LAYERS = ['domain', 'application', 'infrastructure', 'interface'];

// A proof cell that reads like judgement rather than execution. Nothing closes on a read.
const PROSE_PROOF = /\b(by inspection|inspected|reviewed|code review|looks? (correct|right|fine)|should work|seems? (correct|fine)|obvious|trivial|self[- ]evident|verified visually|no test needed|n\/a)\b/i;

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'vendor', 'target',
  '.next', '.venv', 'venv', '__pycache__', 'coverage',
]);

const SOURCE_EXT = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.py', '.rb', '.go', '.rs',
  '.java', '.kt', '.cs', '.php', '.swift', '.scala', '.sql', '.sh', '.c',
  '.h', '.cc', '.cpp', '.hpp', '.css', '.scss',
]);

const findings = [];
const report = (level, file, line, code, message) =>
  findings.push({ level, file, line, code, message });

const norm = (kind, n) => `${kind}-${String(n).padStart(3, '0')}`;

// --- markdown ----------------------------------------------------------------

function section(text, heading) {
  const lines = text.split('\n');
  const want = heading.toLowerCase();
  const start = lines.findIndex((l) => {
    const m = l.match(/^#{1,3}\s+(.*?)\s*$/);
    // Trailing qualifiers only: a spaced dash. "Non-functional" keeps its hyphen.
    return m !== null && m[1].toLowerCase().replace(/\s+[-—]\s+.*$/, '').trim() === want;
  });
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^#{1,3}\s/.test(l));
  const body = (end === -1 ? rest : rest.slice(0, end)).join('\n');
  return { body, offset: start + 2 };
}

function hasContent(sec) {
  if (sec === null) return false;
  return sec.body.split('\n').some((l) => {
    const t = l.trim();
    return t !== '' && !/^<.*>$/.test(t) && !/^\|?\s*-{2,}/.test(t);
  });
}

// Rows of the first markdown table in a section, header and separator dropped.
function tableRows(sec) {
  if (sec === null) return [];
  const rows = [];
  sec.body.split('\n').forEach((raw, i) => {
    const t = raw.trim();
    if (!t.startsWith('|')) return;
    if (/^\|[\s:|-]*\|?$/.test(t)) return;
    const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    rows.push({ cells, line: sec.offset + i });
  });
  return rows.length ? rows.slice(1) : rows;
}

const isPlaceholder = (s) => s === '' || /^<.*>$/.test(s) || s === '—' || s === '-' || s === '...';

// --- plan --------------------------------------------------------------------

function checkPlan(planPath) {
  const text = readFileSync(planPath, 'utf8');

  if (!/^\s*Depth:\s*(Light|Standard|Guarded)\s*$/im.test(text)) {
    report('warn', planPath, 1, 'depth-missing',
      'No "Depth: Light|Standard|Guarded" line; depth decides which gates apply');
  }
  if (!hasContent(section(text, 'Request'))) {
    report('error', planPath, 1, 'request-missing',
      'No Request section; WRONG-PLAN findings are judged against the original request verbatim');
  }

  // Definitions live only in the Plan sections. A Gaps line restating REQ-003 is a reference,
  // not a second definition.
  const defs = new Map();
  for (const heading of ['Requirements', 'Non-functional requirements', 'Invariants', 'Assumptions']) {
    const sec = section(text, heading);
    if (sec === null) continue;
    sec.body.split('\n').forEach((raw, i) => {
      const m = raw.match(ID_DEF);
      if (!m) return;
      const id = norm(m[1], m[2]);
      const line = sec.offset + i;
      const e = defs.get(id);
      if (e) e.lines.push(line);
      else defs.set(id, { id, kind: m[1], line, lines: [line], text: raw.trim() });
    });
  }

  const acs = new Set();
  for (const m of text.matchAll(AC_ANY)) acs.add(m[1].padStart(3, '0'));

  for (const d of defs.values()) {
    if (d.lines.length > 1) {
      report('error', planPath, d.line, 'id-duplicate',
        `${d.id} is defined on lines ${d.lines.join(', ')}`);
    }
    if (d.kind === 'REQ' && !acs.has(d.id.slice(4))) {
      report('error', planPath, d.line, 'req-no-criteria',
        `${d.id} has no acceptance criterion (expected AC-${d.id.slice(4)}.n)`);
    }
    if (d.kind === 'NFR' && !/\d/.test(d.text.replace(/^\s*NFR-\d+/, ''))) {
      report('warn', planPath, d.line, 'nfr-no-measurement',
        `${d.id} carries no number; a requirement without a measurement cannot fail`);
    }
  }
  for (const ac of acs) {
    if (!defs.has(`REQ-${ac}`)) {
      report('error', planPath, 1, 'criteria-orphan', `AC-${ac}.n has no matching REQ-${ac}`);
    }
  }

  const reqs = [...defs.values()].filter((d) => d.kind === 'REQ' || d.kind === 'NFR');

  if (!hasContent(section(text, 'Scope'))) {
    report('warn', planPath, 1, 'scope-undeclared',
      'No Scope section; the paths the Executor may write are undeclared');
  }
  if (!hasContent(section(text, 'Out of scope'))) {
    report('warn', planPath, 1, 'scope-open',
      'Out of scope is missing or empty; nothing refuses scope creep later');
  }

  checkPlacement(planPath, text, defs);
  checkFindings(planPath, text);
  checkProof(planPath, text, reqs);
}

// Every requirement has a home. This is the Plan gate.
function checkPlacement(planPath, text, defs) {
  const sec = section(text, 'Placement');
  const placed = new Map();

  for (const row of tableRows(sec)) {
    const [idCell, , homeCell, layerCell] = row.cells;
    if (idCell === undefined || isPlaceholder(idCell)) continue;
    const m = idCell.match(ID_ANY);
    if (!m) continue;
    const id = norm(m[1], m[2]);

    if (placed.has(id)) {
      report('error', planPath, row.line, 'placement-duplicate',
        `${id} is placed twice; a rule with two homes is enforced twice and drifts`);
      continue;
    }
    placed.set(id, row);

    if (homeCell === undefined || isPlaceholder(homeCell)) {
      report('error', planPath, row.line, 'placement-no-home',
        `${id} has no home symbol; it will land in whichever file was open`);
    }
    const layer = (layerCell ?? '').toLowerCase();
    if (!LAYERS.some((l) => layer.includes(l))) {
      report('error', planPath, row.line, 'placement-no-layer',
        `${id} names no layer (${LAYERS.join(', ')})`);
    }
    if (!defs.has(id)) {
      report('warn', planPath, row.line, 'placement-orphan',
        `${id} is placed but not defined in Requirements`);
    }
  }

  for (const d of defs.values()) {
    if (d.kind !== 'REQ') continue;
    if (!placed.has(d.id)) {
      report('error', planPath, d.line, 'req-unplaced',
        `${d.id} has no row in Placement; a rule with no named home is not planned`);
    }
  }
}

// A finding acted on without running its verification step is a code change that fixed nothing.
function checkFindings(planPath, text) {
  const sec = section(text, 'Findings');
  if (sec === null) return;
  for (const row of tableRows(sec)) {
    const cells = row.cells;
    if (cells.length < 6) continue;
    const [, cls, , summary, verified, outcome] = cells;
    if (isPlaceholder(summary)) continue;
    if (/^noise$/i.test(cls ?? '')) continue;
    if (/^(fixed|confirmed)$/i.test(outcome ?? '') && isPlaceholder(verified)) {
      report('error', planPath, row.line, 'finding-unverified',
        'A finding was acted on with no verification step recorded; a finding is a claim, not a truth');
    }
  }
}

// Every requirement closes on something that was executed. This is the Review gate.
function checkProof(planPath, text, reqs) {
  const sec = section(text, 'Proof');
  if (sec === null) {
    if (reqs.length) {
      report('error', planPath, 1, 'proof-missing',
        'No Proof section; no requirement closes without evidence');
    }
    return;
  }

  const proven = new Map();
  let anyGap = false;

  for (const row of tableRows(sec)) {
    const [idCell, proofCell, resultCell] = row.cells;
    if (idCell === undefined || isPlaceholder(idCell)) continue;
    const m = idCell.match(ID_ANY);
    if (!m) continue;
    const id = norm(m[1], m[2]);
    proven.set(id, row);

    const proof = proofCell ?? '';
    const result = (resultCell ?? '').toLowerCase();

    if (/gap/.test(result) || isPlaceholder(proof)) {
      if (/gap/.test(result)) anyGap = true;
      else {
        report('error', planPath, row.line, 'proof-empty',
          `${id} has an empty proof cell and is not marked as a gap`);
      }
      continue;
    }
    if (PROSE_PROOF.test(proof)) {
      report('error', planPath, row.line, 'proof-not-executed',
        `${id} closes on judgement, not execution: "${proof.slice(0, 60)}"`);
      continue;
    }
    if (!/`[^`]{3,}`/.test(proof)) {
      report('error', planPath, row.line, 'proof-not-executed',
        `${id} names no command or test that ran; nothing closes on a read`);
    }
  }

  for (const d of reqs) {
    if (!proven.has(d.id)) {
      report('error', planPath, d.line, 'req-unproven',
        `${d.id} is specified but appears nowhere in Proof`);
    }
  }
  for (const id of proven.keys()) {
    if (!reqs.some((d) => d.id === id) && !id.startsWith('INV-')) {
      report('warn', planPath, proven.get(id).line, 'proof-orphan',
        `${id} is proven but not defined in Requirements`);
    }
  }
  if (anyGap && !hasContent(section(text, 'Gaps'))) {
    report('error', planPath, 1, 'gap-unnamed',
      'A gap is recorded in the table but the Gaps section is empty; an unnamed gap is a claim');
  }
}

// --- comment voice -----------------------------------------------------------

const NON_LATIN = /[Ͱ-ϿЀ-ӿ֐-׿؀-ۿ぀-ヿ一-鿿가-힯]/;
const ACCENTED = /[À-ɏ]/g;
const EMOJI = /[←-⇿☀-➿⬀-⯿️]|[\ud83c-\ud83e][\udc00-\udfff]/;
const BANNER = /([=\-*#_~])\1{4,}/;
const CODE_LIKE = /^(if|for|while|return|def|function|const|let|var|import|from|class|public|private|await|async|print|console)\b|[;{}]\s*$/;
const STEP = /^(step\s*\d+\b|\d+[.)]\s+\w)/i;
const TASK = /\b(TODO|FIXME|HACK|XXX)\b/;
const TASK_REFERENCED = /(#\d+|[A-Z]{2,}-\d+|@\w+|https?:\/\/)/;

function commentBody(line) {
  const t = line.trim();
  if (/^#!/.test(t)) return null;
  if (/^#\s*(include|define|pragma|ifdef|ifndef|endif|type:|noqa|pylint|ruff)/.test(t)) return null;
  let m;
  if ((m = t.match(/^\/\/+\s?(.*)$/))) return m[1];
  if ((m = t.match(/^#+\s?(.*)$/))) return m[1];
  if ((m = t.match(/^--\s?(.*)$/))) return m[1];
  if ((m = t.match(/^\/\*+\s?(.*?)(\*\/)?\s*$/))) return m[1];
  if ((m = t.match(/^\*\s?(.*?)(\*\/)?\s*$/))) return m[1];
  if ((m = t.match(/^<!--\s?(.*?)(-->)?\s*$/))) return m[1];
  return null;
}

function checkComments(file) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return;
  }
  if (text.indexOf('\u0000') !== -1) return;

  text.split('\n').forEach((raw, i) => {
    const body = commentBody(raw);
    if (body === null) return;
    const n = i + 1;
    const trimmed = body.trim();

    if (BANNER.test(trimmed)) {
      report('warn', file, n, 'comment-banner',
        'Banner comment; a file that needs sections needs splitting');
      return;
    }
    if (!trimmed) return;
    if (EMOJI.test(trimmed)) {
      report('warn', file, n, 'comment-emoji', 'Emoji in a comment');
    }
    if (TASK.test(trimmed) && !TASK_REFERENCED.test(trimmed)) {
      report('error', file, n, 'comment-task-unowned',
        'TODO/FIXME with no ticket, requirement or owner; it will never be done');
    }
    if (CODE_LIKE.test(trimmed)) {
      report('warn', file, n, 'comment-commented-code',
        'Looks like commented-out code; version control is the archive');
    }
    if (STEP.test(trimmed)) {
      report('warn', file, n, 'comment-narration',
        'Step narration; extract the steps into named functions');
    }
    if (NON_LATIN.test(trimmed) || (trimmed.match(ACCENTED) || []).length >= 3) {
      report('warn', file, n, 'comment-language', 'Comment may not be in English');
    }
  });
}

function walk(target, out) {
  let st;
  try {
    st = statSync(target);
  } catch {
    return out;
  }
  if (st.isFile()) {
    if (SOURCE_EXT.has(extname(target))) out.push(target);
    return out;
  }
  for (const entry of readdirSync(target)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith('.')) continue;
    walk(join(target, entry), out);
  }
  return out;
}

// --- entry -------------------------------------------------------------------

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const skipComments = argv.includes('--no-comments');
const positional = argv.filter((a) => !a.startsWith('--'));

if (positional.length === 0) {
  process.stderr.write('usage: route-lint.mjs <planDir|PLAN.md> [sourcePath ...] [--json] [--no-comments]\n');
  process.exit(2);
}

const [target, ...sources] = positional;
const planPath = basename(target).toLowerCase() === 'plan.md' ? target : join(target, 'PLAN.md');

if (!existsSync(planPath)) {
  report('error', planPath, 0, 'plan-missing', 'PLAN.md not found');
} else {
  checkPlan(planPath);
}
if (!skipComments) {
  for (const s of sources) for (const f of walk(s, [])) checkComments(f);
}

const errors = findings.filter((f) => f.level === 'error');
const warnings = findings.filter((f) => f.level === 'warn');

if (asJson) {
  process.stdout.write(JSON.stringify({ errors, warnings }, null, 2) + '\n');
} else {
  const here = process.cwd();
  const show = (f) => {
    const p = f.file.startsWith(here) ? relative(here, f.file).split(sep).join('/') : f.file;
    const level = f.level === 'error' ? 'ERROR' : 'warn ';
    process.stdout.write(`${level}  ${p}:${f.line}  ${f.code}  ${f.message}\n`);
  };
  errors.forEach(show);
  warnings.forEach(show);
  process.stdout.write(`\n${errors.length} error(s), ${warnings.length} warning(s)\n`);
}

process.exit(errors.length > 0 ? 1 : 0);
