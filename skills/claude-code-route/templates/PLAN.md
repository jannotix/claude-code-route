# <Change name>

Depth: Light | Standard | Guarded
Context: <bounded context>
Date: <YYYY-MM-DD>

## Request

<The user's original request, verbatim. Never paraphrased. WRONG-PLAN findings are judged against
this text, so a word changed here is a requirement silently rewritten.>

---

# Plan

Written by the Planner. No source is written until every row below holds.

## Requirements

REQ-001  <One falsifiable statement, in the domain's language, using must.>
  AC-001.1  Given <state> When <action> Then <observable outcome>
  AC-001.2  Given <the state that breaks a naive implementation> When <action> Then <named rejection>

REQ-002  ...

## Non-functional requirements

NFR-001  <Category>: <a number, a load, an environment, a percentile.>

Write `not applicable` for a category considered and dismissed. Delete the ones never in question.

## Placement

| REQ | Rule | Home | Layer |
| --- | --- | --- | --- |
| REQ-001 | <the rule> | `<Symbol>` | domain / application / infrastructure / interface |

Every requirement appears exactly once. A requirement that resists placement is usually two
requirements, or one that was never falsifiable.

## Invariants

INV-001  <What must always be true.>  Owner: `<AggregateRoot>`

Delete if the model did not move.

## Scope

    <paths the Executor may write>

## Out of scope

- <A decision someone could otherwise assume went the other way.>

## Assumptions

ASSUMPTION-001  <What was assumed.> Unconfirmed — needs <who>. Affects <REQ-nnn>.

## Compatibility — Guarded only

Expand: <the additive step, deployable alongside the current code>
Migrate: <write both, read new with fallback, backfill in restartable batches>
Contract: <removal, and what must be true before it>
Rollback: <what happens to data written by the new code if the old code returns>

---

# Execution

Written by the Executor.

## Built

| Path | REQ |
| --- | --- |
| `<path>` | REQ-001, REQ-004 |

## Deviations

<Where the code differs from the plan above, and why. A deviation is amended into the plan, not
left only here. Delete if there were none.>

## Dependencies added

<name — what it does, why the reuse rungs above it did not, what removing it would cost. Delete if
none.>

---

# Review

Written by the Reviewer.

Reviewer: <external model and version | degraded — no external reviewer available>
Candidate: `.route/candidate.patch` at `<revision>`

## Findings

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 1 | DEFECT | BLOCKER | <short> | confirmed by `<command>` | fixed |
| 2 | MISPLACED | MAJOR | <short> | refuted — `<counter-evidence>` | refuted |
| 3 | NOISE | MINOR | <short> | — | discarded: <reason> |

Rounds: <n of 2>

## Proof

| Requirement | Proof | Result |
| --- | --- | --- |
| REQ-001 | `<test path>::<test name>` | pass |
| NFR-001 | `<command>`, <load>, <percentile> <value>, <environment> | pass |
| REQ-003 | — | gap |

Every REQ and NFR above appears here exactly once. Nothing closes on a read: each cell names
something that was executed.

## Gaps

REQ-003 unproven. <Why the proof could not be produced.> <What was checked instead.> <What would
close it.>

Delete the section if there are none. Do not delete it by leaving a requirement out of the table.

## Verdict

Delivered | Delivered with gaps | Blocked

<For Blocked: exactly what is open and what would close it.>
