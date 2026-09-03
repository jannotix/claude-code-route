# Broken plan

Context: Billing

## Requirements

REQ-001  A thing must happen.

REQ-002  Another thing must happen.
  AC-002.1  Given x When y Then z

REQ-002  A duplicate definition.

REQ-003  A third thing must happen.
  AC-003.1  Given a When b Then c

REQ-004  A fourth thing must happen.
  AC-004.1  Given d When e Then f

REQ-005  A fifth thing must happen.
  AC-005.1  Given g When h Then i

AC-009.1  Given a When b Then c

## Non-functional requirements

NFR-001  Performance: it must be fast.

## Placement

| REQ | Rule | Home | Layer |
| --- | --- | --- | --- |
| REQ-002 | the rule | `Thing.doIt` | domain |
| REQ-003 | the rule | | domain |
| REQ-004 | the rule | `Thing.other` | orchestration |
| REQ-004 | the rule again | `Thing.third` | domain |
| REQ-008 | not a requirement | `Ghost.run` | domain |
| REQ-005 | the rule | `Thing.fifth` | domain |

## Findings

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 1 | DEFECT | BLOCKER | Something was wrong | — | fixed |

## Proof

| Requirement | Proof | Result |
| --- | --- | --- |
| REQ-002 | verified by inspection | pass |
| REQ-003 | it looks correct | pass |
| REQ-004 | ran the suite | pass |
| NFR-001 | `python scripts/bench.py` | pass |
| REQ-007 | `pytest tests/y.py::t` | gap |
| REQ-005 |  | pass |
