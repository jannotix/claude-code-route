# False negatives

Depth: Standard

## Request

The reproduction from the R4 cycle: a plan that violates both gates and that route-lint reported
clean before the fix.

## Requirements

REQ-001  A thing must happen.
  AC-001.1  Given a When b Then c

REQ-002  Another thing must happen.
  AC-002.1  Given d When e Then f

## Non-functional requirements

NFR-001  Latency: p95 under 200 ms.

## Placement

| REQ | Rule | Home | Layer |
| --- | --- | --- | --- |
| REQ-001 | the rule | `Thing.doIt` | domain |
| REQ-002 | the other rule | `Thing.other` | domain |

## Scope

src/

## Out of scope

- Everything else.

## Findings

| # | Class | Severity | Summary | Outcome |
| --- | --- | --- | --- | --- |
| 1 | DEFECT | BLOCKER | Something was wrong | fixed |

## Proof

| Requirement | Proof | Result |
| --- | --- | --- |
| REQ-001 | `checked` | pass |
| REQ-002 | `pytest tests/x.py::t` | pass |
| NFR-001 | `npm test` | pass |
