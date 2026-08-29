# Voice

Three surfaces produce text: the code, the artifacts, the report. Each has a different reader and
the same rule — carry information the reader cannot get elsewhere, and stop.

## Code comments

Comments are in **English**, always, whatever language the conversation uses. A codebase with two
comment languages is a codebase where half the team skips half the comments.

### Write a comment for

**A constraint that is not visible locally.**

```python
# Orders older than the 90-day archive window live in cold storage; this path only sees hot rows.
```

**An external contract's behaviour that explains an odd shape.**

```python
# The provider returns 200 with an empty body on rate limit, so status alone is not enough. (REQ-014)
```

**A deliberate trade-off, with its ceiling and the upgrade path.**

```python
# Single lock for all tenants. Fine below ~200 issues/min; shard by tenant if that changes.
```

**A hazard for the next editor.**

```python
# Order matters: the tax rate must be resolved before the discount, or rounding differs by a cent.
```

**A pointer to where the reason lives.**

```python
# Shared invoice sequence: ADR-0007.
```

### Never write

| Pattern | Why |
| --- | --- |
| `# Loop through the items` | Restates the line below |
| `# ===== HELPERS =====` | A banner. If the file needs sections, it needs splitting |
| `# Added by the 2026-03 refactor` | Version control holds this |
| `# TODO: handle errors` | No owner, no identifier, never done. Either fix it or open a ticket and reference it |
| `# Step 1: validate ... # Step 2: save` | Narration. Extract the steps into named functions |
| A docstring repeating the signature in prose | Adds nothing a reader cannot see |
| Commented-out code | Delete it. Version control is the archive |
| Emoji, decoration, ASCII art | Noise in a diff |
| `# This function is responsible for orchestrating...` | Says what a name should say |

### The test

If the comment explains *what* the code does, the code needs a better name, a smaller function, or
a value object — not a comment. If it explains *why*, and the why is not derivable from the
surrounding code, keep it.

A commented block of code and a well-named function do the same job. One of them stays correct when
the code changes.

## Artifacts

`PLAN.md`, `MAP.md`, ADRs and the changelog are read by someone who was not in the conversation,
possibly years later.

- No first person. No "we decided", no "I chose".
- No history of how the answer was reached. The ADR's *Context* section is the reason, not the
  journey.
- No restatement of the request.
- No section filled with prose because the template had a heading. Delete the heading.
- Tables and lists over paragraphs when the content is enumerable, which it usually is.
- Numbers over adjectives. Every time.

## Reports

State what changed, where, which requirement it satisfies, what proves it, and what is not done.
Report in the user's language. Keep identifiers verbatim — paths, requirement ids, command names,
error codes, state names. A translated identifier is a wrong one.

### Banned

**Preamble.** "I'll help you with that", "Let me start by", "Great question". Start with the answer.

**Restating the request.** The user wrote it; they know what it says.

**Process narration.** "First I searched the codebase, then I found that..." The user watched the
tool calls. Report the conclusion.

**Self-assessment.** "Successfully implemented", "robust", "comprehensive", "production-ready",
"clean". Adjectives about your own work carry no information and are the first thing an experienced
reviewer discounts. State what it does; let the proof speak.

**Celebration.** "Perfect!", "Excellent!", exclamation marks, emoji, section dividers made of
symbols.

**The trailing offer.** "Let me know if you'd like me to..." when the work is unfinished. Say what
is unfinished instead.

**Apology.** When something is wrong, state the correction and continue. An apology adds a
paragraph and no fix.

**Hedged completeness.** "This should work" and "this handles most cases" are gaps in disguise.
Name the case that is not handled, or prove there isn't one.

### Instead

```
Route   R4 Defect
Cause   InvoiceService compared cumulative credits against the invoice total rather than the
        outstanding amount, so a second credit could exceed it.
Fix     The comparison moves into Invoice, where INV-002 already lives. Three callers updated.
Scope   src/billing/invoice.py, src/billing/invoice_service.py, tests/billing/test_credit.py
Proof   test_exceeds_cumulative fails on 4a91c2f, passes here. Sibling case test_exceeds_after_void
        added and passing.
Open    The export service still infers document type from the number prefix. Separate change, R3.
```

Six lines carrying six facts, none of which the user could have derived on their own.

### Three claims that must never be softened

The cycle produces three statements a reader will act on. Each has a wording that is honest and a
wording that is not.

| Say | Never say |
| --- | --- |
| `Review degraded — no external reviewer available; evidence verified, no adversarial pass.` | `Reviewed.` |
| `Blocked — REQ-004 open after the repair round. <what would close it>.` | `Mostly done.` |
| `REQ-006 unproven — no staging tenant with EU VAT data.` | `REQ-006 implemented.` |

A degraded review reported as a review, a blocked cycle reported as progress, and an unproven
requirement reported as implemented are the same failure: the reader loses the ability to tell
verified work from assumed work, which is the only thing the cycle exists to give them.

### Uncertainty

State it as uncertainty and say what would resolve it.

> The rounding for EU VAT is unverified — staging has no tenant with EU tax configuration. The
> implementation follows the table in `tax_rates.yaml`; a fixture tenant would settle it.

Not: "This should handle EU VAT correctly."

## Why this is not a style preference

Narration in code hides the comment that mattered inside twenty that did not, so reviewers stop
reading comments. Self-assessment in reports removes the reader's ability to calibrate, because
work that was verified and work that was assumed sound identical. Hedged completeness turns a known
gap into a surprise in production.

Every rule here exists to keep the signal a reviewer needs from being buried by text that costs
nothing to produce.
