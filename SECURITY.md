# Security

## What this project is

Claude Code Route is documentation plus three Node scripts. It has no runtime, no service, no
account, no network call of its own, and no dependencies.

## What the scripts do

| Script | Reads | Writes | Executes |
| --- | --- | --- | --- |
| `route-lint.mjs` | The plan and the source paths you pass it | Nothing | Nothing |
| `route-map.mjs` | Directory metadata, file sizes, manifests | Nothing | `git log`, `git rev-parse` |
| `route-history.mjs` | The history file, and your git identity — see below | Appends to the history file | `git config`, `git rev-parse` |

### Your identity in the history file

`route-history append` reads `git config user.name` and `user.email` and writes them into the
entry as `actor.operator`. That file is meant to be committed, and many projects publish it. The
identity therefore leaves the machine that wrote it, which is worth knowing before the first
append rather than after.

To keep it out:

```bash
node scripts/route-history.mjs append --event cycle.planned --model <id> --no-operator
```

`ROUTE_NO_OPERATOR=1` in the environment does the same for a whole session or a CI job. The field
is omitted entirely — not blanked — and the hash chain verifies exactly as before. The switch beats
an explicit `--operator`, so a stale flag in a script cannot defeat it.

Nothing else in this project reads your identity, and nothing sends it anywhere: the scripts make
no network call.

They run with your privileges and no sandbox, as any script you run does. None of them opens a
network connection, and none reads a file body except the plan, the sources you name, the manifests
`route-map` reports on, and the history file itself.

## What the skill instructs an agent to do

The skill can direct an agent to invoke an external reviewer CLI — Codex, Gemini, OpenRouter,
Ollama, or one you configure. That invocation:

- sends your plan, your diff and your test output to whatever service that CLI talks to
- is under your control: no reviewer runs unless one is configured and reachable
- is expected to run read-only, through the reviewer tool's own sandbox flag

**Treat it as you would any code review by a third party.** If your diff must not leave your
network, configure a local model or none: with no reviewer available the cycle degrades to
evidence-only review, and reports that it did.

## The project history

`HISTORY.jsonl` is committed, therefore as public as the repository. It records the model, an ISO
timestamp, the git revision, and the operator identity from `git config` — the same identity your
commits already carry. It must never contain secrets, tokens, customer data or production
identifiers; the skill states this, and nothing enforces it but review.

The hash chain makes a rewritten entry detectable. It is not a signature: anyone able to edit the
file can recompute the whole chain. It raises the cost of quiet editing, and that is all it claims.

## Reporting a vulnerability

Open a private security advisory on the repository, or email the address on the author's GitHub
profile. Include the script, the input that triggers it, and what you observed.

There is no service to take offline, so there is no embargo period to negotiate: a fix is a commit.
