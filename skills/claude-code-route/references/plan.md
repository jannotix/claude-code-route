# Plan

The Planner decides two things: what must be true, and where each rule lives. It writes no source.

Everything here serves one property — that "done" can be checked by someone who did not build the
thing, and that a rule has a home before anyone writes it.

## Depth, decided once

> If this is wrong, who finds out, and how long does it take to undo?

| Answer | Depth |
| --- | --- |
| Nobody, or the team at the next test run. Undo is a revert | Light |
| Users, when the new behaviour surprises them. Undo is a revert | Standard |
| A consumer we do not control, or the data itself. Undo needs a plan | Guarded |

Guarded triggers, without exception: a new bounded context or behaviour moving between contexts; a
published API changing in any way including an added field; a persisted schema change, including
one an ORM applies for you; a change to an emitted event, queue message, file format or export; any
migration or backfill; a change to an authorisation rule or a trust boundary; replacing a dependency
that appears in a public type signature.

Guarded additionally requires a compatibility plan (the expand, migrate, contract sequence and what
each step deploys alongside), a rollback statement (what happens to data written by the new code if
the old code returns — "we would roll forward" is valid if it says why and what the exposure is),
and an ADR.

**Traps.** The small contract change: renaming a response field is one line here and a broken client
elsewhere. The refactor that is a rewrite: moving code across a context boundary changes who owns a
rule. The migration hiding in a feature: a new non-null column on a populated table is a migration.
The chain of small ones: five Light changes to the same aggregate in one session are a Standard
that was never planned — if the third is bending the model, stop and plan the whole thing.

If the ground turns out to be different, re-state the depth in one line and continue. Finishing
silently at the original depth is the failure this rule prevents.

## Survey, before requirements

The Planner reads before it writes, and reads the map before the code.

- Locate the code that owns the behaviour today. Read it, and read its callers.
- Name the bounded context it lands in. If two contexts could own it, that is a boundary finding.
- Collect the vocabulary already in use — types, modules, tables, endpoints, events. The change
  adopts it or renames it deliberately and everywhere.
- List what already does part of the job.
- List the contracts in the blast radius.

Budget discipline for this step is in [memory.md](memory.md). On a large codebase, `MAP.md` answers
most of it without opening a file.

## Requirements

One statement of intent, in the domain's language, that a reader can disprove.

```
REQ-004  A credit note must not exceed the outstanding amount of the invoice it credits.
  AC-004.1  Given an invoice with 100.00 outstanding
            When a credit note of 120.00 is issued against it
            Then the issue is rejected with CREDIT_EXCEEDS_OUTSTANDING and no credit note exists
  AC-004.2  Given an invoice with 100.00 outstanding and a 40.00 credit note already issued
            When a credit note of 70.00 is issued against it
            Then the issue is rejected
```

`AC-004.2` is the one that matters. A single happy-path criterion produces code that satisfies the
example and violates the rule. Write the criterion that catches the naive implementation.

Three questions before a requirement is written down:

1. **Can it be false?** "The system must be robust" cannot. Replace it with the measurement that
   made you write it, or delete it.
2. **Is it in the domain's language?** "The `CreditNote` service must call `validateAmount`" is a
   design note wearing a requirement's number. Requirements survive a rewrite; that does not.
3. **Does it say one thing?** A requirement with "and" in it is usually two, and one of them ships.

Criteria name observable state and observable failures. `Then the amount is validated` is not
observable. `Then the issue is rejected with CREDIT_EXCEEDS_OUTSTANDING` is.

## Identifiers

| Prefix | For | Uniqueness | Mutability |
| --- | --- | --- | --- |
| `REQ-nnn` | Functional requirement | within the plan | never reused after withdrawal |
| `NFR-nnn` | Non-functional requirement | within the plan | never reused |
| `AC-nnn.n` | Acceptance criterion | within its requirement | free |
| `INV-nnn` | Domain invariant | within the context | never reused |
| `ASSUMPTION-nnn` | Rule decided without confirmation | within the plan | resolved, never deleted |
| `ADR-nnnn` | Decision expensive to reverse | repository | immutable once accepted |

A withdrawn requirement leaves a documented hole: `REQ-003 withdrawn 2026-03-11, superseded by
REQ-009`. Renumbering breaks every reference in every commit message, test name and review comment
that ever pointed at it.

## Non-functional requirements

An NFR without a number is a wish.

| Instead of | Write |
| --- | --- |
| must be fast | p95 under 200 ms at 50 requests per second, at the service boundary |
| must scale | correct at 10 000 line items per invoice; degradation above that is documented |
| must be secure | only a principal holding `billing:write` in the invoice's tenant may issue; cross-tenant attempts are denied and audited |
| must be reliable | at-least-once delivery; the consumer is idempotent on `creditNoteId` |
| must be auditable | actor, timestamp, before and after amount recorded on issue and void, retained 7 years |

Categories worth a deliberate yes or no on enterprise work: latency, throughput, data volume,
concurrency and idempotency, availability and degradation, authentication and authorisation, audit
and retention, data residency and personal data, internationalisation and time zones,
observability, backward compatibility. Most will not apply. Writing `not applicable` is a decision;
leaving one out is a gap that surfaces in production.

## Out of scope

Non-empty above Light. It is what refuses scope creep later without re-litigating.

```
Out of scope
- Partial credit against individual line items. Whole-invoice only in this change.
- Automatic re-issue of the corrected invoice. Manual, this change.
- Multi-currency credit notes. The invoice's currency is used.
```

Each line is a decision someone could otherwise assume went the other way. "Advanced features"
excludes nothing.

## Placement — where the rule lives

This is the Plan gate, and the reason a specification alone is not enough.

| REQ | Rule | Home | Layer |
| --- | --- | --- | --- |
| REQ-001 | An issued invoice accepts a credit note | `Invoice.applyCredit` | domain |
| REQ-004 | A credit note never exceeds the outstanding amount | `Invoice.applyCredit` (INV-002) | domain |
| REQ-006 | Only `billing:write` in the tenant may issue | `IssueCreditNote` use case | application |
| REQ-007 | The provider's rejection maps to `CREDIT_REJECTED` | `StripeCreditAdapter` | infrastructure |

Every requirement appears exactly once. A requirement that resists placement is usually two
requirements, or one that was never falsifiable.

### Deciding the layer

```
interface        HTTP handlers, CLI, UI, message consumers
   ↓
application      use cases, transaction boundaries, orchestration, authorisation
   ↓
domain           entities, value objects, aggregates, domain services, events   ← no I/O, no framework
   ↑
infrastructure   repositories, adapters, clients, persistence mapping
```

Dependencies point inward. Infrastructure implements interfaces the domain declares; the domain
never imports infrastructure.

| Question | Layer |
| --- | --- |
| A rule always true of the data | domain — enforce it in the aggregate |
| A rule spanning several aggregates | domain service if it is a domain rule, application if it is orchestration |
| A rule depending on the caller's identity | application — authorisation is not a domain invariant |
| A rule imposed by a vendor's API | infrastructure, behind the port |
| Validation of input shape | interface — format is not a domain concern; a well-formed but forbidden value is |
| A computation the business would recognise | domain, even if it is one line |

**Value objects are the cheapest correctness available.** `Money`, `TaxRate`, `EmailAddress`,
`InvoiceNumber` — immutable, validated at construction, compared by value. A domain passing
`decimal` and `string` around has moved every rounding and validation rule into its callers.

## Ubiquitous language

One term, one meaning, one symbol, everywhere: conversation, plan, class, table, endpoint, event,
log line. Record additions in `MAP.md`.

- **A term meaning two things is two terms.** "Order" in Sales is a customer commitment; in
  Fulfilment it is packages with an address. Name them apart, or let the boundary translate.
- **The business's word wins.** If finance says *credit note*, the class is `CreditNote`. Translating
  in your head between the conversation and the code means the code has the wrong name.
- **A word the business does not use is a smell.** `InvoiceManager`, `OrderData`, `PaymentHelper`
  name nothing in the domain; they are containers for rules that were never placed.
- **Rename everywhere or nowhere.** A partial rename leaves two vocabularies and a permanent tax.

## Aggregates and invariants

An aggregate is a cluster treated as one unit for changes, with a root that is the only way in.

1. **Protect an invariant, or do not exist.** Boundaries drawn around "things that feel related"
   produce large aggregates and contention.
2. **One transaction, one aggregate.** If a use case must change two atomically, either the
   boundary is wrong or the consistency is eventual. Decide which and write it down. "It works
   because it is one database" is not a decision.
3. **Reference other aggregates by identity.** Hold `customerId`, not `Customer`.
4. **Small is correct.** The aggregate is the unit of concurrency. One that grows with usage becomes
   a lock the system queues behind.
5. **The root enforces, the caller asks.** `invoice.applyCredit(amount)` — never read, compute,
   write back, which moves the rule into the caller, once per caller.

```
INV-002  Credits against an invoice never exceed its issued total.   Owner: Invoice
```

An invariant with two owners is enforced twice and drifts. With none, it is enforced by convention.

**Domain events** name a fact in the past tense — `InvoiceIssued`, `CreditNoteApplied`. An event
carries what a consumer needs to react, not the whole aggregate. An event is a fact, not a command.
Published events are contracts, so changing one is Guarded.

## Bounded contexts

Find boundaries where language shifts, rates of change differ, owners differ, or two things never
need to change atomically.

| Relationship | When | Cost |
| --- | --- | --- |
| **Anti-corruption layer** | Their model would damage yours and you cannot change it | A translation layer you own |
| **Conformist** | You accept their model because negotiating is not worth it | Their changes become yours |
| **Customer / supplier** | Downstream influences upstream's roadmap | Coordination |
| **Published language** | Several consumers, one documented contract | The contract becomes versioned |
| **Shared kernel** | A small model deliberately shared | Every change needs both teams |
| **Separate ways** | Integration costs more than duplication | Duplication, honestly chosen |

Default to an anti-corruption layer at any boundary you do not control. It is the cheapest insurance
here and the one most often skipped, because the vendor's SDK types are right there and they
compile.

**Premature splitting** buys distributed-systems problems in exchange for diagrams. One
well-modelled context, split when the language actually diverges.

## Failure modes

**Anemic domain.** Entities with getters and setters, rules in services. The signal: a service reads
an entity's fields, decides, and writes fields back. This is the single most common way an
enterprise codebase loses its model, and the placement table is the defence.

**God aggregate.** One root owning everything reachable from it. Loading it touches a dozen tables
and two unrelated use cases block each other. Split on invariants.

**Repository per entity.** One repository per aggregate root, not per table. A repository for a child
entity is a way to modify it without the root, which is a way to violate the invariant the root
exists to protect.

**Leaked persistence.** ORM annotations and nullable columns shaping domain types. The domain then
models the database, and every schema change is a domain change.

**Leaked vendor model.** A provider's DTO in the domain. Their next version becomes your refactor.

## Retrofit — an undocumented codebase

Plan only the slice this change touches. A repository-wide retrofit is a different project.

1. Read the tests first. A test asserting a rule is the closest thing to a written requirement the
   codebase has.
2. Mark inference as inference: `REQ-004 [inferred from InvoiceService.applyCredit:88, no test]`. An
   inferred requirement is a question addressed to a human.
3. Where behaviour looks wrong, write the requirement as the code behaves and flag it. Correcting it
   silently turns your reading into an unannounced behaviour change.
4. Do not specify what you did not read. Absence is honest; invention is not.

## Amending after a review

The Planner is re-entered when a finding is `UNDERSPECIFIED` or `WRONG-PLAN`, or when the repeat
rule fires.

- `UNDERSPECIFIED` → add the missing requirement, place it, and record it as `ASSUMPTION-nnn` with
  what would confirm it. Announce it in one line. Do not resolve it by choosing whichever option is
  easier to build and staying quiet.
- `WRONG-PLAN` → re-read the user's original request, verbatim, before amending. The plan drifted
  from it; re-deriving from the plan repeats the drift.
- The amendment records what changed and what it was: `REQ-004 amended 2026-03-11: outstanding
  amount, was invoice total.`

One plan revision per cycle. A second means the request itself is ambiguous — stop and ask the
user, because further guessing costs more than a question.
