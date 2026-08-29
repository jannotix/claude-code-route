# Three false negatives in route-lint

Depth: Standard
Context: Checks
Date: 2026-08-29

## Request

Run a second cycle on a real defect rather than a new capability, and see where the gates chafe.
The defect found: `route-lint` reports zero errors on a plan that violates both gates it exists to
guard.

## Reproduction

```
PLAN.md with:
  NFR-001 defined, no row in Placement
  Proof rows closing REQ-001 on `checked` and NFR-001 on `done`
  a Findings row marked fixed, in a five-column table with no Verified column

node route-lint.mjs .   ->   0 error(s), 0 warning(s)   exit 0
```

Three checks that should have fired did not. The checker reported clean while the properties it
guards were violated, which is the worst class of defect a checker can have.

## Localisation

| # | Where | Why it does not fire |
| --- | --- | --- |
| D1 | `route-lint.mjs:192` — `if (d.kind !== 'REQ') continue;` | The unplaced check skips every NFR, so an NFR with no home is never reported |
| D2 | `route-lint.mjs:255` — `if (!/\`[^\`]{3,}\`/.test(proof))` | Any backticked span of three characters counts as an execution, so `` `checked` `` closes a requirement |
| D3 | `route-lint.mjs:206` — `if (cells.length < 6) continue;` | A Findings table with fewer than six columns is skipped whole, so no finding in it is ever checked |

D2 is the most damaging: the Review gate is the product's central claim, and a single backticked
English word passes it.

---

# Plan

## Requirements

REQ-001  A non-functional requirement without a row in Placement must be reported.
  AC-001.1  Given a plan whose NFR-001 has no Placement row When the plan is checked Then req-unplaced is reported for NFR-001
  AC-001.2  Given a plan whose NFR-001 has a Placement row When the plan is checked Then nothing is reported for it

REQ-002  A proof cell must name something that could have been executed, not merely a backticked word.
  AC-002.1  Given a proof cell of `checked` When the plan is checked Then proof-not-executed is reported
  AC-002.2  Given a proof cell of `pytest tests/x.py::t` When the plan is checked Then nothing is reported
  AC-002.3  Given a proof cell of `npm test` When the plan is checked Then nothing is reported, because a command with arguments is executable

REQ-003  A finding recorded as acted on must be checked for a verification step whatever the column count of its table.
  AC-003.1  Given a five-column Findings table with a row marked fixed and no Verified column When the plan is checked Then finding-unverified is reported
  AC-003.2  Given a six-column table whose Verified cell is filled When the plan is checked Then nothing is reported

## Placement

| REQ | Rule | Home | Layer |
| --- | --- | --- | --- |
| REQ-001 | Every requirement and NFR needs a home | `checkPlacement` | application |
| REQ-002 | A proof names an execution, not a word | `looksExecutable` | domain |
| REQ-003 | Findings columns are located by header, not by position | `checkFindings` | application |

The layer names here are this script's own: `route.config.json` sets `domain, application` for it,
because a Node script with no framework still has rules that are about the subject matter and rules
that are about orchestration, and D2 is squarely the former.

## Scope

    skills/claude-code-route/scripts/route-lint.mjs, ../tests-debug/**, docs/route/plans/lint-false-negatives/**

## Out of scope

- The comment-voice heuristics. They are documented as heuristics and are warnings, not errors.
- A full markdown table parser. Escaped pipes and nested tables stay unsupported.
- Anything in route-map or route-history.

## Compatibility

These three checks become stricter, so a plan that passed before can fail now. That is the point of
the change, and there are no downstream consumers of this repository's own plans. Anyone whose plan
starts failing has a plan whose NFR had no home, whose proof named nothing runnable, or whose
finding was closed without a verification step.

---

# Execution

## Built

| Path | REQ |
| --- | --- |
| `skills/claude-code-route/scripts/route-lint.mjs` | REQ-001, REQ-002, REQ-003 |
| `../tests-debug/fixtures/false-negatives/PLAN.md` | the reproduction, kept as a fixture |
| `../tests-debug/route-lint.test.mjs` | six assertions |
| `route.config.json` | this project's two layer names |

## Deviations

`fixtures/clean/PLAN.md` had to change: its NFR-001 had no Placement row, so the fixture was
exercising D1 rather than a clean plan. Giving it a home is the fix the new rule demands, and the
fixture was wrong before, not made wrong by the change.

## Dependencies added

None.

---

# Review

Reviewer: degraded — the external reviewer's account limit was exhausted and it returned
`You've hit your usage limit ... try again at Sep 3rd, 2026 7:30 PM` on both a review and a trivial
probe. No adversarial pass ran on this candidate.

## Findings

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| D1 | DEFECT | BLOCKER | An NFR with no home is never reported | reproduced: 0 errors on a plan whose NFR-001 was unplaced | fixed |
| D2 | DEFECT | BLOCKER | Any backticked word closes a requirement | reproduced: `` `checked` `` closed REQ-001 | fixed |
| D3 | DEFECT | MAJOR | A findings table under six columns is skipped whole | reproduced: a five-column table with a row marked fixed passed | fixed |

## Proof

| Requirement | Proof | Result |
| --- | --- | --- |
| REQ-001 | `node tests-debug/route-lint.test.mjs` — "an NFR with no home is reported"; fails on the pre-fix revision | pass |
| REQ-002 | `node tests-debug/route-lint.test.mjs` — "a proof of `checked` is rejected", plus the two acceptance cases; fails on the pre-fix revision | pass |
| REQ-003 | `node tests-debug/route-lint.test.mjs` — "a findings table with no Verified column is reported"; fails on a faithful D3-only revert | pass |

Each of the three was reverted in isolation and the corresponding assertion failed, which is what a
defect fix owes: a test that fails on the code as it was.

The predicate behind REQ-002 was checked against both sides. Accepted: `pytest tests/x.py::t`,
`npm test`, `make check`, `scripts/bench.py --rps 50`, `cargo test`. Rejected: `checked`, `done`,
`verified`, `ok`, `tested`, `passes`.

## Gaps

No adversarial pass. The three defects were found by probing rather than by a reviewer, so what a
fourth defect of the same family would look like is unknown. The reviewer is available again after
2026-09-03.

`EXECUTABLE` is a heuristic like the comment checks: a proof cell of `` `a b` `` passes because it
has two tokens. It is an error rather than a warning because the Review gate is the product's
central claim, and the failure it replaced accepted every English word.

## Verdict

Delivered with gaps.

Three false negatives closed in the two gates the product exists for, each with a test that fails on
the pre-fix revision. One gap: no adversarial pass.
