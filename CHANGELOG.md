# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-29

First release.

### Added

**The cycle**

- Three roles in a repeating cycle — Planner, Executor, Reviewer — each with one mandate and one
  gate phrased so a reader who was not present can apply it.
- Three depths selected from blast radius rather than diff size: Light plans in chat, Standard
  writes a plan, Guarded adds a compatibility plan, a rollback statement and an ADR.
- Defects enter at Plan with a reproduction. A plan for a defect nobody can reproduce is a guess.

**The two gates that carry the product**

- **Placement is the Plan gate.** Every requirement names the symbol and the layer that owns it,
  exactly once, before anything is written. A rule with no named home is not planned.
- **Execution is the Review gate.** Nothing closes on a read. A requirement closes on a test that
  ran, a recorded command, or a driven flow.

**Review**

- Cross-model review. An external model of a different family runs read-only, receives the plan, the
  frozen candidate and the evidence, and is asked to refute. It never receives the conversation or
  the reasoning behind the code.
- Three attack axes: contract, evidence, placement.
- Seven finding classes routing each correction deterministically. `DEFECT`, `UNPROVEN`,
  `MISPLACED` and `SCOPE` return to Execute; `UNDERSPECIFIED` and `WRONG-PLAN` return to Plan;
  `NOISE` is discarded with its reason. If the fix changes what must be true it goes to Plan,
  otherwise to Execute.
- The repeat rule: a second finding on the same requirement returns to Plan whatever its class.
- Findings confirmed by running their verification step before any code is touched; unconfirmed
  findings refuted with counter-evidence recorded.
- One repair round then blocked, one plan revision then stop and ask.
- Declared degradation when no external reviewer is available: evidence verified, no adversarial
  pass, and the report says so rather than presenting it as a review.

**Memory and budget**

- `MAP.md` — a per-repository index, not a summary. Contexts, entry points, seams, language,
  invariant owners and landmines, each entry carrying `path:line` and the revision it was verified
  at. Capped at roughly 400 lines and enriched one cycle at a time.
- Token neutrality as a design constraint, with the recovery mechanism stated per feature and an
  explicit reading discipline.

**Project history**

- `HISTORY.jsonl` — append-only, one entry per gate and per verdict, recording which model acted,
  when, under which operator identity, on which change, at which revision.
- Hash chain: each entry carries its own digest and the digest of the entry before it, so a
  rewritten past is detectable.

**Plan and execution discipline**

- Falsifiable requirements with stable identifiers, acceptance criteria including the case that
  catches a naive implementation, measured non-functional requirements, enforced out-of-scope,
  recorded assumptions, and a retrofit path that marks inference as inference.
- Ubiquitous language, bounded contexts and edge relationships, aggregate sizing, invariants with a
  single owner, layering with a placement table for the ambiguous cases.
- Declared write scope, reuse ordering, error handling, concurrency, security and observability
  defaults, and expand-migrate-contract sequencing for every contract and data change.

**Voice**

- English code comments only where they carry what the code cannot, with the allowed and banned
  patterns enumerated.
- Reports without preamble, narration, self-assessment or hedged completeness.
- Three claims that are never softened: a degraded review, a blocked cycle, an unproven requirement.

**Deterministic checks** — no model calls, no dependencies

- `route-lint.mjs` — plan structure, identifier uniqueness, acceptance criteria, requirements with
  no home, proofs that assert nothing executable, findings acted on without verification, unnamed
  gaps, unmeasured requirements and six comment patterns. Exit 1 on error, `--json` for CI.
  `--stage plan|execute|review` selects the gate under check, because a plan is complete before a
  proof exists. `--layers`, or `route.config.json`, replaces the four default layer names.
- `route-map.mjs` — repository skeleton from structure, sizes, git churn and manifests. No file
  content reaches the model, so cost is flat in repository size.
- `route-history.mjs` — append, render, verify, tail. The only writer of the three, it only appends,
  and it holds a lock while it does: an append is read-then-write, and simultaneous appends would
  otherwise produce duplicate sequence numbers and a chain that no longer verifies.

**Evals**

- `evals/` — four cases scoring the skill rather than its scripts, against a no-plugin baseline arm:
  `plan-gate`, `proof-gate`, `depth-scales`, `comment-voice`. `depth-scales` fails on
  over-application, which is the failure mode a discipline dies of. Unverified: `claude plugin eval`
  is in early access and was unavailable on the authoring account, so no case has been executed.

### Found by running the cycle on itself

Before release, one Standard cycle was run end to end on a real change with Codex as the external
reviewer. It ended **blocked**, which is the outcome the budget is supposed to produce, and it
surfaced three defects in the skill itself, all fixed here:

- The documented freeze command was `git diff`, which omits untracked files. On a new capability it
  produced an empty patch, and a reviewer handed an empty patch returns a PASS about nothing. It is
  now `git add -A && git diff --cached`, with an instruction to check the line count.
- `route-lint` had no notion of cycle stage, so it demanded a proof section at the Plan gate and
  exited 1 on a plan that was complete. Hence `--stage`.
- The review section said nothing about reviewer latency. At high reasoning effort a review of a few
  hundred lines takes minutes, and a foreground call times out and loses the work. The reference now
  says to run it in the background, and that a timed-out reviewer means the review did not happen.

### Found by running the defect route on route-lint itself

A second cycle, this one on a defect rather than a capability, probed the two gates and found that
`route-lint` reported **zero errors** on a plan that violated both. Three false negatives, each now
closed with a test that fails on the pre-fix revision:

- An NFR with no row in Placement was never reported: the unplaced check skipped every non-REQ.
- Any backticked span of three characters closed a requirement, so `` `checked` `` counted as an
  execution. A proof cell must now name something with a path separator, a test-id, a flag, a call,
  a file extension, or a second token.
- A Findings table with fewer than six columns was skipped whole, so no finding in it was checked.
  Columns are now located by header name, and a table with no Outcome column is itself an error.

The first of these immediately caught a case in this repository's own test fixtures.

A fourth followed, in the repair of the second: whitespace alone still made a command, so `a b`
closed a requirement. Then an adversarial round over that repair found six more, all confirmed:

- `e.g. checked` still closed the gate, because a one-letter extension counted as a file extension.
- `mytool check` was refused, because the runner list cannot enumerate every project's tooling.
  A `$ ` prefix now declares a span an executed command outright.
- A `Unverified reason` column answered for `Verified`, because the lookup matched substrings.
  Columns are located by exact header first.
- An invariant with no owner passed every gate, though the reference requires exactly one.
- The missing-Outcome rule fired once per row, making an open finding look like one closed without
  verification. It is one defect of the table, reported once.
- The plan claimed a 25-case probe while citing a test that held 16. The test now holds 30 and the
  plan says 30.

[1.0.0]: https://github.com/jannotix/claude-code-route/releases/tag/claude-code-route--v1.0.0
