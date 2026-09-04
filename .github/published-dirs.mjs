// The check lived inline in the workflow, where the only way to exercise it was to push. Round 8
// found it accepting an empty README, which is existence and not a statement of purpose. A module
// so the suite can run it both ways, a CLI so the workflow calls one thing. (REQ-007, AC-007.2)
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Headings name a directory; they do not say why it ships. Only what is left counts.
export const MIN_PROSE = 40;

export function undocumented(root, min = MIN_PROSE) {
  const bad = [];
  for (const e of readdirSync(root, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name.startsWith('.')) continue;
    const readme = join(root, e.name, 'README.md');
    if (!existsSync(readme)) { bad.push({ dir: e.name, reason: 'no README.md', prose: 0 }); continue; }
    const prose = readFileSync(readme, 'utf8')
      .split('\n')
      .filter((l) => !l.startsWith('#'))
      .join(' ')
      .trim();
    if (prose.length < min) {
      bad.push({ dir: e.name, reason: `README.md states ${prose.length} characters outside its headings, under ${min}`, prose: prose.length });
    }
  }
  return bad;
}

export function stated(root, min = MIN_PROSE) {
  const failing = new Set(undocumented(root, min).map((b) => b.dir));
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !failing.has(e.name))
    .map((e) => ({
      dir: e.name,
      prose: readFileSync(join(root, e.name, 'README.md'), 'utf8')
        .split('\n').filter((l) => !l.startsWith('#')).join(' ').trim().length,
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
