# Credit notes

Depth: Standard
Context: Billing
Date: 2026-08-29

## Request

Let a finance user issue a credit note against an issued invoice, never for more than what is
still owed on it.

---

# Plan

## Requirements

REQ-001  An issued invoice must accept a credit note against it.
  AC-001.1  Given an issued invoice When a credit note of 10.00 is issued Then it exists with state ISSUED
  AC-001.2  Given a draft invoice When a credit note is issued Then it is rejected with INVOICE_NOT_ISSUED

REQ-002  A credit note must not exceed the outstanding amount of the invoice it credits.
  AC-002.1  Given 100.00 outstanding When 120.00 is credited Then rejected with CREDIT_EXCEEDS_OUTSTANDING
  AC-002.2  Given 100.00 outstanding and 40.00 already credited When 70.00 is credited Then rejected

## Non-functional requirements

NFR-001  Latency: p95 under 200 ms at 50 requests per second at the service boundary.

## Placement

| REQ | Rule | Home | Layer |
| --- | --- | --- | --- |
| REQ-001 | An issued invoice accepts a credit note | `Invoice.applyCredit` | domain |
| REQ-002 | Credits never exceed the outstanding amount | `Invoice.applyCredit` (INV-002) | domain |
| NFR-001 | The issue path stays inside its latency budget | `IssueCreditNote` | application |

## Scope

src/billing/**, tests/billing/**

## Out of scope

- Partial credit against individual line items.
- Multi-currency credit notes.

---

# Review

## Findings

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 1 | DEFECT | BLOCKER | Cumulative credits compared to total | confirmed by `pytest tests/billing/test_credit.py::test_exceeds_cumulative` | fixed |
| 2 | NOISE | MINOR | Prefers a guard clause | — | discarded: style, not a plan violation |

## Proof

| Requirement | Proof | Result |
| --- | --- | --- |
| REQ-001 | `pytest tests/billing/test_issue.py::test_credit_on_issued` | pass |
| REQ-002 | `pytest tests/billing/test_credit.py::test_exceeds_cumulative` | pass |
| NFR-001 | `python scripts/bench.py --rps 50`, p95 148 ms on staging | pass |

## Verdict

Delivered
