// The check lived inline in the workflow, where the only way to exercise it was to push. Round 8
// found it accepting an empty README, which is existence and not a statement of purpose, and round 9
// found it skipping every dot-directory while `.claude-plugin` and `.github` ship. A module so the
// suite can run it both ways, a CLI so the workflow calls one thing. (REQ-007, AC-007.2)

// Published means tracked, and git is the authority on that: the filesystem also holds `.route`,
// which is ignored and ships to nobody. Round 9 measured the artifact at all 51 tracked files, with
// `.claude-plugin` and `.github` among them, so the dot prefix decides nothing. Outside a
// repository -- a fixture, an unpacked release -- there is no authority to ask and every directory
// but git's own bookkeeping counts.
const UNPUBLISHED = new Set(['.git', 'node_modules']);

export function publishedDirs(root) {
  try {
    const tracked = execFileSync('git', ['ls-files'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const dirs = new Set();
    for (const f of tracked.split('\n')) {
      const i = f.indexOf('/');
      if (i > 0) dirs.add(f.slice(0, i));
    }
    return [...dirs].sort();
  } catch {
    return readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !UNPUBLISHED.has(e.name))
      .map((e) => e.name)
      .sort();
  }
}
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Headings name a directory; they do not say why it ships. Only what is left counts.
export const MIN_PROSE = 40;

export function undocumented(root, min = MIN_PROSE) {
  const bad = [];
  for (const name of publishedDirs(root)) {
    const readme = join(root, name, 'README.md');
    if (!existsSync(readme)) { bad.push({ dir: name, reason: 'no README.md', prose: 0 }); continue; }
    const prose = readFileSync(readme, 'utf8')
      .split('\n')
      .filter((l) => !l.trim().startsWith('#'))
      .join(' ')
      .trim();
    if (prose.length < min) {
      bad.push({ dir: name, reason: `README.md states ${prose.length} characters outside its headings, under ${min}`, prose: prose.length });
    }
  }
  return bad;
}

export function stated(root, min = MIN_PROSE) {
  const failing = new Set(undocumented(root, min).map((b) => b.dir));
  return publishedDirs(root)
    .filter((d) => !failing.has(d))
    .map((dir) => ({
      dir,
      prose: readFileSync(join(root, dir, 'README.md'), 'utf8')
        .split('\n').filter((l) => !l.trim().startsWith('#')).join(' ').trim().length,
    }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2] ?? '.';
  for (const s of stated(root)) process.stdout.write(`${s.dir}: stated in ${s.prose} characters\n`);
  const bad = undocumented(root);
  if (bad.length) {
    process.stderr.write('published directories that do not state their purpose:\n');
    for (const b of bad) process.stderr.write(`  ${b.dir}: ${b.reason}\n`);
    process.exit(1);
  }
}
