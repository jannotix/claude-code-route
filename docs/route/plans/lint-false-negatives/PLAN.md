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

REQ-004  Two bare words must not count as a command, and neither must a dotted abbreviation.
  AC-004.1  Given a proof cell of `a b` When the plan is checked Then proof-not-executed is reported
  AC-004.2  Given a proof cell of `npm test` When the plan is checked Then nothing is reported
  AC-004.3  Given a proof cell of `./mytool check` When the plan is checked Then nothing is reported
  AC-004.4  Given a proof cell of `e.g. checked` When the plan is checked Then proof-not-executed is reported

REQ-005  An author must be able to declare a span an executed command when the heuristic cannot recognise it.
  AC-005.1  Given a proof cell of `$ mytool check` When the plan is checked Then nothing is reported
  AC-005.2  Given a proof cell of `mytool check` without the prefix When the plan is checked Then proof-not-executed is reported

REQ-006  An invariant must name its owner where it is stated.
  AC-006.1  Given INV-001 with no Owner When the plan is checked Then invariant-unowned is reported
  AC-006.2  Given INV-001 carrying Owner When the plan is checked Then nothing is reported

REQ-007  A column must be located by its exact header before any looser match.
  AC-007.1  Given a Findings table with both an Unverified reason column and a Verified column When a row is marked fixed with an empty Verified cell Then finding-unverified is reported
  AC-007.2  Given the same table with the Verified cell filled When the plan is checked Then nothing is reported

REQ-008  A Findings table that cannot express resolution must be reported once, as its own defect, not once per row.
  AC-008.1  Given a Findings table with no Outcome column and one open finding When the plan is checked Then findings-no-outcome is reported exactly once
  AC-008.2  Given that table When the plan is checked Then finding-unverified is not reported, because an open finding is not one acted on without verification

## Placement

| REQ | Rule | Home | Layer |
| --- | --- | --- | --- |
| REQ-001 | Every requirement and NFR needs a home | `checkPlacement` | application |
| REQ-002 | A proof names an execution, not a word | `looksExecutable` | domain |
| REQ-003 | Findings columns are located by header, not by position | `checkFindings` | application |
| REQ-004 | Whitespace alone does not make a command | `STRUCTURAL` | domain |
| REQ-005 | An explicit `$` prefix declares a command | `EXPLICIT_COMMAND` | domain |
| REQ-006 | An invariant names its owner where it is stated | `checkPlan` | application |
| REQ-007 | Columns are located by exact header first | `checkFindings` | application |
| REQ-008 | A table with no Outcome column is one defect, not many | `checkFindings` | application |

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

Round 1 reviewer: degraded — the external reviewer's account limit was exhausted, so no adversarial
pass ran and none was claimed.

Round 2 reviewer: codex, gpt-5.6-sol, reasoning effort max, sandbox read-only. The adversarial pass
round 1 could not run. **Seven findings, seven confirmed by executing their verification steps, none
refuted.** Two of them were edges this plan had documented as acceptable trade-offs; the reviewer's
position, which stands, is that a documented false negative in the gate the product exists for is
still a defect.

## Findings

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| D1 | DEFECT | BLOCKER | An NFR with no home is never reported | reproduced: 0 errors on a plan whose NFR-001 was unplaced | fixed |
| D2 | DEFECT | BLOCKER | Any backticked word closes a requirement | reproduced: `` `checked` `` closed REQ-001 | fixed |
| D3 | DEFECT | MAJOR | A findings table under six columns is skipped whole | reproduced: a five-column table with a row marked fixed passed | fixed |
| D4 | DEFECT | MAJOR | D2's repair accepted any two-token span | reproduced: `` `a b` `` closed a requirement | fixed under REQ-004 |
| 2.1 | DEFECT | BLOCKER | A dotted abbreviation still closed the gate | confirmed: `` `e.g. checked` `` was accepted | fixed, REQ-004 |
| 2.2 | DEFECT | MAJOR | A legitimate command not in the runner list was refused | confirmed: `` `mytool check` `` was rejected | fixed by the `$` convention, REQ-005 |
| 2.3 | DEFECT | MAJOR | A lookalike header answered for Verified | confirmed: an `Unverified reason` column absorbed the lookup and nothing was reported | fixed, REQ-007 |
| 2.4 | UNDERSPECIFIED | MAJOR | An invariant with no owner passed every gate | confirmed: nothing reported at plan stage | fixed, REQ-006 |
| 2.5 | SCOPE | MAJOR | The missing-Outcome rule fired on open findings too | confirmed: an unresolved finding was reported as acted on without verification | fixed, REQ-008 |
| 2.6 | UNPROVEN | MAJOR | The plan claimed 25 probe cases, the cited test held 16 | confirmed by counting the two arrays | fixed: the test now holds 30 and the plan says 30 |
| 2.7 | MISPLACED | MAJOR | The executable rule spans four symbols, one was placed | confirmed by reading `PROSE_PROOF`, `STRUCTURAL`, `RUNNER`, `looksExecutable` | placement corrected, REQ-004 and REQ-005 |

## Proof

| Requirement | Proof | Result |
| --- | --- | --- |
| REQ-001 | `node tests-debug/route-lint.test.mjs` — "an NFR with no home is reported"; fails on the pre-fix revision | pass |
| REQ-002 | `node tests-debug/route-lint.test.mjs` — "a proof of `checked` is rejected", plus the two acceptance cases; fails on the pre-fix revision | pass |
| REQ-003 | `node tests-debug/route-lint.test.mjs` — "a findings table with no Verified column is reported"; fails on a faithful D3-only revert | pass |
| REQ-004 | `node tests-debug/route-lint.test.mjs` — the accept and reject probe over 30 spans, including `e.g. checked`; fails on the whitespace-alone predicate | pass |
| REQ-005 | `node tests-debug/route-lint.test.mjs` — "the $ prefix accepts an unknown runner" | pass |
| REQ-006 | `node tests-debug/route-lint.test.mjs` — "an invariant with no owner is reported" and its negative | pass |
| REQ-007 | `node tests-debug/route-lint.test.mjs` — "a lookalike header does not answer for Verified" | pass |
| REQ-008 | `node tests-debug/route-lint.test.mjs` — "a table with no Outcome column is reported once, as its own defect" | pass |

Each of the three was reverted in isolation and the corresponding assertion failed, which is what a
defect fix owes: a test that fails on the code as it was.

The predicate behind REQ-002 was checked against both sides. Accepted: `pytest tests/x.py::t`,
`npm test`, `make check`, `scripts/bench.py --rps 50`, `cargo test`. Rejected: `checked`, `done`,
`verified`, `ok`, `tested`, `passes`.

## Gaps

The round-2 repairs carry no adversarial pass of their own. Seven findings were fixed and each is
covered by an assertion that fails on the pre-fix code, but the fixes themselves have not been
attacked. On the evidence of rounds 1 and 2 — where three defects became four, then seven — a third
round would probably find something.

`looksExecutable` stays a heuristic with an escape hatch. What it cannot do is decide whether the
command named was the *right* command, which is the reviewer's job and not the linter's.

The predicate is probed from both sides in the test suite, over **30 spans**: 15 that must close a
requirement and 15 that must not. The earlier plan claimed 25 from a scratch probe while citing a
test that held 16, which the second review caught — the number now matches the cited proof.

It remains a heuristic, and the second review found both of its edges to be defects rather than
documented trade-offs. `e.g. checked` passed because a one-letter extension matched; the extension
now needs two letters. `mytool check` was rejected because the runner list had never heard of it;
`$ mytool check` now declares it explicitly, which is a convention an author can apply and a
heuristic cannot guess. It is an error rather than a warning because the Review gate is the
product's central claim, and what it replaced accepted every English word.

## Verdict

Delivered with gaps.

Ten defects closed in the two gates the product exists for — three found by probing, seven by the
adversarial round that followed — each covered by an assertion that fails on the pre-fix code.
119 checks pass.

One gap: the round-2 repairs have not themselves been attacked.

## Amendments

REQ-004  added 2026-08-30: the first repair of D2 accepted whitespace alone, so `a b` still closed a
         requirement. The predicate now needs a structural signal or a named runner with an
         argument. Recorded as a new requirement rather than folded into REQ-002, because it is a
         second rule and the placement table allows one home per requirement.

REQ-005  added 2026-08-30 after review round 2 (2.2): the runner list cannot enumerate every
         project's tooling, so an author declares a command explicitly with `$`.
REQ-006  added 2026-08-30 after review round 2 (2.4): `plan.md` requires an invariant to have
         exactly one owner and nothing checked it.
REQ-007  added 2026-08-30 after review round 2 (2.3): substring matching let `Unverified reason`
         answer for `Verified`.
REQ-008  added 2026-08-30 after review round 2 (2.5): the missing-Outcome rule was reported per
         row, which made an open finding look like one closed without verification. It is one
         defect of the table, reported once.
