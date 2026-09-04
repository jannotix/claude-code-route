// Internal tests for scripts/route-lint.mjs and scripts/route-map.mjs. Not part of the skill.
//   node route-lint.test.mjs

import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const scripts = join(here, '..', 'skills', 'claude-code-route', 'scripts');
const lint = join(scripts, 'route-lint.mjs');
const map = join(scripts, 'route-map.mjs');
const history = join(scripts, 'route-history.mjs');
const fixture = (name) => join(here, 'fixtures', name);

function run(script, args, cwd) {
  // stderr is piped, not inherited: a script that reports a refusal there would otherwise
  // print into the test output and be invisible to the assertion.
  const opts = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], cwd };
  try {
    return { code: 0, out: execFileSync(process.execPath, [script, ...args], opts), err: '' };
  } catch (e) {
    return { code: e.status, out: e.stdout ?? '', err: e.stderr ?? '' };
  }
}

// route-lint reads route.config.json from the working directory, which is the point of the
// file. A test that asserts the built-in defaults must therefore say where it is standing:
// run from `production/`, this suite used to report 140/141 while the plan recorded 141.
const NO_CONFIG = mkdtempSync(join(tmpdir(), 'route-noconfig-'));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  process.stdout.write(`${ok ? 'pass' : 'FAIL'}  ${name}${ok || !detail ? '' : `\n      ${detail}`}\n`);
};

// A plan that satisfies every gate produces nothing at all.
{
  const r = run(lint, [fixture('clean'), '--json']);
  const j = JSON.parse(r.out);
  check('clean plan exits 0', r.code === 0, `exit ${r.code}`);
  check('clean plan has no errors', j.errors.length === 0, JSON.stringify(j.errors));
  check('clean plan has no warnings', j.warnings.length === 0, JSON.stringify(j.warnings));
}

// Each defect surfaces under its own code.
{
  const r = run(lint, [fixture('broken'), '--json']);
  const j = JSON.parse(r.out);
  const codes = j.errors.map((f) => f.code).concat(j.warnings.map((f) => f.code));
  const has = (c) => codes.includes(c);
  const all = codes.join(',');

  check('broken plan exits 1', r.code === 1, `exit ${r.code}`);
  check('missing Request detected', has('request-missing'), all);
  check('missing depth detected', has('depth-missing'), all);
  check('duplicate id detected', has('id-duplicate'), all);
  check('requirement without criteria detected', has('req-no-criteria'), all);
  check('orphan criterion detected', has('criteria-orphan'), all);
  check('unmeasured NFR detected', has('nfr-no-measurement'), all);
  check('missing scope detected', has('scope-undeclared'), all);
  check('missing out-of-scope detected', has('scope-open'), all);
}

// The Plan gate: every requirement has a home.
{
  const j = JSON.parse(run(lint, [fixture('broken'), '--json']).out);
  const codes = j.errors.map((f) => f.code);
  const has = (c) => codes.includes(c);
  const all = codes.join(',');

  check('unplaced requirement detected', has('req-unplaced'), all);
  check('placement without a home detected', has('placement-no-home'), all);
  check('placement without a layer detected', has('placement-no-layer'), all);
  check('requirement placed twice detected', has('placement-duplicate'), all);
  check('placement for undefined requirement detected',
    j.warnings.some((f) => f.code === 'placement-orphan'), all);
}

// The Review gate: nothing closes on a read.
{
  const j = JSON.parse(run(lint, [fixture('broken'), '--json']).out);
  const notExecuted = j.errors.filter((f) => f.code === 'proof-not-executed');
  const codes = j.errors.map((f) => f.code).join(',');

  check('proof by inspection rejected',
    notExecuted.some((f) => f.message.includes('REQ-002')), JSON.stringify(notExecuted));
  check('proof by opinion rejected',
    notExecuted.some((f) => f.message.includes('REQ-003')), JSON.stringify(notExecuted));
  check('proof naming no command rejected',
    notExecuted.some((f) => f.message.includes('REQ-004')), JSON.stringify(notExecuted));
  check('unproven requirement detected', codes.includes('req-unproven'), codes);
  check('unnamed gap detected', codes.includes('gap-unnamed'), codes);
  check('empty proof cell detected', codes.includes('proof-empty'), codes);
  check('finding acted on without verification detected', codes.includes('finding-unverified'), codes);
}

// Comment voice over a source tree. The corpus is written here rather than shipped: as
// tests/fixtures/src/sample.js it was a file full of deliberate defects inside the published tree,
// and the gate reported them against the product's own NFR-001. Same assertions, same line numbers,
// nothing defective in the artifact.
{
  const dir = mkdtempSync(join(tmpdir(), 'route-voice-'));
  const NL = String.fromCharCode(10);
  writeFileSync(join(dir, 'sample.js'), [
    '// ===============================',
    '// Loop through the items',
    '// TODO: handle errors',
    '// TODO(#412): handle the empty-body case',
    '// Step 1: validate the payload',
    '// const legacy = buildThing();',
    '// Vendor returns 200 with an empty body on rate limit, so status alone is not enough. (REQ-014)',
    '// Perch\u00e9 questo \u00e8 cos\u00ec \u00e8 gi\u00e0 spiegato altrove, non in inglese',
    '// Ship it \u{1F680} looks good',
    '// from somewhere inside the file, which is prose and not code',
    '// print into the test output, which is prose too',
    'export const noop = () => {};',
  ].join(NL), 'utf8');

  const j = JSON.parse(run(lint, [fixture('clean'), dir, '--json']).out);
  const all = j.errors.concat(j.warnings);
  const at = (code) => all.filter((f) => f.code === code).map((f) => f.line);

  check('banner comment flagged', at('comment-banner').includes(1), JSON.stringify(all));
  check('unowned TODO flagged', at('comment-task-unowned').includes(3), JSON.stringify(at('comment-task-unowned')));
  check('referenced TODO not flagged', !at('comment-task-unowned').includes(4), JSON.stringify(at('comment-task-unowned')));
  check('step narration flagged', at('comment-narration').includes(5), JSON.stringify(at('comment-narration')));
  check('commented-out code flagged', at('comment-commented-code').includes(6), JSON.stringify(at('comment-commented-code')));
  check('useful comment not flagged', !all.some((f) => f.line === 7), JSON.stringify(all.filter((f) => f.line === 7)));
  check('non-English comment flagged', at('comment-language').includes(8), JSON.stringify(at('comment-language')));
  check('emoji comment flagged', at('comment-emoji').includes(9), JSON.stringify(at('comment-emoji')));

  // Round 7: prose opening on a keyword was read as commented-out code, twice on this project's
  // own tree. A keyword counts only alongside a character code has and prose does not.
  check('prose beginning with a keyword is not commented-out code',
    !at('comment-commented-code').includes(10) && !at('comment-commented-code').includes(11),
    JSON.stringify(at('comment-commented-code')));

  check('--no-comments suppresses them',
    JSON.parse(run(lint, [fixture('clean'), dir, '--json', '--no-comments']).out)
      .warnings.filter((f) => f.code.startsWith('comment-')).length === 0);

  rmSync(dir, { recursive: true, force: true });
}

// Missing artifacts fail closed.
{
  const r = run(lint, [fixture('nowhere'), '--json']);
  const j = JSON.parse(r.out);
  check('missing PLAN.md fails', r.code === 1 && j.errors.some((f) => f.code === 'plan-missing'), r.out);
}

// A plan is complete before a proof exists, so the stage decides which gate is checked.
{
  const planOnly = fixture('plan-stage');
  const atPlan = run(lint, [planOnly, '--stage', 'plan', '--json']);
  const atReview = run(lint, [planOnly, '--json']);

  check('plan stage passes a plan with no proof yet',
    atPlan.code === 0 && JSON.parse(atPlan.out).errors.length === 0, atPlan.out);
  check('review stage rejects the same plan',
    atReview.code === 1 && JSON.parse(atReview.out).errors.some((f) => f.code === 'proof-missing'),
    atReview.out);
  check('stage is reported back', JSON.parse(atPlan.out).stage === 'plan');
  check('review is the default stage', JSON.parse(atReview.out).stage === 'review');

  const bad = run(lint, [planOnly, '--stage', 'nonsense']);
  check('an unknown stage is refused, exit 2', bad.code === 2, `exit ${bad.code}`);
}

// Layer names belong to the project, not to this script.
{
  const planOnly = fixture('plan-stage');
  const theirs = run(lint, [planOnly, '--stage', 'plan', '--layers', 'core,usecase,adapter', '--json']);
  const j = JSON.parse(theirs.out);

  check('a project layer set replaces the defaults',
    j.layers.join() === 'core,usecase,adapter', JSON.stringify(j.layers));
  check('the default layer names then fail',
    j.errors.some((f) => f.code === 'placement-no-layer'), JSON.stringify(j.errors));
  const noConfig = run(lint, [planOnly, '--stage', 'plan', '--json'], NO_CONFIG);
  check('defaults still apply where no config sets them',
    JSON.parse(noConfig.out).layers.length === 4, noConfig.out.slice(0, 200));

  const configured = run(lint, [planOnly, '--stage', 'plan', '--json'],
    join(here, '..'));
  check('a route.config.json in the working directory replaces them',
    JSON.parse(configured.out).layers.join() === 'domain,application',
    JSON.parse(configured.out).layers.join());
}

// The map generator runs on this repository and emits the sections a cycle enriches.
{
  const r = run(map, [join(here, '..'), '--json']);
  const j = JSON.parse(r.out);
  check('map exits 0', r.code === 0, `exit ${r.code}`);
  check('map finds source files', j.totals.source > 0, JSON.stringify(j.totals));
  check('map groups modules', Array.isArray(j.modules) && j.modules.length > 0);

  const md = run(map, [join(here, '..')]).out;
  for (const heading of ['## Modules', '## Entry point candidates', '## Seams', '## Invariant owners']) {
    check(`map emits ${heading}`, md.includes(heading));
  }
  check('map reports a revision or says unknown', /^Revision: `.+`$/m.test(md));
}

// The project history: append-only, hash-chained, and it refuses to record an anonymous actor.
{
  const dir = mkdtempSync(join(tmpdir(), 'route-history-'));
  const log = join(dir, 'HISTORY.jsonl');
  const hist = (args) => run(history, [...args, '--file', log]);
  const entries = () => readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

  const first = hist(['append', '--event', 'cycle.planned', '--model', 'claude-opus-5',
    '--slug', 'credit-notes', '--depth', 'Standard', '--role', 'planner',
    '--req', 'REQ-001,REQ-002', '--operator', 'Tester <t@example.com>', '--ts', '2026-08-29T10:00:00+02:00']);
  check('history append exits 0', first.code === 0, first.out);

  hist(['append', '--event', 'cycle.executed', '--model', 'claude-opus-5', '--slug', 'credit-notes',
    '--role', 'executor', '--operator', 'Tester <t@example.com>', '--ts', '2026-08-29T10:05:00+02:00']);
  hist(['append', '--event', 'cycle.reviewed', '--model', 'claude-opus-5', '--slug', 'credit-notes',
    '--role', 'reviewer', '--round', '1', '--reviewer', 'codex', '--verdict', 'delivered',
    '--confirmed', '2', '--refuted', '1', '--operator', 'Tester <t@example.com>', '--ts', '2026-08-29T10:20:00+02:00']);

  const rows = entries();
  check('history records three entries', rows.length === 3, String(rows.length));
  check('history numbers entries in order', rows.map((e) => e.seq).join() === '1,2,3');
  check('history records the model', rows[0].actor.model === 'claude-opus-5', JSON.stringify(rows[0].actor));
  check('history records the operator', rows[0].actor.operator === 'Tester <t@example.com>');
  check('history records a timestamp with an offset', /\+02:00$/.test(rows[0].ts), rows[0].ts);
  check('history keeps structured cycle fields',
    rows[2].cycle.verdict === 'delivered' && rows[2].cycle.confirmed === 2, JSON.stringify(rows[2].cycle));
  check('history drops empty fields', rows[1].change.requirements === undefined, JSON.stringify(rows[1].change));
  check('history links each entry to the one before it',
    rows[0].prev === undefined && rows[1].prev === rows[0].hash && rows[2].prev === rows[1].hash);

  check('history verify accepts an intact chain', hist(['verify']).code === 0, hist(['verify']).out);

  const anonymous = hist(['append', '--event', 'cycle.planned']);
  check('history refuses an entry with no model', anonymous.code === 2, `exit ${anonymous.code}`);

  const rendered = hist(['render']).out;
  check('history render summarises by model', rendered.includes('## Who') && rendered.includes('claude-opus-5'));
  check('history render lists the log', rendered.includes('cycle.reviewed'));

  writeFileSync(log, readFileSync(log, 'utf8').replace('"executor"', '"planner"'), 'utf8');
  const tampered = hist(['verify']);
  check('history verify detects an edited entry',
    tampered.code === 1 && tampered.out.includes('does not match its hash'), tampered.out);

  rmSync(dir, { recursive: true, force: true });
}

// The runtime floor is declared once and refuses clearly below it. A guard inside the module cannot
// help under Node 14, where the module does not parse; this covers the range where it can.
{
  const dir = mkdtempSync(join(tmpdir(), 'route-floor-'));
  const probe = join(dir, 'probe.mjs');
  writeFileSync(probe, [
    "Object.defineProperty(process.versions, 'node', { value: '16.20.2', configurable: true });",
    "await import(process.argv[2]);",
  ].join('\n'), 'utf8');

  // Round 7: the placement said one declaration in a shared preamble; there are three copies.
  // A fourth file for six lines would cost more than it saves, so the copies stay and this asserts
  // they agree -- and that the README declares the same number.
  const floors = ['route-lint', 'route-map', 'route-history'].map((n) => {
    const src = readFileSync(join(scripts, `${n}.mjs`), 'utf8');
    return (src.match(/const REQUIRED_NODE_MAJOR = (\d+)/) || [])[1];
  });
  check('every script declares the same floor',
    new Set(floors).size === 1 && floors[0] === '18', floors.join());

  const declared = readFileSync(join(here, '..', 'README.md'), 'utf8');
  check('the README declares the floor the scripts enforce', /Node 18/.test(declared));

  for (const name of ['route-lint', 'route-map', 'route-history']) {
    const url = pathToFileURL(join(scripts, `${name}.mjs`)).href;
    const r = run(probe, [url]);
    check(`${name} refuses an older runtime by name, exit 2`,
      r.code === 2 && r.err.includes('needs Node 18'), `exit ${r.code}: ${r.err.trim()}`);
  }

  rmSync(dir, { recursive: true, force: true });
}

// The operator can decline to be recorded. The history is committed and often published, so the
// identity it carries leaves the machine that wrote it.
{
  const dir = mkdtempSync(join(tmpdir(), 'route-history-id-'));
  const log = join(dir, 'HISTORY.jsonl');
  const base = ['append', '--file', log, '--model', 'm', '--operator', 'Test Person <t@example.com>'];

  run(history, [...base, '--event', 'cycle.planned']);
  run(history, [...base, '--event', 'cycle.executed', '--no-operator']);

  const rows = readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

  check('an operator is recorded by default',
    rows[0].actor.operator === 'Test Person <t@example.com>', JSON.stringify(rows[0].actor));
  check('--no-operator omits the field entirely',
    !('operator' in rows[1].actor), JSON.stringify(rows[1].actor));
  check('the chain verifies with the field omitted',
    run(history, ['verify', '--file', log]).code === 0);

  rmSync(dir, { recursive: true, force: true });
}

// A lock somebody else holds is refused loudly, and the refusal is the documented exit.
{
  const dir = mkdtempSync(join(tmpdir(), 'route-history-held-'));
  const log = join(dir, 'HISTORY.jsonl');
  mkdirSync(`${log}.lock`);

  const r = run(history, ['append', '--file', log, '--event', 'cycle.planned',
    '--model', 'm', '--operator', 'ci', '--ts', '2026-01-01T00:00:00+00:00']);

  check('a held lock exits 3, not 1', r.code === 3, `exit ${r.code}: ${r.out}`);
  check('a held lock says which file is held', /is held/.test(r.err), r.err);

  rmSync(dir, { recursive: true, force: true });
}

// An append is read-then-write, so simultaneous appends must not interleave.
{
  const dir = mkdtempSync(join(tmpdir(), 'route-history-race-'));
  const log = join(dir, 'HISTORY.jsonl');
  const WRITERS = 12;

  const spawned = Array.from({ length: WRITERS }, (_, i) =>
    spawn(process.execPath, [
      history, 'append', '--file', log, '--event', 'cycle.planned',
      '--model', `m${i}`, '--operator', 'ci', '--ts', '2026-01-01T00:00:00+00:00',
    ], { stdio: 'ignore' }));

  const exitCodes = await Promise.all(spawned.map((p) => new Promise((r) => p.on('exit', r))));

  const rows = readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const seqs = rows.map((e) => e.seq);
  const expected = Array.from({ length: rows.length }, (_, i) => i + 1);

  // The contract is not "every writer wins": a writer that cannot take the lock within its
  // timeout exits 3 and says so, which is the promise. What must never happen is a landed
  // entry with a duplicated or skipped sequence, or a broken chain.
  check('no sequence number is duplicated or skipped among the entries that landed',
    seqs.join() === expected.join(), seqs.join());
  check('the chain survives concurrent appends',
    run(history, ['verify', '--file', log]).code === 0);
  check('no lock directory is left behind',
    !readdirSync(dir).some((n) => n.endsWith('.lock')), readdirSync(dir).join());
  check('a writer that gave up did so loudly, not silently',
    rows.length === WRITERS || exitCodes.every((c) => c === 0 || c === 3),
    `${rows.length} of ${WRITERS} landed, exits ${exitCodes.join()}`);

  // Round 6 found this failing about one writer in 250: Windows raises EPERM, not EEXIST,
  // when two processes touch the lock directory at the same instant, and the catch treated
  // it as fatal. The writer crashed with exit 1, losing its append, where the contract
  // promises a loud 3.
  check('no writer failed outside the contract',
    exitCodes.every((c) => c === 0 || c === 3), `exits ${exitCodes.join()}`);

  rmSync(dir, { recursive: true, force: true });
}

// Three false negatives found by the R4 cycle. Before the fix this fixture produced zero errors:
// the checker reported clean while both gates were violated.
{
  const j = JSON.parse(run(lint, [fixture('false-negatives'), '--json']).out);
  const errors = j.errors;
  const has = (code, needle) =>
    errors.some((f) => f.code === code && (!needle || f.message.includes(needle)));

  check('an NFR with no home is reported', has('req-unplaced', 'NFR-001'),
    JSON.stringify(errors));
  check('a proof of `checked` is rejected', has('proof-not-executed', 'REQ-001'),
    JSON.stringify(errors));
  check('a proof naming a test is accepted', !has('proof-not-executed', 'REQ-002'),
    JSON.stringify(errors));
  check('a proof naming a command with arguments is accepted',
    !has('proof-not-executed', 'NFR-001'), JSON.stringify(errors));
  check('a findings table with no Verified column is reported', has('findings-no-verified'),
    JSON.stringify(errors));
  check('the fixture produces exactly the three defects', errors.length === 3,
    errors.map((f) => f.code).join());
}

// REQ-004: whitespace alone does not make a command. `a b` is two words.
{
  const dir = mkdtempSync(join(tmpdir(), 'route-exec-'));
  const plan = (proof) => `# Probe

Depth: Standard

## Request

Probing the executable predicate.

## Requirements

REQ-001  A thing must happen.
  AC-001.1  Given a When b Then c

## Placement

| REQ | Rule | Home | Layer |
| --- | --- | --- | --- |
| REQ-001 | the rule | \`Thing.doIt\` | domain |

## Scope

src/

## Out of scope

- Everything else.

## Proof

| Requirement | Proof | Result |
| --- | --- | --- |
| REQ-001 | \`${proof}\` | pass |
`;

  const closes = (proof) => {
    writeFileSync(join(dir, 'PLAN.md'), plan(proof), 'utf8');
    return !JSON.parse(run(lint, [dir, '--json']).out)
      .errors.some((f) => f.code === 'proof-not-executed');
  };

  // A named runner, with or without arguments, or a span the author marked with `$`.
  const accepted = ['pytest', 'pytest tests/x.py::t', 'npm test', 'make check', 'cargo test',
    'go test ./...', 'dotnet test', 'node --check route-lint.mjs', 'mvn verify',
    'psql -f check.sql', 'k6 run load.js', 'docker compose up -d', 'python scripts/bench.py --rps 50',
    '$ mytool check', '$ ./bin/verify --all', '$ scripts/bench.py --rps 50',
    // Round 4: a length floor of three characters refused every two-letter runner.
    'go', 'py', 'sh run.sh', 'ab -n 10 http://x', '$ /bin/true',
    // Round 5: a path whose name contains a judgement word is still a path.
    'pytest tests/reviewed/test.py::t', 'python3.12 -m pytest', 'npm test -- --ci'];
  const rejected = ['checked', 'a b', 'looks good', 'all green', 'it works', 'two words',
    'manual check', 'e.g. checked', 'i.e. verified', 'done', 'verified', 'ok', 'passes',
    'reviewed it', 'seems right', 'README.md', 'pass/fail', '$ # comment only',
    './mytool check', 'scripts/bench.py --rps 50',
    // Round 4: a word boundary let a filename match the runner it starts with, and the
    // marker accepted punctuation as a program.
    'go.mod', 'maker check', 'npmfoo test', '$ && checked', '$ | grep x',
    // Round 5: redirection is not a program, and a version is digits and dots in the
    // shape a version has.
    '$ 2>out', '$ >out', 'python...', 'python.', '$ (echo hi)',
    // Round 6: the metacharacter set was invented at the keyboard and let every glob
    // through, and the version pattern made its digits optional.
    '$ foo*', '$ fo?o', '$ foo[bar]', '$ foo{a,b}', 'python.1'];

  const wrongAccept = accepted.filter((c) => !closes(c));
  const wrongReject = rejected.filter((c) => closes(c));

  check('every real command closes a requirement', wrongAccept.length === 0, wrongAccept.join(' | '));
  check('no bare phrase closes a requirement', wrongReject.length === 0, wrongReject.join(' | '));
  check('two bare words are refused', !closes('a b'));
  check('a dotted abbreviation is refused', !closes('e.g. checked'));
  check('the $ prefix accepts an unknown runner', closes('$ mytool check'));
  check('the probe covers 59 spans', accepted.length + rejected.length === 59,
    String(accepted.length + rejected.length));
  check('a filename is not a command', !closes('README.md'));
  check('a marker followed by a comment marks nothing', !closes('$ # comment only'));
  check('a runner needs no argument', closes('pytest'));
  check('an unknown program needs the marker',
    !closes('./mytool check') && closes('$ ./mytool check'));
  check('a two-letter runner is a runner', closes('go') && closes('py'));
  check('a filename that starts with a runner is not one', !closes('go.mod'));
  check('a program that merely starts with a runner is not one',
    !closes('maker check') && !closes('npmfoo test'));
  check('the marker needs a program, not an operator',
    !closes('$ && checked') && !closes('$ | grep x'));
  check('an absolute path is a program, not a comment', closes('$ /bin/true'));
  check('redirection is not a program', !closes('$ 2>out') && !closes('$ >out'));
  check('a malformed version is not a runner', !closes('python...') && !closes('python.'));
  check('a real version is', closes('python3.12 -m pytest'));
  check('a glob is a pattern, not a program',
    !closes('$ foo*') && !closes('$ fo?o') && !closes('$ foo[bar]') && !closes('$ foo{a,b}'));
  check('a version needs its digits', !closes('python.1'));
  // Round 7: a code span is a fence of N backticks. Matching one each side truncated a
  // two-backtick span at its inner backtick, so `$ foo`bar` was accepted as `$ foo` --
  // with the very character AC-005.6 forbids removed by the scanner itself.
  {
    const BT = String.fromCharCode(96);
    const fenced = (payload) => BT + BT + payload + BT + BT;
    const closesRaw = (span) => {
      writeFileSync(join(dir, 'PLAN.md'), plan(span), 'utf8');
      return !JSON.parse(run(lint, [dir, '--json']).out)
        .errors.some((f) => f.code === 'proof-not-executed');
    };
    check('a fenced span carrying a backtick does not close a requirement',
      !closesRaw(fenced('$ foo' + BT + 'bar')));
    check('a fenced span still closes on a real command',
      closesRaw(fenced('pytest tests/x.py::t')));
  }
  check('a judgement word inside a path does not make the proof prose',
    closes('pytest tests/reviewed/test.py::t'));

  rmSync(dir, { recursive: true, force: true });
}

// Findings-table shape. Both of these were false negatives until the second adversarial round.
{
  const dir = mkdtempSync(join(tmpdir(), 'route-findings-'));
  const plan = (findings) => `# P

Depth: Standard

## Request

probe

## Requirements

REQ-001  A thing must happen.
  AC-001.1  Given a When b Then c

## Placement

| REQ | Rule | Home | Layer |
| --- | --- | --- | --- |
| REQ-001 | r | \`T.d\` | domain |

## Scope

src/

## Out of scope

- x

${findings}

## Proof

| Requirement | Proof | Result |
| --- | --- | --- |
| REQ-001 | \`pytest tests/x.py::t\` | pass |
`;
  const codes = (findings) => {
    writeFileSync(join(dir, 'PLAN.md'), plan(findings), 'utf8');
    const j = JSON.parse(run(lint, [dir, '--json']).out);
    return j.errors.concat(j.warnings).map((f) => f.code);
  };

  const trap = codes(`## Findings

| # | Class | Severity | Summary | Unverified reason | Verified | Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | DEFECT | MAJOR | thing | reviewer unavailable | - | fixed |`);
  check('a lookalike header does not answer for Verified', trap.includes('finding-unverified'),
    trap.join());

  const filled = codes(`## Findings

| # | Class | Severity | Summary | Unverified reason | Verified | Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | DEFECT | MAJOR | thing | reviewer unavailable | confirmed by \`pytest tests/y.py::t\` | fixed |`);
  check('a lookalike header alongside a filled Verified cell passes',
    !filled.some((c) => c.startsWith('finding')), filled.join());

  const open = codes(`## Findings

| # | Class | Severity | Summary | Verified |
| --- | --- | --- | --- | --- |
| 1 | DEFECT | MAJOR | still open | confirmed by \`pytest tests/y.py::t\` |`);
  check('a table with no Outcome column is reported once, as its own defect',
    open.filter((c) => c === 'findings-no-outcome').length === 1
      && !open.includes('finding-unverified'), open.join());

  const qualified = codes(`## Findings

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 1 | DEFECT | MAJOR | thing | - | fixed under REQ-004 |`);
  check('an outcome qualified by a requirement still counts as acted on',
    qualified.includes('finding-unverified'), qualified.join());

  const three = codes(`## Findings

| # | Summary | Outcome |
| --- | --- | --- |
| 1 | thing | fixed |`);
  check('a three-column table is not read as empty',
    three.includes('findings-no-verified'), three.join());

  const threeVerified = codes(`## Findings

| # | Summary | Verified |
| --- | --- | --- |
| 1 | thing | confirmed by \`pytest tests/y.py::t\` |`);
  check('a three-column table that cannot record an outcome is reported as that',
    threeVerified.filter((c) => c === 'findings-no-outcome').length === 1,
    threeVerified.join());

  const alias = codes(`## Findings

| # | Class | Severity | Summary | Verified | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | DEFECT | MAJOR | thing | - | fixed |`);
  check('Result does not answer for Outcome',
    alias.includes('findings-no-outcome'), alias.join());

  rmSync(dir, { recursive: true, force: true });
}

// An invariant names its owner where it is stated, not in the Placement table.
{
  const dir = mkdtempSync(join(tmpdir(), 'route-inv-'));
  const plan = (inv) => `# P

Depth: Standard

## Request

probe

## Requirements

REQ-001  A thing must happen.
  AC-001.1  Given a When b Then c

## Invariants

${inv}

## Placement

| REQ | Rule | Home | Layer |
| --- | --- | --- | --- |
| REQ-001 | r | \`T.d\` | domain |

## Scope

src/

## Out of scope

- x
`;
  const codes = (inv) => {
    writeFileSync(join(dir, 'PLAN.md'), plan(inv), 'utf8');
    const j = JSON.parse(run(lint, [dir, '--stage', 'plan', '--json']).out);
    return j.errors.concat(j.warnings).map((f) => f.code);
  };

  check('an invariant with no owner is reported',
    codes('INV-001  Something must always hold.').includes('invariant-unowned'));
  check('an invariant with an owner is not',
    !codes('INV-001  Something must always hold.  Owner: `Thing`').includes('invariant-unowned'));
  check('a template placeholder is not an owner',
    codes('INV-001  Something must always hold.  Owner: <symbol>').includes('invariant-unowned'));
  for (const dash of ['-', '—', '...']) {
    check(`an owner of "${dash}" is no owner`,
      codes(`INV-001  Something must always hold.  Owner: ${dash}`).includes('invariant-unowned'));
  }
  check('two owners are reported',
    codes('INV-001  Something must always hold.  Owner: `A`, `B`')
      .includes('invariant-two-owners'));
  for (const sep of [' / ', ' & ', ' and ', ' AND ']) {
    check(`a separator of "${sep.trim()}" is two owners`,
      codes(`INV-001  Something must always hold.  Owner: A${sep}B`)
        .includes('invariant-two-owners'));
  }
  check('a dotted symbol is one owner',
    !codes('INV-001  Something must always hold.  Owner: `Order.applyDiscount`')
      .includes('invariant-two-owners'));
  // Found by writing the release plan: an owner that is a file path was refused, because the
  // separator set matched a slash anywhere rather than a slash between words.
  for (const path of ['.claude-plugin/plugin.json', 'src/billing/money.py']) {
    check(`an owner of "${path}" is one owner`,
      !codes(`INV-001  Something must always hold.  Owner: \`${path}\``)
        .includes('invariant-two-owners'));
  }

  rmSync(dir, { recursive: true, force: true });
}

// The eval suite cannot be executed here (the runner is in early access), so what is checkable
// without it is checked: the cases are well formed and every file they reference exists.
{
  const evalsDir = join(here, '..', 'evals');
  const manifest = JSON.parse(readFileSync(
    join(here, '..', '.claude-plugin', 'plugin.json'), 'utf8'));

  check('the manifest points at the eval directory',
    manifest.experimental?.evals === 'evals', JSON.stringify(manifest.experimental));

  const cases = readdirSync(evalsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  // Three, not four: `comment-voice` was retired in September 2026 after three prompt and
  // grader designs failed to separate the arms. The floor is a floor, not a target.
  check('the suite has cases', cases.length >= 3, cases.join());

  const names = [];
  for (const c of cases) {
    const dir = join(evalsDir, c);
    const casePath = join(dir, 'case.yaml');
    const promptPath = join(dir, 'prompt.md');

    if (!existsSync(casePath) || !existsSync(promptPath)) {
      check(`${c} has case.yaml and prompt.md`, false, dir);
      continue;
    }
    const yaml = readFileSync(casePath, 'utf8');
    const name = yaml.match(/^name:\s*(\S+)\s*$/m)?.[1];
    names.push(name);

    check(`${c}: name matches its directory`, name === c, `${name} vs ${c}`);
    check(`${c}: declares runs and a description`,
      /^runs:\s*\d+\s*$/m.test(yaml) && /^description:\s*\S/m.test(yaml));
    check(`${c}: prompt is not empty`, readFileSync(promptPath, 'utf8').trim().length > 40);

    const referenced = [...yaml.matchAll(/^\s*-\s*file:\s*(\S+)\s*$/gm)].map((m) => m[1]);
    check(`${c}: declares at least two graders`, referenced.length >= 2, referenced.join());

    const missing = referenced.filter((f) => !existsSync(join(dir, f)));
    check(`${c}: every referenced grader exists`, missing.length === 0, missing.join());

    const orphans = existsSync(join(dir, 'graders'))
      ? readdirSync(join(dir, 'graders')).filter((f) => !referenced.includes(`graders/${f}`))
      : [];
    check(`${c}: no grader file is unreferenced`, orphans.length === 0, orphans.join());

    for (const g of referenced.filter((f) => existsSync(join(dir, f)))) {
      const body = readFileSync(join(dir, g), 'utf8');
      check(`${c}/${g}: states both a 1 and a 0 condition`,
        /score 1 if/i.test(body) && /score 0 if/i.test(body));
    }
  }

  check('case names are unique', new Set(names).size === names.length, names.join());
}

const failed = results.filter((r) => !r.ok);
process.stdout.write(`\n${results.length - failed.length}/${results.length} passed\n`);
process.exit(failed.length > 0 ? 1 : 0);
