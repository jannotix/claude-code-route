# Claude Code Route

Enterprise engineering discipline as a single Claude Code skill.

Three roles, one cycle, and code that was actually run.

```
  PLAN ──────▶ EXECUTE ──────▶ REVIEW ──────▶ delivered
    ▲             ▲                │
    │             └──── DEFECT · UNPROVEN · MISPLACED · SCOPE
    └──────────────────  UNDERSPECIFIED · WRONG-PLAN
```

```bash
git clone https://github.com/jannotix/claude-code-route.git
cp -r claude-code-route/skills/claude-code-route ~/.claude/skills/
```

Or as a plugin:

```bash
claude plugin marketplace add jannotix/claude-code-route
claude plugin install claude-code-route
```

## The problem

An agent that plans, implements and then judges its own work inherits the same blind spots at every
step. The failure is rarely the syntax — it is the process around it:

- a business rule invented at the keyboard because the plan was ambiguous, and never written down
- domain logic in a controller, duplicated into a second controller six weeks later with a variant
- a field renamed in a response, breaking a consumer nobody enumerated
- a defect fixed on the path the ticket named, while three sibling paths stay broken
- a migration written but never run backwards
- "done", meaning the code compiled and its author read it

Two of these have no answer in the usual toolchain. **Where a rule belongs** is a question a
specification does not ask, and it is why business logic ends up in three services with two
behaviours. **What closes a requirement** is a question a task checklist does not ask, and it is why
work ships that nobody ever ran.

Route makes both a gate.

## The two rules that carry it

**A rule with no named home is not planned.** The plan says which symbol, in which layer, owns each
requirement — before anything is written.

| REQ | Rule | Home | Layer |
| --- | --- | --- | --- |
| REQ-004 | A credit note must not exceed the outstanding amount | `Invoice.applyCredit` | domain |

**Nothing closes on a read.** Reading the diff is not review. A requirement closes on a test that
ran, a command whose output is recorded, or a flow that was driven. The linter rejects a proof cell
that says "verified by inspection" — and one that says "checked", or "all green", or any bare
phrase. A proof must name a path, a test id, a flag, a call, an extension, or a runner with an
argument.

## The three roles

| Role | Mandate | Gate to leave |
| --- | --- | --- |
| **Planner** | Decide what must be true, and where each rule lives | Every requirement falsifiable, with acceptance criteria, and with a named home |
| **Executor** | Make it true inside a declared scope | Diff inside scope, nothing unrequested, the project's own checks pass |
| **Reviewer** | Decide whether it is true | Every requirement closed by an execution, or a gap named in words |

The same session wears each hat in turn. Nothing is spawned, nothing is orchestrated.

## Depth

Rigour scales with blast radius, not with diff size. Rigour that does not scale gets abandoned on
the first typo, and then it is not there for the migration either.

| Depth | The change | Cycle |
| --- | --- | --- |
| **Light** | No contract moves, no new domain concept | Plan is five lines in chat, no file |
| **Standard** | A capability the system does not have, or behaviour a user can observe | `PLAN.md` written, full cycle |
| **Guarded** | Published API, schema, event, migration, authorisation rule, new context | Standard, plus a compatibility plan, a rollback statement and an ADR |

## Review, and where a finding goes

The Reviewer is an external model of a different family when one is configured — it runs read-only,
receives the plan, the frozen diff and the evidence, and is asked to **refute**, never to approve.
It never receives the conversation or the reasoning behind the code: give a reviewer the
justification and it becomes an approver.

Every finding carries a class, and the class decides where the correction goes.

| Class | Meaning | Goes to |
| --- | --- | --- |
| `DEFECT` | The code does not do what the plan says | Execute |
| `UNPROVEN` | The plan says it, nothing executed proves it | Execute |
| `MISPLACED` | Right behaviour, wrong home | Execute |
| `SCOPE` | The diff does what no requirement asked for | Execute |
| `UNDERSPECIFIED` | The code had to decide a rule the plan does not have | Plan |
| `WRONG-PLAN` | The plan does not satisfy the original request | Plan |
| `NOISE` | Style preference, not a violation | Discarded, with the reason |

**The one-line test:** if the fix changes *what must be true*, it goes to Plan. If it changes only
*what was done*, it goes to Execute.

**The repeat rule:** the second time the same requirement produces a finding, it goes to Plan
whatever its class. Two findings on one requirement mean the requirement is the problem. This is the
failure that makes review loops spin — an `UNDERSPECIFIED` misfiled as a `DEFECT`, patched, and back
next round somewhere else.

**A finding is a claim, not a truth.** It carries a verification step, and that step is run before
any code is touched. Confirmed findings are fixed; unconfirmed ones are refuted with the
counter-evidence recorded.

**Budget:** one repair round. Still open after it → **blocked**, with exactly what is open and what
would close it stated. Blocked is an outcome, and reporting it plainly is the point.

**No external model available** → the review degrades and says so. It then verifies only that every
proof ran and asserts its requirement. What is lost is the ability to find what the plan did not
think of, and that loss is stated rather than hidden.

## Large codebases

A repository too big to read is not read. `MAP.md` is an **index, not a summary**: contexts, entry
points, seams, language, invariant owners, landmines — every entry carrying `path:line` and the
revision it was verified at.

```bash
node scripts/route-map.mjs . > docs/route/MAP.md
```

The generator reads structure, sizes, git churn and manifests. No file content reaches the model, so
the skeleton costs the same on a 50-file repository and a 50 000-file one. Change frequency ranks
what to index first, and it is free.

Then it is enriched **one cycle at a time**, never in a sweep — each cycle records the seam it
surveyed anyway. After roughly ten changes it covers the hot paths, which is where most work lands.
A full indexing pass is never run: it costs a fortune and most of what it produces is about code
nobody will touch this quarter.

## Token budget

The cycle costs about what an ordinary session costs. It has to, or it will not be used.

An ordinary session does not spend its tokens writing code. It spends them **re-exploring** the same
structure every session and **reworking** code that shipped broken. Route removes both and pays for
the plan out of the savings:

| Recovered from | Mechanism |
| --- | --- |
| Re-exploration | The map answers what a grep sweep would answer, and it compounds across sessions |
| Rework | Code that ships broken costs three to five debugging rounds |
| Re-derivation | The plan holds the requirements; without it they are re-derived after every compaction |

The external reviewer is **token-positive for the session**: it receives file paths and returns a
findings list, where self-review means pulling the whole diff back into context to perform the
weakest form of review there is. That cost lands on the other account, which is said rather than
hidden.

No figure is published for the savings, because none has been measured, and an unmeasured number in a
README is a false claim. The mechanism is stated so it can be checked on your own repository.

What *is* measurable is the skill's own footprint, and the harness reports it:

```bash
claude plugin details claude-code-route
```

At 1.0.0 that is roughly **210 tokens always-on** and **4.3k when the skill fires**. References load
only when a role's gate is genuinely in doubt, at most one per cycle. Run the command yourself
rather than trusting this paragraph — it is the same measurement, on your machine.

The honest failure mode: a cycle on a Light change with a cold map and a long plan costs more than
an ordinary session. The depth classification and the *plan shorter than the diff* rule exist to
prevent it. If a cycle cost more than the change deserved, the depth was wrong.

## Project history

`HISTORY.jsonl` is the record a chat transcript is not. Append-only, one entry per gate and per
verdict, recording **which model acted**, when, under which operator identity, on which change, at
which revision.

```bash
node scripts/route-history.mjs append --event cycle.reviewed --model claude-opus-5 \
  --slug invoice-credit-notes --depth Standard --role reviewer --round 1 \
  --reviewer codex --verdict delivered --confirmed 2 --refuted 1
```

Timestamp with timezone, git revision, operator from `git config`, sequence and the hash chain are
filled in for you. `--model` is required and has no default: naming the model six months later, when
its behaviour is known to have changed, is the point.

Each entry carries its own `sha256` and the digest of the entry before it, so a rewritten past is
detectable:

```bash
node scripts/route-history.mjs verify
```

```
ERROR  docs/route/HISTORY.jsonl:2  #2 content does not match its hash

3 entries, 1 break(s)
```

This does not make tampering impossible — anyone can recompute the chain. It makes casual editing
visible, which is what separates a record from a document, and it costs nothing.

The agent never reads the file; it appends. `render` produces the human view, with a per-model and
per-operator summary. Blocked cycles, refuted findings and assumptions that turned out wrong stay in
it — deleting those is how a history becomes a brochure.

## Artifacts

An existing repository convention wins — if there is already `docs/adr/` or an RFC directory, Route
adopts it.

```
docs/route/
├── MAP.md                    one per repository — the index
├── HISTORY.jsonl             one per repository — append-only, hash-chained
├── decisions/ADR-nnnn-*.md   Guarded only
└── plans/<slug>/PLAN.md      one per change, three sections, written by the three roles in turn
```

One file per change, not three. Fewer files is fewer tokens, and fewer tokens is what makes the
discipline survive contact with real work.

## Deterministic checks

No model calls, no dependencies, read-only.

```bash
node scripts/route-map.mjs .                                        # index a large repository
node scripts/route-lint.mjs docs/route/plans/credit-notes --stage plan
node scripts/route-lint.mjs docs/route/plans/credit-notes src/      # --stage review, the default
node scripts/route-history.mjs verify                               # the chain is intact
```

`--stage plan | execute | review` says which gate is being checked, because a plan is complete
before a proof exists. `--layers core,usecase,adapter`, or `{"layers": [...]}` in
`route.config.json`, replaces the four default layer names for a project that uses its own.

```
ERROR  PLAN.md:31  req-unplaced        REQ-001 has no row in Placement; a rule with no named home is not planned
ERROR  PLAN.md:46  proof-not-executed  REQ-002 closes on judgement, not execution: "verified by inspection"
ERROR  PLAN.md:40  finding-unverified  A finding was acted on with no verification step recorded
warn   src/billing/invoice.py:88  comment-task-unowned  TODO with no ticket, requirement or owner

3 error(s), 1 warning(s)
```

Identifier uniqueness, missing acceptance criteria, **requirements with no home**, **proofs that
assert nothing executable**, findings acted on without verification, unnamed gaps, unmeasured
non-functional requirements, and six comment patterns. Exit 1 on error, `--json` for CI.

A rule an agent merely promises to follow degrades under context pressure. A rule a process exits 1
on does not.

## Voice

Comments are in English, and only where they carry what the code cannot: a non-local constraint, an
external contract's quirk, a deliberate trade-off with its ceiling, a hazard, a pointer to the
requirement or decision holding the reason. Never a restatement of the line below, a banner, a
`TODO` with no owner, or commented-out code.

Reports state what changed, where, which requirement it satisfies, what proves it and what is not
done. No preamble, no restatement of the request, no self-assessment, no trailing offer while the
work is unfinished.

Three claims are never softened: a degraded review is not called a review, a blocked cycle is not
called progress, and an unproven requirement is not called implemented.

## Evals

`evals/` holds four cases, each measuring one property the skill claims, scored against a no-plugin
baseline arm:

| Case | Property under test |
| --- | --- |
| `plan-gate` | A rule gets a named home before code is written |
| `proof-gate` | Nothing closes on a read |
| `depth-scales` | Rigour is proportional to blast radius |
| `comment-voice` | Comments carry what the code cannot |

```bash
claude plugin eval claude-code-route
```

`depth-scales` fails on over-application rather than under-application, and it is in the suite for
that reason: a discipline that cannot be cheap on a typo gets turned off, and is then absent for the
migration too.

The runner is still in early access on this account, so the suite has never run under it. One case
was measured by hand instead: `proof-gate` scored **0 on both graders with the skill absent and 1 on
both with it invoked**. The same runs surfaced something the score does not say — in headless mode
the skill did not auto-invoke and had to be named, before or after its description was rewritten to
trigger better. `evals/README.md` carries the transcripts and what
would close the rest.

## Scope

Route is a discipline, not a framework. No runtime, no service, no account, no hook, no network call
of its own, and nothing written outside the repository it is working in. It works with whatever test
runner, language and architecture the project already has.

It does not replace review by a human. It makes the review shorter, because the reviewer is handed
the requirement, the placement decision and the evidence instead of reconstructing them from a diff.

## Independence

Claude Code Route is an independent project. It is not affiliated with, sponsored by or endorsed by
Anthropic.

## License

MIT. See [LICENSE](LICENSE).
