# This directory is the skill used on itself

Everything under `docs/route/` was produced by Claude Code Route while building Claude Code Route. It
ships with the plugin on purpose: a worked example is worth more than a description of one, and these
are real artifacts rather than illustrations written to look good.

| File | What it is |
| --- | --- |
| `plans/lint-false-negatives/PLAN.md` | A Standard plan taken through six adversarial review rounds. Fifty findings, every one confirmed by executing its verification step, none refuted. The findings tables record what was wrong, how it was proven wrong, and where the repair landed. |
| `plans/release-1-1-0/PLAN.md` | A Guarded plan: the release this version is part of, including the seven findings that made the previous version not ready to ship. |
| `HISTORY.jsonl` | The append-only, hash-chained record of who did what, when, with which model. `node skills/claude-code-route/scripts/route-history.mjs render` turns it into a table. |
| `MAP.md` | The index `route-map.mjs` produces for this repository. |

Read the plans for the parts a summary cannot carry: a gate catching its own author, a repair that
created the next round's defect, a proof that turned out to measure a test double instead of the
code, and a count that nobody had counted.

## About the names in the history

`HISTORY.jsonl` carries the author's git identity in every entry, and that is deliberate. The point
of the file is that it says *who* acted rather than that "an agent" did, and publishing it with the
attribution intact is the honest form of that claim. The same address is in all thirteen commit
headers of this repository, so nothing is disclosed here that the commit log does not already say.

**Your own history is a different question, and the answer is yours.** When you run
`route-history append` in your repository it reads `git config user.name` and `user.email` and writes
them into a file you will commit — and may publish. If you would rather it did not:

```bash
node scripts/route-history.mjs append --event cycle.planned --model <id> --no-operator
```

or set `ROUTE_NO_OPERATOR=1` for a whole session or a CI job. The field is omitted entirely and the
hash chain verifies exactly as before. `SECURITY.md` says the same thing in the table of what each
script reads and writes.
