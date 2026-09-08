// Seven wrong figures across two releases were all in prose. Round 15 answered with a check that read
// each round summary against its table; rounds 16 and 17 found nine ways past that reader, so the
// counts are generated from the table instead and the check is a byte comparison. (REQ-008)
//
// Round 18 then found the generator asserting something the table does not say: it called every
// non-refuted row execution-confirmed, and seventeen rows across the two plans say "by reading". A
// generator is safer than a reader only for what the data actually carries. How a finding was checked
// is read from its own cell now, and a row that does not say is counted and named rather than
// assumed.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// An opening fence may carry an info string; a closing fence carries nothing but its own delimiter,
// at least as long. Round 17 closed a four-backtick fence with three; round 18 closed one with a
// three-backtick line that had code after it.
const OPEN_FENCE = /^\s*(`{3,}|~{3,})/;
const closesFence = (line, open) => {
  const m = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
  return m !== null && m[1][0] === open[0] && m[1].length >= open.length;
};

// A table is a header naming its columns and a separator under it, not a line that looks like a row.
const SEPARATOR = /^\s*\|[\s:|-]+\|\s*$/;
// A `\|` inside a cell is an escaped pipe, not a boundary. Splitting on it shifted every column
// after it, which round 18 used to make a refuted row look confirmed.
const cells = (line) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '')
  .split(/(?<!\\)\|/).map((c) => c.trim());
// `**MAJOR**` is the same severity as `MAJOR`; the emphasis is markup, not a different word.
const plain = (cell) => cell.replace(/[*`_]/g, '').trim();

export function roundSections(text) {
  const lines = text.split('\n');
  const out = [];
  let cur = null;
  let fence = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (fence !== null) { if (closesFence(line, fence)) fence = null; continue; }
    const f = OPEN_FENCE.exec(line);
    if (f) { fence = f[1]; continue; }
    const h = /^##\s+Round\s+(\d+)\b/.exec(line);
    if (h) {
      if (cur) out.push(cur);
      cur = {
        round: h[1], heading: i, rows: [], blockers: 0, executed: 0, read: 0, refuted: 0,
        unstated: [], bad: [], tableLines: new Set(),
      };
      continue;
    }
    if (/^##\s/.test(line)) { if (cur) out.push(cur); cur = null; continue; }
    if (!cur) continue;

    // Columns are located by name, so a table may carry any columns in any order as long as it names
    // the two this counts.
    if (!/^\s*\|/.test(line) || !SEPARATOR.test(lines[i + 1] ?? '')) continue;
    const head = cells(line).map((c) => plain(c).toLowerCase());
    const id = head.indexOf('#');
    const sev = head.indexOf('severity');
    const ver = head.indexOf('verified');
    if (id === -1 || sev === -1) continue;
    // Round 19: the stray check skipped every pipe-prefixed line, so `| There were 99 findings. |`
    // was invisible. Only the lines of a table this actually parsed are exempt.
    cur.tableLines.add(i).add(i + 1);
    let j = i + 2;
    for (; j < lines.length && /^\s*\|/.test(lines[j]); j += 1) {
      const c = cells(lines[j]);
      const ident = plain(c[id] ?? '');
      // A row inside this round's table that carries no id, or one already used, is not something to
      // pass over in silence: round 18 made both undercount and double-count without a word.
      if (ident === '') { cur.bad.push(`a row with no id in the table of round ${cur.round}`); continue; }
      if (!new RegExp(`^\\d+\\.\\d+$`).test(ident)) continue;
      if (!ident.startsWith(`${cur.round}.`)) continue;
      if (cur.rows.includes(ident)) { cur.bad.push(`${ident} appears more than once`); continue; }
      cur.tableLines.add(j);
      cur.rows.push(ident);
      if (plain(c[sev] ?? '').toUpperCase() === 'BLOCKER') cur.blockers += 1;
      // How a finding was checked is what its own cell says, and only where the cell says it: a
      // Verified cell that mentions `refuted` while describing a defect is not a refuted row. Round
      // 18's own table made this generator report one, which is `grep -c BLOCKER` in another costume.
      // Round 19: treating everything that was not "by reading" as execution left the false claim
      // generatable — `confirmed by inspection` came out as execution. Only wording that says
      // execution counts as execution; anything else is unstated and named.
      const v = plain(c[ver] ?? '');
      if (/^refuted\b/i.test(v)) cur.refuted += 1;
      else if (/^confirmed by reading\b/i.test(v)) cur.read += 1;
      else if (/^confirmed(?::|\s+by\s+(?:execut|running|runn))/i.test(v)) cur.executed += 1;
      else cur.unstated.push(ident);
    }
    i = j - 1;
  }
  if (cur) out.push(cur);
  return out;
}

// The one line that carries a round's numbers. Nothing else in a round section may state a count.
export function countsLine(s) {
  const n = s.rows.length;
  const plural = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
  const parts = [plural(n, 'finding'), `${s.blockers} BLOCKER`, `${s.executed} confirmed by execution`];
  if (s.read) parts.push(`${s.read} by reading`);
  if (s.unstated.length) parts.push(`${s.unstated.length} not saying which`);
  parts.push(`${s.refuted} refuted`);
  return `> ${parts.join(', ')}. Generated from the table below by \`.github/round-counts.mjs\`.`;
}

const GENERATED = /Generated from the table below/;

// Returns the file with every round's counts line present and correct. Idempotent by construction.
export function rewrite(text) {
  const lines = text.split('\n');
  const out = [];
  const marks = new Map(roundSections(text).map((s) => [s.heading, s]));
  for (let i = 0; i < lines.length; i += 1) {
    out.push(lines[i]);
    const s = marks.get(i);
    if (!s) continue;
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j += 1;
    const existing = (lines[j] ?? '').startsWith('> ') && GENERATED.test(lines[j] ?? '');
    out.push('');
    out.push(countsLine(s));
    if (existing) {
      i = j;
      if ((lines[i + 1] ?? '').trim() !== '') out.push('');
    } else {
      out.push('');
      while (i + 1 < lines.length && lines[i + 1].trim() === '') i += 1;
    }
  }
  return out.join('\n');
}

// One place, enforced. A number left in the prose of a round section is a second statement of a
// count, and a second statement is a second thing to keep true.
const TEENS = 'ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen';
const TENS = 'twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety';
const ONES = 'zero|one|two|three|four|five|six|seven|eight|nine';
// Round 19: the list stopped at twenty-one, so "Thirty findings remained." was invisible.
const WORD = `(?:${TENS})(?:[- ](?:${ONES}))?|${TEENS}|${ONES}|[0-9]+`;
// Round 18 allowed only eight qualifiers, so "2 serious findings" got past; any two words may stand
// between the number and the noun now. `finding 7.1` is still not a count, because the number there
// follows the noun and a decimal identifier is not a count word.
// The lookbehind is what keeps `16.8 is the finding` out: the fraction of an identifier reads as a
// number of its own, which is how the widened grammar took four identifiers for counts.
const STRAY = new RegExp(
  `(?<![\\d.])\\b(?!\\d+\\.\\d)(?:${WORD})\\s+(?:\\w+[- ]){0,2}(?:findings?|BLOCKERs?)\\b`, 'i');

export function strayCounts(text) {
  const lines = text.split('\n');
  const bad = [];
  const sections = roundSections(text);
  const starts = new Map(sections.map((s) => [s.heading, s.round]));
  const inTable = new Set(sections.flatMap((s) => [...s.tableLines]));
  let round = null;
  let fence = null;
  let seenGenerated = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (fence !== null) { if (closesFence(line, fence)) fence = null; continue; }
    const f = OPEN_FENCE.exec(line);
    if (f) { fence = f[1]; continue; }
    if (starts.has(i)) { round = starts.get(i); seenGenerated = false; continue; }
    if (/^##\s/.test(line)) { round = null; continue; }
    if (round === null) continue;
    if (line.startsWith('> ') && GENERATED.test(line)) {
      // Only the first is the generated line. Round 18 hid `> 99 findings ... Generated from the
      // table below.` further down the section, and the exemption swallowed it.
      if (!seenGenerated) { seenGenerated = true; continue; }
      bad.push(`round ${round}, line ${i + 1}: a second generated line`);
      continue;
    }
    if (inTable.has(i)) continue;
    // A figure quoted from somewhere else — a published tag object, an aggregate across rounds — is
    // not this round stating its own count. The exemption is a visible marker, so `git grep quoted`
    // lists every one of them, and a line that carries it is a line somebody chose to exempt.
    if (/<!-- quoted -->\s*$/.test(line)) continue;
    if (STRAY.test(line)) {
      bad.push(`round ${round}, line ${i + 1}: a count in prose — ${line.trim().slice(0, 72)}`);
    }
  }
  for (const s of sections) for (const b of s.bad) bad.push(`round ${s.round}: ${b}`);
  return bad;
}

export function plans(root) {
  const dir = join(root, 'docs', 'route', 'plans');
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, 'PLAN.md')))
    .map((e) => join(dir, e.name, 'PLAN.md'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const write = process.argv.includes('--write');
  const root = process.argv.find((a, i) => i > 1 && !a.startsWith('--')) ?? '.';
  let stale = 0;
  let stray = 0;
  for (const file of plans(root)) {
    const text = readFileSync(file, 'utf8');
    const want = rewrite(text);
    const rounds = roundSections(text);
    process.stdout.write(`${file}: ${rounds.length} round section(s)\n`);
    for (const s of rounds) process.stdout.write(`  round ${s.round}: ${countsLine(s).slice(2)}\n`);
    if (want !== text) {
      stale += 1;
      if (write) { writeFileSync(file, want, 'utf8'); process.stdout.write('  rewritten\n'); }
      else process.stderr.write(`  ${file} does not carry the counts its tables produce\n`);
    }
    for (const s of strayCounts(write ? want : text)) {
      stray += 1;
      process.stderr.write(`  ${s}\n`);
    }
  }
  if (stray) {
    process.stderr.write(`${stray} count(s) stated outside the generated line\n`);
    process.exit(1);
  }
  if (stale && !write) {
    process.stderr.write(`${stale} plan(s) stale; run with --write\n`);
    process.exit(1);
  }
  if (!stale) process.stdout.write('every round carries the counts its table produces, and states none elsewhere\n');
}
