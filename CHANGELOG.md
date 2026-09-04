# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-09-04

### Fixed

- Four more false answers in the proof gate, found by a fifth adversarial round. `$ 2>out` closed a
  requirement, because a digit was accepted as the start of a program name and redirection is not a
  program. `python...` and `python.` matched the `python` runner, whose version pattern was a loose
  character class rather than the shape a version has. A dash, an em dash or an ellipsis counted as
  an invariant owner, because the owner check had its own idea of a placeholder instead of the shared
  one. And, for the first time, a false answer in the other direction: `pytest tests/reviewed/test.py::t`
  was refused as judgement, because the prose pattern matched `reviewed` inside a path. Backticked
  spans are now excluded before that test — a gate that refuses correct work is a gate people switch
  off.

- A proof span naming a runner of one or two characters — `go`, `py`, `sh`, `ab` — was refused by a
  minimum length of three, and `go.mod` was accepted because the runner pattern ended on a word
  boundary rather than on the program. Both were false answers in the gate the skill exists for.
- The `$` marker accepted anything that was not a comment, so `` `$ && checked` `` closed a
  requirement while `` `$ /bin/true` `` did not: a leading slash was read as the start of a comment.
- The Findings table accepted `Verification` and `Result` as aliases for `Verified` and `Outcome`,
  which contradicts the exact-column rule the same check is built on.
- An `Owner` cell separating two names with `/`, `&` or `AND` was read as one owner. The separators
  are now named in the plan rather than invented in the code, and a dotted symbol stays one name.

- `route-history append` crashed with exit 1 under lock contention on Windows, losing the entry it
  was writing. The retry loop treated only `EEXIST` as "somebody holds the lock"; Windows raises
  `EPERM`, and sometimes `EACCES`, for the same condition. Measured at roughly one writer in 250 with
  twelve appending at once — 2 failures in 40 rounds before, 0 in 60 after. The contract has always
  been that a writer which gives up exits 3 and says so; now it does.

### Changed

- The changelog gate fails when `[Unreleased]` holds an entry. It previously checked only that the
  manifest version appeared somewhere in the file, which passed while four commits of user-visible
  behaviour change sat unversioned — the defect that made this release necessary.
- The eval suite is three cases. `comment-voice` was retired after three prompt and grader designs
  failed to separate the arms; the property it measured is real but is not separable by a binary
  rubric on one file. Its prompt, graders and both observed outputs are kept internally as a
  reproduction, and the gap is named in `evals/README.md`.

- The test suite ships with the product. `tests/route-lint.test.mjs` and its fixtures are in the
  repository, so the proofs a plan cites are frozen with the commit that they prove and a reader
  holding only that commit can run them. CI runs the suite on every push, from three working
  directories. What stays unpublished is working notes, which are the only genuinely internal part.

- The test suite states where it is standing. `route-lint` reads `route.config.json` from the working
  directory, which is the point of that file, so the check asserting the built-in default layers now
  runs from a directory that has no config, and a sibling asserts that a config present in the working
  directory replaces them. Run from `production/` — the directory the plan records — the suite used to
  report 140 of 141 while the plan claimed 141. It now reports the same total from the repository root,
  from `production/` and from `prova/`.
- Every eval case carries a `scaffold_script` and builds its own repository.

### Added

- `route-history append --no-operator`, and `ROUTE_NO_OPERATOR` in the environment for a whole
  session or a CI job. The history records `git config user.name` and `user.email` into a file you
  will commit and may publish; until now nothing said so and nothing let you decline. The field is
  omitted entirely rather than blanked, the hash chain verifies either way, and the switch beats an
  explicit `--operator`, because a privacy switch a stale flag can override is not one. `SECURITY.md`
  now says all of this where a reader looks for what leaves their machine.
- A declared runtime floor. The scripts need **Node 18**; the README and the plugin manifest both say
  so, and each script refuses an older runtime by name with exit 2 rather than surfacing a stack
  trace. The guard cannot help below Node 14, where the module does not parse — that limit is stated
  rather than glossed. Claude Code itself requires Node 22, so inside the plugin the floor is already
  met; the lower number matters when the scripts run standalone from a project's own CI.
- `docs/route/README.md`. That directory is the skill used on itself, and it now says so: which plan
  is which, what the history is, and why the author's attribution is published on purpose.
- CI runs the test suite on **Linux, macOS and Windows**, at Node 18 and 22. The lock defect fixed in
  this version was Windows-only and was found by hand; a single-platform matrix could not have caught
  it and now would.
- CI installs the plugin from the marketplace and runs the installed copy's own suite, so a release
  is proven by installing it rather than by inspecting the tree.

- Probes covering every false answer the five review rounds produced, in both directions. The
  executable predicate is checked over 54 spans; the suite is 149 checks.

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

### The proof rule, after four rounds

A third adversarial round found two more BLOCKERs in the same predicate — `$ # comment only`,
`README.md` and `pass/fail` all closed a requirement, while `pytest` alone was refused — plus a
column lookup that let `Not verified` answer for `Verified`, a qualified outcome like
`fixed under REQ-004` going unchecked in the very form this project's own plans use, a three-column
table suppressing every check, and the template's own owner placeholder counting as an owner.

Four rounds, four sets of false negatives in one requirement. That is the repeat rule's signature,
and the answer was not another patch: no string can prove that something ran, so the inference from
a span's characters is gone. A proof cell names a program the tool knows, or the author writes `$ `
and takes responsibility. Both are decidable, and the surface stops widening with each repair.

### Measured, not asserted

`proof-gate` was executed by hand against a scaffolded repository and graded by its own rubrics:
**0 on both graders without the skill, 1 on both with it.** The same runs showed the skill does not
auto-invoke in headless mode, which the score alone would have hidden.

[1.0.0]: https://github.com/jannotix/claude-code-route/releases/tag/claude-code-route--v1.0.0
