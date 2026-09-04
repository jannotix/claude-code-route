#!/usr/bin/env node
// Deterministic checks for a route plan and for comment voice. No model calls, no dependencies.
//
//   node route-lint.mjs <planDir|PLAN.md> [sourcePath ...]
//     [--stage plan|execute|review] [--layers a,b,c] [--json] [--no-comments]
//
// Enforces the two properties the cycle exists for: every requirement has a home, and every
// requirement closes on something that was executed. Exit 1 on error, 0 on warnings only.
//
// The stage says which gate is being checked, because a plan is complete before a proof exists.
// Default is review, which checks everything.


// The scripts are plain ESM with no dependencies and use nothing newer than Node 18. This says so
// out loud, because a version error should name the version rather than surface as a stack trace
// raised somewhere inside. It cannot help below Node 14: the module is parsed before any of
// it runs, and the null-coalescing operator is a syntax error there, so no guard here executes.
// requires Node 22, so inside the plugin this check never fires; it is for the scripts run
// standalone, from a project's own CI. (REQ-004, AC-004.2)
const REQUIRED_NODE_MAJOR = 18;
{
  const major = Number(process.versions.node.split('.')[0]);
  if (Number.isFinite(major) && major < REQUIRED_NODE_MAJOR) {
    process.stderr.write(
      `route-lint: needs Node ${REQUIRED_NODE_MAJOR} or newer; this is ${process.versions.node}\n`);
    process.exit(2);
  }
}

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, basename, sep } from 'node:path';

const ID_DEF = /^\s{0,3}(REQ|NFR|INV|ASSUMPTION)-(\d{1,4})\b/;
const ID_ANY = /\b(REQ|NFR|INV|ASSUMPTION)-(\d{1,4})\b/;
const AC_ANY = /\bAC-(\d{1,4})\.(\d{1,3})\b/g;
const DEFAULT_LAYERS = ['domain', 'application', 'infrastructure', 'interface'];
const STAGES = ['plan', 'execute', 'review'];

// A proof cell that reads like judgement rather than execution. Nothing closes on a read.
const PROSE_PROOF = /\b(by inspection|inspected|reviewed|code review|looks? (correct|right|fine)|should work|seems? (correct|fine)|obvious|trivial|self[- ]evident|verified visually|no test needed|n\/a)\b/i;

// Judgement is what the author wrote, not what the command they ran is called:
// `pytest tests/reviewed/test.py::t` is a path, and matching `reviewed` inside it refused a
// real proof. The spans come out before the prose test, and that decision belongs beside the
// pattern rather than in the caller. (REQ-002)
const proseOf = (proof) => proof.replace(/`[^`]*`/g, ' ');

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

// The header cells of the first markdown table in a section.
function tableHeader(sec) {
  if (sec === null) return [];
  for (const raw of sec.body.split('\n')) {
    const t = raw.trim();
    if (!t.startsWith('|') || /^\|[\s:|-]*\|?$/.test(t)) continue;
    return t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim().toLowerCase());
  }
  return [];
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

// No string can prove that something ran. What a string can carry is a command a reader could
// run, and that is the only thing checked here.
//
// Four rounds of inferring execution from shape produced four rounds of false negatives —
// `checked`, then `a b`, then `e.g. checked`, then `README.md` and `pass/fail`. Every repair
// widened the surface for the next one, which is the shape of a requirement that was wrong
// rather than code that was buggy. So the inference is gone. A proof names a program this list
// knows, or the author marks it `$` and takes responsibility. (REQ-002, REQ-004, REQ-005)

const RUNNER = new RegExp('^(' + [
  'pytest', 'python(?:[0-9]+(?:\\.[0-9]+)*)?', 'py', 'tox', 'nox', 'hatch', 'uv', 'poetry', 'pip[0-9]*',
  'node', 'npm', 'npx', 'pnpm', 'yarn', 'deno', 'bun', 'jest', 'vitest', 'mocha', 'tsc',
  'go', 'cargo', 'rustc', 'clippy', 'gofmt', 'gotest',
  'make', 'just', 'task', 'cmake', 'ctest', 'bazel', 'buck', 'ninja', 'meson',
  'mvn', 'gradle', 'gradlew', 'dotnet', 'msbuild', 'nuget',
  'ruby', 'rake', 'bundle', 'rspec', 'php', 'composer', 'phpunit', 'pest',
  'dart', 'flutter', 'swift', 'xcodebuild', 'mix', 'lein', 'sbt', 'stack', 'cabal',
  'bash', 'sh', 'zsh', 'pwsh', 'powershell', 'docker', 'podman', 'kubectl', 'helm',
  'terraform', 'ansible', 'psql', 'mysql', 'sqlite3', 'mongosh', 'redis-cli',
  'curl', 'wget', 'http', 'k6', 'ab', 'wrk', 'hyperfine',
  'eslint', 'ruff', 'mypy', 'black', 'prettier', 'shellcheck', 'golangci-lint',
].join('|') + ')$', 'i');

// A program name opens on a letter, a digit, or a path character. A span opening on a shell
// operator is punctuation the author left behind, not a command they ran: `$ && checked`
// marked nothing. (REQ-005)
const PROGRAM_TOKEN = /^[A-Za-z0-9._~/\\-]/;
// A program name carries no shell metacharacter anywhere in it: redirection, pipes and
// separators, command and process substitution, and the glob characters. `$ 2>out` opens on
// a digit and is redirection; `$ foo*` is a pattern the shell expands, not a program the
// author ran. The set is named in AC-005.6 rather than chosen here. (REQ-005)
const SHELL_META_CHARS = new Set(['<', '>', '|', '&', ';', '(', ')', '$', "`", '*', '?', '{', '}', '[', ']']);
const hasShellMeta = (token) => [...token].some((c) => SHELL_META_CHARS.has(c));
const COMMENT_TOKEN = /^(#|;|\/\/)/;

// The command a span names, or null if it names none.
function commandOf(span) {
  const explicit = /^\$\s/.test(span);
  const body = (explicit ? span.slice(1) : span).trim();
  if (!body) return null;
  const [program, ...args] = body.split(/\s+/);
  // `$ # comment only` marks nothing: the marker must be followed by a program.
  if (!program || COMMENT_TOKEN.test(program) || !PROGRAM_TOKEN.test(program)) return null;
  if (hasShellMeta(program)) return null;
  return { explicit, program, args };
}

function looksExecutable(proof) {
  // No length floor. `go`, `py`, `sh` and `ab` are runners this list names, and a floor of
  // three characters refused every one of them while `go.mod` passed as `go`.
  // A code span is a fence of N backticks closed by N backticks, which is how a span that
  // contains a backtick is written. Matching one backtick each side truncated such a span at
  // its inner backtick, so a marked span whose program held a backtick was accepted with the
  // backtick cut off — the character AC-005.6 forbids. (REQ-005, AC-005.8)
  for (const m of proof.matchAll(/(`+)([^`][\s\S]*?)\1(?!`)/g)) {
    const cmd = commandOf(m[2].trim());
    if (cmd === null) continue;
    if (cmd.explicit) return true;
    if (RUNNER.test(cmd.program)) return true;
  }
  return false;
}

// --- plan --------------------------------------------------------------------

function checkPlan(planPath, stage, layers) {
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
    // An invariant is not placed in the Placement table; it names its owner where it is stated.
    // An unfilled template placeholder is not an owner, and neither is a list of them.
    if (d.kind === 'INV') {
      const owner = (d.text.match(/\bOwner:\s*(.*)$/) ?? [])[1]?.trim() ?? '';
      const named = owner.replace(/`/g, '').trim();
      if (!named || isPlaceholder(named) || named === '?') {
        report('error', planPath, d.line, 'invariant-unowned',
          `${d.id} names no owner; an invariant with none is enforced by convention, which is to say sometimes`);
      // A separator separates: it carries whitespace. `.claude-plugin/plugin.json` and
      // `Order.applyDiscount` are each one name, and refusing them refused correct work,
      // which is the failure mode a gate does not survive twice. (REQ-012, AC-012.2)
      } else if (/,|\s[/&]\s|\s+and\s+/i.test(named)) {
        report('error', planPath, d.line, 'invariant-two-owners',
          `${d.id} names more than one owner; two enforcements of one rule drift apart`);
      }
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

  checkPlacement(planPath, text, defs, layers);

  // A plan is complete before a proof exists. Only the review gate demands both.
  if (stage === 'review') {
    checkFindings(planPath, text);
    checkProof(planPath, text, reqs);
  }
}

// Every requirement has a home. This is the Plan gate.
function checkPlacement(planPath, text, defs, layers) {
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
    if (!layers.some((l) => layer.includes(l.toLowerCase()))) {
      report('error', planPath, row.line, 'placement-no-layer',
        `${id} names no layer (${layers.join(', ')})`);
    }
    if (!defs.has(id)) {
      report('warn', planPath, row.line, 'placement-orphan',
        `${id} is placed but not defined in Requirements`);
    }
  }

  for (const d of defs.values()) {
    if (d.kind !== 'REQ' && d.kind !== 'NFR') continue;
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

  // Locate the columns by header. A table with a column missing or moved must still be
  // checked: skipping it whole is how a finding closes with no verification at all.
  const header = tableHeader(sec);
  // Exact only. A loose match let "Not verified" and "Unverified reason" answer for "verified",
  // which is the column whose emptiness the whole check is about.
  const at = (names) => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i !== -1) return i;
    }
    return -1;
  };
  // One spelling each. The plan says these columns are exact, and accepting `Verification`
  // and `Result` as aliases was the code inventing a vocabulary the plan does not have.
  const iClass = at(['class']);
  const iVerified = at(['verified']);
  const iOutcome = at(['outcome']);

  // A row carries a finding when any cell past the first says something. Keying this off a
  // Summary column index made a three-column table look empty and suppressed every check.
  const rows = tableRows(sec).filter(
    (r) => r.cells.slice(1).some((c) => !isPlaceholder(c)));
  if (rows.length === 0) return;

  // A table that cannot express resolution is malformed once, not once per row: an open
  // finding is not a finding acted on without verification.
  if (iOutcome === -1) {
    report('error', planPath, sec.offset, 'findings-no-outcome',
      'The Findings table has no Outcome column, so no finding in it can be shown as resolved');
    return;
  }
  if (iVerified === -1) {
    report('error', planPath, sec.offset, 'findings-no-verified',
      'The Findings table has no Verified column, so no finding in it can show what confirmed it');
    return;
  }

  for (const row of tableRows(sec)) {
    const cells = row.cells;
    const cls = cells[iClass];
    const verified = cells[iVerified];
    const outcome = cells[iOutcome];

    if (cells.slice(1).every((c) => isPlaceholder(c))) continue;
    if (/^noise$/i.test(cls ?? '')) continue;

    // "fixed under REQ-004" is a finding acted on. Matching the whole cell exactly meant a
    // qualified outcome went unchecked, including every one in this project's own plans.
    if (/^\s*(fixed|confirmed|resolved|done)\b/i.test(outcome ?? '') && isPlaceholder(verified)) {
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
    if (PROSE_PROOF.test(proseOf(proof))) {
      report('error', planPath, row.line, 'proof-not-executed',
        `${id} closes on judgement, not execution: "${proof.slice(0, 60)}"`);
      continue;
    }
    if (!looksExecutable(proof)) {
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
// Commented-out code, not prose that happens to open on a keyword. English sentences begin
// `from somewhere inside...` and `print into the test output...`; neither is code, and both were
// flagged, twice on this project's own tree. A keyword counts only when the line also carries a
// character that code has and prose does not.
const CODE_KEYWORD = /^(if|for|while|return|def|function|const|let|var|import|from|class|public|private|await|async|print|console)\b/;
const CODE_SHAPE = /[(=;{}]/;
const CODE_LIKE = (line) => (CODE_KEYWORD.test(line) && CODE_SHAPE.test(line)) || /[;{}]\s*$/.test(line);
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
    if (CODE_LIKE(trimmed)) {
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

function flag(name) {
  const i = argv.indexOf(`--${name}`);
  if (i === -1 || i + 1 >= argv.length) return null;
  const v = argv[i + 1];
  return v.startsWith('--') ? null : v;
}

// A value consumed by a flag is not a positional argument.
const consumed = new Set();
for (const name of ['stage', 'layers']) {
  const i = argv.indexOf(`--${name}`);
  if (i !== -1 && i + 1 < argv.length && !argv[i + 1].startsWith('--')) consumed.add(i + 1);
}
const positional = argv.filter((a, i) => !a.startsWith('--') && !consumed.has(i));

if (positional.length === 0) {
  process.stderr.write(
    'usage: route-lint.mjs <planDir|PLAN.md> [sourcePath ...] ' +
    '[--stage plan|execute|review] [--layers a,b,c] [--json] [--no-comments]\n');
  process.exit(2);
}

const stage = flag('stage') ?? 'review';
if (!STAGES.includes(stage)) {
  process.stderr.write(`route-lint: unknown stage "${stage}". Use ${STAGES.join(', ')}.\n`);
  process.exit(2);
}

// Layers: the flag, else route.config.json in the working directory, else the four defaults.
function configuredLayers() {
  const fromFlag = flag('layers');
  if (fromFlag) return fromFlag.split(',').map((l) => l.trim()).filter(Boolean);
  try {
    const cfg = JSON.parse(readFileSync('route.config.json', 'utf8'));
    if (Array.isArray(cfg.layers) && cfg.layers.length) return cfg.layers.map(String);
  } catch {
    // No config, or an unreadable one: the defaults stand.
  }
  return DEFAULT_LAYERS;
}
const layers = configuredLayers();

const [target, ...sources] = positional;
const planPath = basename(target).toLowerCase() === 'plan.md' ? target : join(target, 'PLAN.md');

if (!existsSync(planPath)) {
  report('error', planPath, 0, 'plan-missing', 'PLAN.md not found');
} else {
  checkPlan(planPath, stage, layers);
}
if (!skipComments) {
  for (const s of sources) for (const f of walk(s, [])) checkComments(f);
}

const errors = findings.filter((f) => f.level === 'error');
const warnings = findings.filter((f) => f.level === 'warn');

if (asJson) {
  process.stdout.write(JSON.stringify({ stage, layers, errors, warnings }, null, 2) + '\n');
} else {
  const here = process.cwd();
  const show = (f) => {
    const p = f.file.startsWith(here) ? relative(here, f.file).split(sep).join('/') : f.file;
    const level = f.level === 'error' ? 'ERROR' : 'warn ';
    process.stdout.write(`${level}  ${p}:${f.line}  ${f.code}  ${f.message}\n`);
  };
  errors.forEach(show);
  warnings.forEach(show);
  process.stdout.write(`\n${errors.length} error(s), ${warnings.length} warning(s)  [stage: ${stage}]\n`);
}

process.exit(errors.length > 0 ? 1 : 0);
