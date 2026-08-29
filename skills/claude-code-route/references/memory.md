# Memory and budget

A codebase larger than the context window cannot be read. An agent that greps blindly re-discovers
the same structure every session and pays for it every session. This is where the cycle's token
budget is won or lost.

The answer is not a summary of the codebase. It is an **index**: a small file that says where things
are, so two files get read instead of forty getting grepped.

## MAP.md

One per repository, at `docs/route/MAP.md` or wherever the repository already keeps such a thing.

**Capped at roughly 400 lines.** A map that grows without limit stops being cheap, which defeats
its purpose. When it would exceed the cap, split it by bounded context or prune the entries nothing
has touched in months. A pruned entry is not lost — it is re-derivable by the same means it was
built.

What it holds, and nothing else:

| Section | Answers | Form |
| --- | --- | --- |
| **Contexts** | Which part of the tree owns what | context → root paths → what it is authoritative for |
| **Entry points** | How work enters the system | route, CLI command, consumer, scheduled job → handler `path:line` |
| **Seams** | *Where do I edit to change X* | behaviour → the file and symbol that owns it |
| **Language** | The business term and its symbol | term → symbol → `path` |
| **Invariant owners** | Which symbol enforces which rule | `INV-nnn` → symbol → `path:line` |
| **Landmines** | What will bite you | generated files, files not to edit by hand, known hazards |

**Seams is the section that pays.** Everything else is orientation; seams is the answer to the
question actually being asked. An entry is one line:

```
Credit note issuing        src/billing/invoice.py:88 Invoice.applyCredit        @ 4a91c2f
Invoice numbering          src/billing/sequence.py:24 InvoiceNumberSequence     @ 4a91c2f
Webhook signature check    src/api/webhooks/verify.py:12 verify_signature       @ 7b02de1
```

Every line carries `path:line`, a symbol, and **the revision it was verified at**. The revision is
what makes the map honest.

## Staleness

A map entry is a **hint, not a fact**. Code moves; the map does not move with it.

- Confirm an entry before relying on it: read the range it points at, not the whole file. One read,
  a few hundred tokens, and either the symbol is there or the entry is stale.
- A stale entry is corrected in place with the current revision, not deleted. The behaviour still
  exists somewhere; finding it once and recording it is the work.
- Never let a stale entry stand after finding it wrong. A trusted wrong map is worse than no map,
  and the failure is silent.

## Building it without reading the codebase

Bootstrap deterministically. `scripts/route-map.mjs` reads directory structure, file sizes, git
churn and manifests — never file bodies — and emits the skeleton: module tree, hot paths by change
frequency, entry-point candidates by convention, test-to-source ratio, largest files, dependency
manifests.

```bash
node scripts/route-map.mjs . > docs/route/MAP.md
```

That costs the session the output only — a few thousand tokens for a repository of any size,
because no file content passes through the model.

Then enrich **incrementally, never in a sweep**:

1. Each cycle, the Planner surveys the area it is about to touch anyway.
2. What it learns — the seam, the owning symbol, the invariant, the landmine — is appended to the
   map, with the current revision.
3. After roughly ten changes the map covers the hot paths, which is where most work lands.

A full-repository indexing pass is never run. It costs a fortune, and most of what it produces is
about code nobody will touch this quarter. Change frequency is the correct priority signal and it is
free: `git log --format= --name-only | sort | uniq -c | sort -rn` ranks the files that matter.

## Cold start

No map, and a codebase too large to read:

1. Run the generator. Read its output. That is the orientation.
2. Grep for the **shape** of the thing, not the word: `class Invoice`, `def apply_credit`,
   `router.post`, not `credit`. A word-grep on a large codebase returns hundreds of lines of which
   two matter.
3. Read the two files the grep points at. Not their directories.
4. Record what you found in the map before starting Execute. The next session inherits it, and that
   is the only thing that makes the second change cheaper than the first.

## Reading discipline

These are the rules that keep a cycle at the cost of an ordinary session.

- **The map before the code.** Always.
- **Read a file once.** Needing it twice means too little was extracted the first time. Extract what
  the plan needs, not what is interesting.
- **Read ranges, not files,** when the symbol is known. A 2000-line file read for one function is
  1900 lines of waste that stay in context for the rest of the session.
- **Never re-read a file after editing it.** The edit reported its own success or failure.
- **Never re-read to verify your own change.** Run the test instead: it is cheaper and it is
  evidence, which reading is not.
- **Grep with a shape.** Anchored, with a file-type filter, with a bounded result count.
- **Do not paste file contents into a report.** Cite `path:line`.
- **Do not open a directory listing you will not use.** A recursive listing of a large tree is
  thousands of tokens of paths nobody reads.

## Plan-side budget

- **The plan is shorter than the diff.** A plan longer than the code it governs cost more than it
  saved. If it is running long, the change is too big for one cycle — split it.
- **Light depth writes no file.** Five lines in chat.
- **Load at most one reference per cycle**, and only when the role's gate is genuinely in doubt.
  `SKILL.md` alone is enough for Light and Standard end to end.
- **Templates are shapes, not forms.** A section with nothing to say is deleted, not filled.

## Review-side budget

The external reviewer is **token-positive for this session**. It receives paths on disk and returns
a findings list — one or two thousand tokens in. Self-review means pulling the entire diff back into
context to perform the weakest form of review there is, for ten to thirty times the cost.

The external cost lands on the other account. Say so; do not present it as free.

**One repair round** caps the worst case at two executions. Most cycles run once: the repair round
exists for when the review finds something, not as a routine second pass.

## The accounting

The cycle spends tokens on a plan and a review. It recovers them from three places:

| Recovered from | Mechanism |
| --- | --- |
| Re-exploration | The map answers what a grep sweep would answer, at a fraction of the cost, and it compounds across sessions |
| Rework | Code that ships broken costs three to five debugging rounds. A requirement with a home and an executed proof mostly does not ship broken |
| Re-derivation | The plan holds the requirements. Without it they are re-derived from the conversation every time context is compacted |

No figure is published for this, because none has been measured, and an unmeasured number in a
README is a false claim. The mechanism is stated so it can be checked on your own repository.

**The honest failure mode:** a cycle on a Light change with a cold map and a long plan costs more
than an ordinary session. That is what the depth classification and the plan-shorter-than-the-diff
rule exist to prevent. If a cycle costs more than the change deserved, the depth was wrong.
