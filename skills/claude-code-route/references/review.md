# Review

The Reviewer decides whether the plan is true of the code. It edits nothing.

One rule outranks everything else here: **nothing closes on a read.** A requirement closes on a test
that ran, a command whose output is recorded, or a flow that was driven. Reading the diff and
concluding it is correct is the failure this role exists to prevent, and it is the failure that
ships broken code with a confident summary.

## Freeze first

```bash
mkdir -p .route && git add -A && git diff --cached > .route/candidate.patch
wc -l .route/candidate.patch
```

**Stage before diffing.** `git diff` omits untracked files, which is every file of a new capability.
The patch comes out empty, the reviewer finds nothing in it, and the PASS it returns is about
nothing. Read the line count before sending: an empty patch is a broken freeze, not a small change.

Without a freeze the reviewer judges bytes that move underneath it, and a finding cites a line
number that no longer means anything. Check `.route/` is ignored by git; if it is not, say so and
leave `.gitignore` alone.

## Latency

An external model at high reasoning effort takes minutes on a real candidate, not seconds — seven
to ten on a few hundred lines is ordinary. Run it in the background and poll for completion rather
than blocking a foreground call that will time out and lose the work.

If the reviewer times out or dies, the review did not happen. Say so and fall back to the degraded
path; do not report the absence of findings as a PASS.

Disable the reviewer tool's own extensions where the flag exists. A reviewer that loads its own
review skill is answering a prompt you did not write, and paying for it.

## Choosing a reviewer

A model reviewing its own output shares its blind spots. A different family has different ones, so
prefer one when it is available.

| Order | Reviewer | Requirement |
| --- | --- | --- |
| 1 | The user's configured external CLI | whatever they named |
| 2 | Codex CLI — `codex exec --sandbox read-only "<prompt>"` | a ChatGPT login |
| 3 | Gemini — REST or CLI | `GEMINI_API_KEY` |
| 4 | OpenRouter — REST, any non-Anthropic model | `OPENROUTER_API_KEY` |
| 5 | A local model through Ollama | a pulled model; weaker, and say so |
| 6 | None available | degrade, see below |

Probe, do not assume. One cheap `--version` or `--help` decides it; a review that hangs on a missing
login costs more than the check. If the user named several, run them in parallel and deduplicate:
same file and same problem is one finding, keeping the higher severity.

The reviewer runs **read-only**. Only the Executor writes. Enforce it through the tool's own sandbox
flag rather than through the prompt, because a prompt is a request and a flag is a constraint.

### The degraded review

No external model, or every backend unreachable: the Reviewer role does one thing and says it did
only that.

- Confirm every proof **ran**, from its recorded output, not from its existence.
- Confirm every proof **asserts its requirement** — a test named for `REQ-004` that never exercises
  the cumulative case does not close `REQ-004`.
- Confirm the placement table matches where the code actually put each rule.

It does not hunt for defects, because a context cannot surprise itself. The report says
`Review degraded — no external reviewer available; evidence verified, no adversarial pass.` Never
present it as a cross-model review. What was lost is the ability to find what the plan did not think
of, and that loss is real.

## What the reviewer receives

`PLAN.md`, `candidate.patch`, and the evidence already produced — recorded commands and their
output.

**Never** the conversation, the Executor's reasoning, or any justification for why the code is
shaped the way it is. Give a reviewer the justification and it becomes an approver. The reviewer's
job is to read the contract and the artifact and find the distance between them.

Everything it needs is on disk. That is why this costs the session almost nothing: paths go out, a
findings list comes back.

## The prompt

Adapt the file references, not the tenor.

```
You are reviewing work produced by another AI agent against the plan it was given.
Your task is to find where the work does NOT match the plan. You are not here to
approve it.

PLAN:      <contents of PLAN.md>
CANDIDATE: <contents of candidate.patch>
EVIDENCE:  <recorded commands and their output>

Attack on three axes, in this order:

1. CONTRACT   A requirement in the plan that the code does not satisfy, or
              behaviour in the diff that no requirement asked for.
2. EVIDENCE   A proof that never ran, or that does not actually assert the
              requirement it is claimed for. A test that would pass with the
              change reverted proves nothing.
3. PLACEMENT  The plan's placement table gives each rule a home. Find rules
              implemented somewhere other than the home the plan assigned.

Every finding must carry:
  CLASS      one of DEFECT, UNPROVEN, MISPLACED, SCOPE, UNDERSPECIFIED,
             WRONG-PLAN, NOISE
  SEVERITY   BLOCKER, MAJOR or MINOR
  EVIDENCE   exact file and line, or exact quote
  VERIFY     one command or step anyone can run to confirm it

Class definitions:
  DEFECT          the code does not do what the plan says
  UNPROVEN        the plan says it, nothing executed proves it
  MISPLACED       right behaviour, wrong home
  SCOPE           the diff does what no requirement asked for
  UNDERSPECIFIED  the code had to decide a rule the plan does not contain
  WRONG-PLAN      the plan itself does not satisfy the original request quoted in it
  NOISE           style preference, not a violation of the plan

No style opinions outside NOISE. If after a genuine attack you find nothing,
answer PASS and list what you attacked and why each held. A PASS with no list
is invalid.

Output format:

## Findings
### [CLASS] [SEVERITY] short title
- Evidence: ...
- Verify: ...

## PASS
- Attacked: ... -> held because ...
```

## Handling findings

**A finding is a claim, not a truth.** Reviewers hallucinate, and acting on an unconfirmed finding
is the most expensive thing in the cycle: code changes and nothing is fixed.

For each finding, in severity order:

1. **Run its VERIFY step.** Always, before touching anything.
2. Confirmed → route it by class and fix it at the root.
3. Not confirmed → **refuted**. Record the counter-evidence: the command, its output, the quote from
   the plan. A refuted finding returns only with new evidence.
4. `NOISE` → discarded, with the reason in one line. Do not silently drop it; a discarded finding
   the user never sees is indistinguishable from one that was missed.

### Routing

**If the fix changes what must be true, it goes to Plan. If it changes only what was done, it goes
to Execute.**

| Class | Goes to |
| --- | --- |
| `DEFECT`, `UNPROVEN`, `MISPLACED`, `SCOPE` | Execute |
| `UNDERSPECIFIED`, `WRONG-PLAN` | Plan |

**The repeat rule.** The second time the same requirement produces a finding, it goes to Plan
whatever its class. Two findings on one requirement mean the requirement is the problem. The classic
loop failure is an `UNDERSPECIFIED` misfiled as a `DEFECT`: the Executor patches, invents the
missing rule at the keyboard, and the same thing returns next round somewhere else.

The Executor applies the same rule from its side. A repair that would require inventing a business
rule is not a repair, whatever class the reviewer gave it.

### Budget

One repair round. `Plan → Execute → Review → Execute → Review`, then the cycle stops.

- Anything still open → **blocked**. Work preserved, report states exactly what is open and what
  would close it. Blocked is an outcome, and reporting it plainly is the point.
- Back to Plan → the Planner amends, the repair budget resets, and the single plan revision is
  spent. A second revision does not happen: stop and ask the user.

## Proof by layer

Prove each rule at the layer that owns it. A domain rule proven only through an HTTP round trip is
slow, brittle, and silent about which of six components enforced it.

| What | Proof that counts | Not proof |
| --- | --- | --- |
| Domain invariant | Unit test on the aggregate, including the rejection | A test of the service that calls it |
| Value object | Construction rejected for invalid input | Type annotations |
| Use case | Application test with real collaborators or contract-verified fakes | Every collaborator mocked to return the expected value |
| HTTP contract | Status, body and error shape asserted, plus one rejection | A test asserting only 200 |
| Persistence | Query run against a real database engine | An in-memory substitute with different semantics |
| Migration | Applied forward and rolled back against representative rows | The migration file existing |
| Authorisation | The denial actually happening for a principal who should be denied | The allowed path passing |
| Event contract | The emitted payload asserted field by field | The publisher being called |
| Latency or volume | A measurement, with load, environment and percentile | An opinion about complexity |
| Concurrency | Two racing operations, one rejected or serialised as specified | Reasoning about the lock |
| UI behaviour | The flow driven, asserting the state a user would see | The component rendering |
| Build or packaging | Installed and started from the built artifact | The build succeeding |

**A mock asserts that your code called something.** It cannot assert that the something behaves that
way. Mock at a boundary you do not own, and verify that boundary separately. Mocking your own
repository and asserting it was called proves the test matches the code, which is true of every test
written after the code.

**A defect fix ships with a test that fails on the pre-fix revision.** Run it there and record it:

```
PROOF-1  tests/billing/test_credit.py::test_exceeds_cumulative
         fails on 4a91c2f, passes on this change
```

If it passes on the old code, the test does not describe the defect. Add the sibling case too: the
report named one input, the root cause covers a family.

## What the linter accepts as a proof

`route-lint` cannot run your proof, and no string can prove that something ran. So it does not try
to infer execution. It checks one decidable thing: whether the cell names a command a reader could
run. A backticked span closes a requirement when

- its first word is a program the tool knows — `pytest`, `npm test`, `make check`, `dotnet test`,
  `docker compose up -d` — with or without arguments; or
- it begins with `$ `, which declares the rest a command you ran: `$ ./bin/verify --all`. Use it for
  anything the list has never heard of. The marker must be followed by a program: `$ # a comment`
  marks nothing.

Everything else is refused, including things that look technical. `README.md` is a filename.
`pass/fail` is two words with a slash. `e.g. checked` is prose. None of them is a command.

Judgement is refused separately and outright: *by inspection*, *reviewed*, *looks correct*,
*should work*, *n/a*.

**Why the rule is this blunt.** Four review rounds attacked an earlier version that tried to infer
execution from a span's characters — a path separator, a colon pair, a file extension. Each round
found a new phrase that satisfied the shape without being a command, and each repair widened the
surface for the next. The inference is gone because the question it was answering is not decidable
from a string. Naming a program is.

**It is not a substitute for the reviewer.** A test named for a requirement it never exercises names
a real command and passes the linter. The linter checks that a proof was named; only an execution
and a reviewer check that it is the right one.

## Before you send the candidate

Empty `.route/` of the previous round's transcripts. A reviewer given a directory of them will read
them: on this project one round spent its entire budget grepping 300 KB of earlier reviews before it
reached the diff, and returned nothing.

```bash
rm -f .route/*.txt && git add -A && git diff --cached > .route/candidate.patch
```

## Named gaps

A requirement that could not be proven is written out, not omitted:

```
REQ-006 unproven. EU VAT rounding needs a tenant with EU tax configuration; staging has none.
        Verified against the tax table by inspection only. Needs a fixture tenant before release.
```

A named gap is engineering. An unnamed gap is a claim that the work is finished. Manual verification
is acceptable where automation is disproportionate, recorded as steps, inputs, observed output and
date — which is what makes it repeatable by someone else.

## Record

**Always:** amend the plan to what was actually built. A deviation is a plan change, not silent
drift. A plan that no longer matches the code is worse than none, because the next reader trusts it.

**Guarded:** an ADR. Numbered, dated, immutable once accepted — a decision that changes gets a new
ADR and the old one becomes `superseded by ADR-nnnn`. Editing history is how a record stops being
trusted.

The two sections that carry the value, and the two most often left out: **alternatives rejected**,
which stops the same debate reopening every year, and **consequences that hurt**. An ADR listing only
benefits is advocacy. Template: [../templates/ADR.md](../templates/ADR.md).

**When a term, a boundary or an invariant owner moved:** update `MAP.md`.

**When users can observe it:** a changelog entry in their terms, not implementation terms. A
breaking change says what breaks, who is affected, and what to do instead.

**Commit message:** subject in the user's terms, body carrying the trace.

```
Reject credit notes exceeding the invoice outstanding amount

REQ-004, INV-002. Cumulative credits were compared against the invoice total rather than the
outstanding amount, so a second credit could exceed it. The check moves into Invoice, where the
invariant already lives; InvoiceService no longer computes it.

Proof: tests/billing/test_credit.py::test_exceeds_cumulative (fails on 4a91c2f)
```

## Verdict

One of three, stated plainly:

- **Delivered** — every requirement closed by an execution, reviewer at PASS or all findings
  resolved.
- **Delivered with gaps** — no blocker open; every gap named on its own line.
- **Blocked** — a blocker survived the repair round, or the plan needs a second revision. Say
  exactly what is open and what would close it.

Report the verdict, the finding counts by class with confirmed and refuted separated, the gaps, and
the plan's path. Do not paste the findings list in full.
