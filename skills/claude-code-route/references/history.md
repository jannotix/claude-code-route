# Project history

Who did what to this project, when, and with which model.

A chat transcript disappears. A commit says what changed and not what it was reviewed against, which
model produced it, or whether anyone ran it. The history is the record that survives both, and on an
enterprise project it is what an auditor, a new engineer or a post-incident review actually reads.

`docs/route/HISTORY.jsonl` — one JSON object per line, **append-only**. An entry is never edited. A
correction is a new entry.

## Writing it

Always through the script. Hand-written entries drift in shape, and a log that cannot be parsed is a
log nobody queries.

```bash
node scripts/route-history.mjs append \
  --event cycle.reviewed \
  --model claude-opus-5 \
  --slug invoice-credit-notes --depth Standard \
  --role reviewer --round 1 --reviewer codex \
  --verdict delivered --confirmed 2 --refuted 1 --discarded 1
```

Timestamp with timezone, git revision, operator from `git config`, sequence number and the hash
chain are filled in for you. `--model` is required and has no default: the history records *which
model acted*, never that "an agent" did. Naming a model six months later, when its behaviour is
known to have changed, is the point.

## When to append

| Event | When |
| --- | --- |
| `project.initialised` | The map was first generated for this repository |
| `cycle.planned` | The Plan gate closed |
| `cycle.executed` | The Execute gate closed |
| `cycle.reviewed` | A review round finished, with its verdict |
| `cycle.repaired` | A repair round ran |
| `cycle.delivered` | The cycle closed and the work shipped |
| `cycle.blocked` | The repair budget ran out; record what stayed open |
| `cycle.cancelled` | The user stopped it |
| `plan.revised` | The single plan revision was spent |
| `assumption.recorded` | A rule was decided without confirmation |
| `finding.refuted` | A reviewer finding was disproved, with the counter-evidence |
| `decision.recorded` | An ADR was accepted |
| `map.updated` | Seams, language or invariant owners changed |

An unknown event name is recorded with a warning rather than rejected. Projects have events this
list does not know about.

**Do not append per file edit.** A history with an entry per keystroke is a log nobody reads, and it
costs tokens on every write. One entry per gate, per verdict, per decision.

## Fields

| Field | Source | Notes |
| --- | --- | --- |
| `seq` | automatic | Position in the file |
| `ts` | automatic | Local ISO 8601 with offset. `--ts` overrides, for backfilling |
| `event` | `--event` | Required |
| `actor.model` | `--model` | Required. The model identifier, not a family name |
| `actor.harness` | `--harness` | Defaults to `claude-code` |
| `actor.operator` | `git config` | `--operator` overrides. Empty when git has no identity |
| `change.slug` | `--slug` | The plan directory name |
| `change.depth` | `--depth` | Light, Standard or Guarded |
| `change.requirements` | `--req` | Comma separated |
| `change.scope` | `--scope` | Comma separated |
| `cycle.*` | flags | `--role --round --reviewer --verdict --confirmed --refuted --discarded` |
| `note` | `--note` | One short line. Not a summary of the work |
| `revision` | `git rev-parse` | The commit the entry describes |
| `prev`, `hash` | automatic | The chain |

Empty fields are dropped rather than written as null, so an entry stays small.

## Appending at the gate, not at the end

Append when the gate closes, not in a batch at the end of the cycle. A batch is easy to spot in the
rendered log — every entry within the same second — and it defeats the one property the timestamps
were for. Nothing enforces this: the script records the moment it is called, so calling it late
records a late moment honestly, and the log then says the appends were batched rather than hiding it.

The script takes a lock for the duration of an append, because an append is read-then-write: it
reads the last entry's hash and writes a new line linked to it. Two agents appending at the same
instant without a lock produce duplicate sequence numbers and a chain that no longer verifies. The
lock is a directory beside the log, held for milliseconds, and reclaimed automatically after thirty
seconds if the process holding it died.

## The chain

Each entry carries `sha256` over its own content, and `prev` holds the hash of the entry before it.
Rewriting the past breaks the link, and the break is detectable:

```bash
node scripts/route-history.mjs verify
```

```
ERROR  docs/route/HISTORY.jsonl:2  #2 content does not match its hash

3 entries, 1 break(s)
```

Exit 1 on any break. This does not make tampering impossible — anyone can recompute the whole chain.
It makes *casual* editing visible, which is what separates a record from a document, and it costs
nothing.

Put `route-history.mjs verify` in CI. A broken chain in a pull request is a fact worth knowing.

## Reading it

The agent **never reads the file**. It appends, and that is all. Reading a growing log into context
on every cycle is the opposite of the budget discipline in [memory.md](memory.md).

Humans and reviews read the rendered view:

```bash
node scripts/route-history.mjs render            # full, with a per-model and per-operator summary
node scripts/route-history.mjs render --limit 20 # recent
node scripts/route-history.mjs tail 5            # raw lines
```

`render` writes to stdout and never to a file. A `HISTORY.md` committed beside the log would be a
second source of truth that goes stale, and the log is the truth.

## What does not go in

The history is committed, so it is as public as the repository.

- No secrets, tokens or credentials.
- No personal data beyond the git identity the commits already carry.
- No customer data, no production identifiers, no request or response bodies.
- No prose summary of the work. The plan holds that, and the entry points at the plan.

`--note` is one short line naming something the structured fields cannot hold. It is not a place for
narration, and the rules in [voice.md](voice.md) apply to it.

## Why it is append-only

A record that can be edited is a document, and a document reflects whoever edited it last. The value
here is entirely in the property that an entry written in March still says in November what was true
in March — including the entries nobody is proud of: the blocked cycles, the refuted findings, the
assumptions that turned out wrong.

Deleting those is how a history becomes a brochure.
