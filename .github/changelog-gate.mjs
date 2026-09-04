// The gate lived inline in the workflow, where nothing outside a CI run could exercise it and the
// plan's proof row cited a suite that did not carry it. It is a module so the suite can run it both
// ways, and a CLI so the workflow still calls one thing. (REQ-003, AC-003.2, AC-003.3)
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// A heading opens the next section; a `###` subheading and a blank line are not an entry.
export function unreleasedEntries(text) {
  const lines = text.split('\n');
  const i = lines.findIndex((l) => l.trim() === '## [Unreleased]');
  if (i === -1) return [];
  const body = [];
  for (const l of lines.slice(i + 1)) {
    if (l.startsWith('## ')) break;
    if (l.trim() !== '' && !l.startsWith('###')) body.push(l.trim());
  }
  return body;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2] ?? 'CHANGELOG.md';
  const body = unreleasedEntries(readFileSync(file, 'utf8'));
  if (body.length) {
    process.stderr.write(`${file} has ${body.length} unreleased line(s); cut a version before shipping\n`);
    process.stderr.write(`  first: ${body[0].slice(0, 90)}\n`);
    process.exit(1);
  }
  process.stdout.write('[Unreleased] is empty\n');
}
