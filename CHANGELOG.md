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
- `route-map.mjs` — repository skeleton from structure, sizes, git churn and manifests. No file
  content reaches the model, so cost is flat in repository size.
- `route-history.mjs` — append, render, verify, tail. The only writer of the three, and it only
  appends.

[1.0.0]: https://github.com/jannotix/claude-code-route/releases/tag/v1.0.0
