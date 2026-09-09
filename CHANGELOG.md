# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2026-09-12

The lock stops promising what it cannot hold, the receipts 1.1.3 produced about itself, and two
limits named as the host's rather than left as this plugin's.

**Why this is 2.0.0 and not 1.2.0.** Version 1.1.3's shipped reference told operators that a lock is
"reclaimed automatically after thirty seconds". This release removes that, on purpose: reclaiming a
lock cannot tell a dead holder from a slow one, and it took locks away from live writers. But an
automation written against the documented behaviour will now wait out ten seconds and stop instead of
recovering on its own, and that is a break whatever the reason for it. Round 25 found the removal
sitting in a minor version under a changelog that declares Semantic Versioning.

### Added

- **`ROUTE_LOCK_FAULT` makes a lock acquisition fail on purpose.** AC-009 — AC-005.2 when it was written — asked that reintroducing
  the Windows lock defect make the job fail, and the race it rides on was measured at about one writer
  in 250 — a green run and a run with the handling removed look the same. The acquisition can now be
  made to fail with a chosen code, so the branch is driven rather than waited for; `<code>:always`
  makes every acquisition fail. Every claim the lock makes is
removed in turn against 230 passing checks, and each removal fails only what it should, at the
  counts the receipt lists: narrowing the held set to EEXIST at 221/230, removing the guard that
  lets an unexpected code surface at 227/230, putting the deadline back on the wall clock at
  229/230, leaving the cleanup unguarded at 227/230, moving the lock off the path it guards at
  227/230, removing the separator that keeps an entry on a line of its own at 228/230, claiming a
  write before it happened at 229/230. What the lock does not do is written in the plan with the
  round that measured it, not asserted. The criterion was waived for eleven rounds; it is
  closed by execution.
- `HISTORY.jsonl` carries round 19's verdict against the revision it read and 1.1.3's delivery. A
  release produces facts about itself that cannot be written into the commit they describe; they land
  in the next one.

### Removed

- **The lock no longer decides that another process has died** *(breaking: 1.1.3 documented the
  opposite)*. A lock directory older than thirty seconds was deleted and the wait restarted. mtime cannot tell a dead holder from a slow one, so an
  append that ran longer than the window had its lock removed underneath it and a second writer
  entered the file; the deletion was unguarded, so a lock that could not be removed surfaced as an
  uncaught `EPERM`; and the restart skipped the deadline, so a lock that kept looking stale was
  waited on forever. A lock left by a crash now stays until it is removed by hand, which is what the
  message the command prints has always said to do.

### Known

Rounds 27 to 30 attacked what `route-history` trusts about what it reads and writes, and found
thirty-eight things across four rounds. Every one was confirmed by executing its verification step.
Repairing them inside this release was costing more than it returned -- each round's repairs were
where the next round found most of its own findings, and three of them broke what 1.1.3 does
correctly -- so the script here is the one round 27 reviewed, and these are open. The plan carries
each with the round that measured it.

- A log is extended past a line this script cannot use: one that fails to parse, or one that parses
  into something that is not an entry. `42` is valid JSON. The append exits 0 and `verify` then
  reports a break.
- Values the fields cannot hold are recorded: a timestamp that is not one, a day the calendar does
  not have, a count that is not a number, a negative count, and a number too large to record.
- An option present with no value falls back to its default, so `append --file --event ...` writes
  the default history into the working directory.
- A write that fails after its bytes have landed leaves the entry and reports a failure; a caller
  that retries writes it twice, and the chain verifies both.
- A directory that will not allow the lock is reported, after ten seconds, as another append in
  progress.
- No check keeps a shell example runnable. The five that rounds 21 and 22 found are repaired here.

### Fixed

- **An append could corrupt a history that `verify` had just accepted.** A log whose last line has no
  trailing newline — an editor that trims the file, a copy-paste, a tool that rewrites it — is parsed
  correctly and passes `verify`. The append then wrote its entry straight onto that line, putting two
  JSON objects on one physical line: the entry was lost, the chain broke, and the command that broke
  it exited 0. Measured: `verify` 0 breaks, append exit 0, `verify` 1 break. The write is separated
  now, and the suite drives the case. This line is unchanged in 1.0.0, 1.1.0, 1.1.1 and 1.1.3, so it
  is not a regression of this release but a defect every release has carried.
- **An append could spin forever instead of giving up.** A lock acquisition that failed with a code
  meaning the lock is held, in a place where the lock could not then be read — a directory that denies
  both operations — restarted the wait loop without passing the deadline, so the process never exited
  and never wrote. Measured against `C:\Windows\System32`: the append ran past the ten-second timeout
  and had to be killed at twelve seconds. It now exits 3 at the deadline like any other held lock.
- **The ten-second wait was measured on the wall clock**, so a clock that stalls or steps back
  extended it without bound. It is monotonic now, and the suite drives it with `Date.now` frozen.
- **Five shell examples were not runnable as written**, in `SECURITY.md`, `docs/route/README.md` and
  three places in the skill: bash reads an unquoted `<placeholder>` as a redirect, so
  `--slug <plan slug>` tried to read a file called `plan` and stopped there. The placeholders are
  quoted. Nothing yet stops the class returning: three rounds tried to build a check for it and each
  found the previous attempt flagging commands that run, so it is recorded as open rather than
  shipped half working.
- **A check meant to catch a silently lost append passed when one was lost.** It read
  `rows.length === WRITERS || exitCodes.every(...)`, and the second alternative is true whenever no
  writer failed. Comparing totals instead was not enough either — twelve rows from twelve successes
  can hold one writer twice and another not at all — so every writer that succeeded is now looked
  for in the file, once.
- **The lock message names the log as well as the directory to remove.** The lock still guards a
  path: one log addressed by two paths — a hard link, a symlink, a mapped drive — has two locks and
  both writers append. Round 23 named the lock after the file's device and inode to close that, which
  left one inode reached from two directories still holding two locks and required creating the log
  before the lock was taken; round 24 measured both. A history file is addressed by one path, and the
  plan says so rather than promising what the code does not do.
- **A cleanup failure claimed a write that had not happened.** The message added one release earlier,
  to stop a written entry being reported as lost, ran from a `finally` block that is reached whether
  the append returned or threw. It now says only what happened.
- `references/history.md` still promised that a lock is reclaimed automatically after thirty
  seconds. Nothing has done that since this release removed it.

### Changed

- The plan names two things as limits of Claude Code rather than of this plugin, both measured. The
  marketplace installs from the default branch and offers no way to ask for a tag, which is why every
  commit pushed there is a publication — and why 1.1.2's defect, which was not the host's, reached
  anyone who installed during that window. `claude plugin eval` is in early access on this account, so
  the three eval cases are measured by hand.
- The plan says what 1.1.3 shipped with: round 19 reviewed `7fb2b7b`, the tag points at `b19f7d8`,
  and eight of that round's nine repairs reached it. The ninth, a stale count of commit headers, is
  repaired here — the phrase wraps across two lines and the search that looked for it read one line at
  a time.

## [1.1.3] - 2026-09-08

The sixth round found three things in 1.1.2, all confirmed by executing their verification steps and
all three BLOCKER. Two of them are about how that release was published rather than about its code.

### Fixed

- **The check that the marketplace serves this commit proved the version and nothing else.** A copy
  reporting the right version with `Skills (0)` passed it — the step meant to prove the plugin loads
  accepted a plugin that loads nothing, and it ran neither the skill check nor the installed suite.
  It now makes the same three assertions the candidate install makes, over the copy the marketplace
  served, after clearing the cache directory the candidate install left behind.
- **The 1.1.2 entry above claimed a review order that release did not follow**, and carried a finding
  count that stopped being true two rounds after it was written. Both are corrected in place.
- **The check that the marketplace serves this commit compared no trees.** The right version, one
  skill and a passing suite are not identity: a different tree can have all three. It runs the same
  two-way hash comparison the candidate install runs.
- Four figures were written from memory rather than counted — a finding total, a confirmed total, a
  BLOCKER total, and the interval during which 1.1.2 named two trees. All four are measured now, and all
  four were in prose summarising a table that was itself correct.

- **A receipt handed to a reviewer said 53 files where CI had printed 54.** The number was typed. The
  evidence a round receives is generated by a script now, and every figure in it comes from the command
  beside it — including the ones this entry states.

### Added

- **A round states its counts once, and the line is generated from its own table.** Seven wrong
  figures across two releases were all in prose. The first answer read each round summary against its
  table; three rounds then found nine ways past that reader — a summary anywhere in the section, rows
  inside a fence, a fence closed by a shorter one, a lone row taken for a table, an emphasised severity
  made invisible, word numbers stopping at twenty, two counts in one opening. Reading prose robustly is
  open-ended, so nothing is read: the counts come from the table's own columns, the line is written
  into the section, and the check is whether the file already holds what the generator would write. A
  generated line cannot drift from the table it came from. Any other count inside a round section is
  reported, and a figure quoted from elsewhere carries a visible marker, so `git grep quoted` lists
  every exemption anyone took.

- **`docs/route/README.md` said every finding in the linter plan was confirmed by executing its
  verification step.** Its own tables record eleven of forty-six confirmed by reading. That is the rule
  this method exists to enforce, claimed as kept where it was not, in the document that introduces the
  method. Both statements now carry figures counted from the Verified column.

## [1.1.2] - 2026-09-06 — WITHDRAWN

**This version was withdrawn on 2026-09-08.** It named two published trees: commit
`3fb532b` declared 1.1.2 and was the default branch from 2026-09-05T03:05:24+02:00 to
2026-09-06T15:34:23+02:00, and `53f2e77` declares the same version, differs from it in three
files, and is not descended from it. An install during that window received a different
1.1.2. Its tag is deleted, so the version now names no tree rather than two; `53f2e77`
remains reachable from the default branch and re-tagging it would restore what was there.
Its tag object also carried a finding count written from memory. Use 1.1.3 or later.

Five adversarial rounds, run against 1.1.1 and against each repair of it in turn. **Thirty-five
findings: thirty confirmed by executing their verification steps, four by reading, and one refuted
by its own.**
Seventeen were marked BLOCKER, sixteen of them confirmed. The tag for this release was cut while a
sixth round was still running, so the tagged commit itself was reviewed after it was tagged, not
before; and this release's own commit message and tag object carry a finding count that was written
from memory rather than counted. A tag object cannot be edited. Both are recorded in
[the plan](docs/route/plans/release-1-1-0/PLAN.md) and repaired in 1.1.3.

### Fixed

- **The default branch carried a second tree named 1.1.1.** The marketplace serves the default
  branch, so for six commits every install received a tree calling itself a version it was not. Work
  that is not a release now belongs on a branch; every commit on the default branch is a publication.
- **The comparison between the installed copy and the published tree walked one way**, so a file
  missing from the install was invisible while twenty others remained. It walks both sides and
  reports the count on each. Before that it had no count at all, and a walk that found nothing passed
  by construction.
- **The install proof ran on one operating system out of the three the README claims.** It is a
  matrix of three, and a new step runs `claude plugin details`, which makes the CLI resolve the
  manifest and list the skill by name at the published version. Files landing on disk is not the
  plugin working, and until now nothing distinguished the two.
- **The published-directory check skipped every dot-directory** while `.claude-plugin` and `.github`
  ship, counted an indented heading as prose, and accepted an empty README. Published means tracked
  and git is asked; a heading is a heading at any indentation; both directories say what they are.
- **The changelog gate and the directory check lived inline in the workflow**, where the only way to
  exercise them was to push. Both are modules the workflow calls and the suite runs both ways.
- **Nothing read `engines.node`.** Set to `>=20.0.0` against scripts enforcing 18, the suite reported
  every check green. The five declarations of the floor are asserted equal against exact strings, and
  `<=18` and a README reading "Node 18 is unsupported; use Node 20" both fail.
- **Node 18.0.0 had never been run.** The matrix asked for the selector `18`, which resolves to the
  newest 18.x, while the criterion asked for the floor exactly. Both are in the matrix.
- **The assertion that the CLI loads the plugin accepted the wrong plugin.** Unanchored, it passed
  on a skill named `claude-code-route-extra` and on versions `1x1x2` and `1.1.20`. It matches the
  whole line literally, and all three fail.
- **The install proof measured the default branch, not the commit under test.** It added the
  marketplace, which serves the default branch, so a branch push proved some other tree. The
  candidate installs itself from the checkout and is compared both ways against its own SHA;
  the marketplace path still runs where it means something, which is the default branch.
- **The install budget was printed rather than asserted.** The job declares a five-minute
  timeout, so a run over it fails.
- Two plan files carried a `0x08` byte where a backtick belonged.

### Changed

- **A release is now prepared in one order and only one.** The version and the changelog are cut
  first, the adversarial round reviews that exact commit, and the tag points at that same SHA. What a
  release produces about itself — the verdict, the CI run, the history entry authorising the tag —
  cannot be written into the commit being tagged, and lands in the next release instead. Three
  separate rounds found the same defect underneath: a document citing the CI run of its own commit
  cannot be right, because the run happens after the commit. Proof rows name a command that resolves
  against the tag rather than an identifier minted afterwards.
- **A release depends on every acceptance criterion being closed by execution or waived in writing.**
  There is one waiver, recorded in the plan: the Windows lock regression is detected probabilistically
  on a race measured at about one writer in 250, and no green matrix proves it would be caught.
- Criteria that promised more than was built now say what is true: the runtime guard speaks from Node
  14.13.1 upward, measured, because below that the `node:` specifiers are resolved before any
  statement in the file executes; and the directory check reads the top level, which it says.


## [1.1.1] - 2026-09-04

The seventh adversarial round, run against 1.1.0 after it was published, found seventeen things. Seven
were BLOCKER and every one was confirmed by executing its verification step. This release repairs
them.

### Fixed

- **CI could not see a failing installed suite.** The job that proves the installed copy passes ended
  in `node tests/route-lint.test.mjs | tail -1`, and GitHub's default shell is `bash -e` with no
  `pipefail`, so `tail` supplied the exit status. That job was green by construction. Every job now
  declares `shell: bash`, which is `-eo pipefail`.
- **The published tree failed the product's own gate.** NFR-001 said "the published tree" and its
  proof scanned `skills/`; the marketplace publishes everything. Scanning what ships found an error
  and six more warnings than the fourteen that had been ruled on — in a fixture full of deliberate
  defects that shipped to every user. The corpus is written at run time by the test that uses it, so
  it is exercised and nothing defective ships. The gate over the whole tree now reports 0 errors.
- **A two-backtick code span bypassed the rule against backticks in a program.** The scanner matched
  one backtick each side, so `` ``$ foo`bar`` `` was truncated to `$ foo` and accepted as marked —
  with the very character the rule forbids removed by the scanner itself. It reads a fence of N
  backticks now.
- **`comment-commented-code` refused prose beginning with a keyword.** Sentences opening `from` and
  `print` were reported as commented-out code, twice on this project's own tree. A keyword counts only
  alongside a character that code carries and prose does not. This had been recorded as a known gap;
  a release requirement for zero unadjudicated warnings made it a defect.
- The release check that AC-007.2 promised did not exist. It does now: every published directory
  states its purpose in a README, and the check fails when one is removed.
- CI ran only on pushes to `main`, so a branch or tag push proved nothing. It runs on every push.
- The Node matrix omitted the current LTS. It is 18, 22 and 24.

### Changed

- Four acceptance criteria promised more than had been built, and now say what is true: the runtime
  guard cannot fire below Node 14, where the module does not parse; the floor is declared in each
  script rather than in a shared preamble, and a test asserts the three agree; the version window
  between bumping the manifest and cutting the tag is real and must be closed before announcing; and
  the changelog proof cites the committed suite rather than a probe file that never shipped.
- `docs/`, `skills/` and `tests/` carry a README saying what they are.
- The adversarial round runs **before** the tag. In 1.1.0 it was placed after, so it could not prevent
  a bad release — only explain one.


## [1.1.0] - 2026-09-04

### Fixed

- Four more false answers in the proof gate, found by a fifth adversarial round. `$ 2>out` closed a
  requirement, because a digit was accepted as the start of a program name and redirection is not a
  program. `python...` and `python.` matched the `python` runner, whose version pattern was a loose
  character class rather than the shape a version has. A dash, an em dash or an ellipsis counted as
  an invariant owner, because the owner check had its own idea of a placeholder instead of the shared
  one. And, for the first time, a false answer in the other direction: `pytest tests/reviewed/test.py::t`
  was refused as judgement, because the prose pattern matched `reviewed` inside a path. Backticked
  spans are now excluded before that test — a gate that refuses correct work is a gate people switch
  off.

- A proof span naming a runner of one or two characters — `go`, `py`, `sh`, `ab` — was refused by a
  minimum length of three, and `go.mod` was accepted because the runner pattern ended on a word
  boundary rather than on the program. Both were false answers in the gate the skill exists for.
- The `$` marker accepted anything that was not a comment, so `` `$ && checked` `` closed a
  requirement while `` `$ /bin/true` `` did not: a leading slash was read as the start of a comment.
- The Findings table accepted `Verification` and `Result` as aliases for `Verified` and `Outcome`,
  which contradicts the exact-column rule the same check is built on.
- An `Owner` cell separating two names with `/`, `&` or `AND` was read as one owner. The separators
  are now named in the plan rather than invented in the code, and a dotted symbol stays one name.

- `route-history append` crashed with exit 1 under lock contention on Windows, losing the entry it
  was writing. The retry loop treated only `EEXIST` as "somebody holds the lock"; Windows raises
  `EPERM`, and sometimes `EACCES`, for the same condition. Measured at roughly one writer in 250 with
  twelve appending at once — 2 failures in 40 rounds before, 0 in 60 after. The contract has always
  been that a writer which gives up exits 3 and says so; now it does.

### Changed

- The changelog gate fails when `[Unreleased]` holds an entry. It previously checked only that the
  manifest version appeared somewhere in the file, which passed while four commits of user-visible
  behaviour change sat unversioned — the defect that made this release necessary.
- The eval suite is three cases. `comment-voice` was retired after three prompt and grader designs
  failed to separate the arms; the property it measured is real but is not separable by a binary
  rubric on one file. Its prompt, graders and both observed outputs are kept internally as a
  reproduction, and the gap is named in `evals/README.md`.

- The test suite ships with the product. `tests/route-lint.test.mjs` and its fixtures are in the
  repository, so the proofs a plan cites are frozen with the commit that they prove and a reader
  holding only that commit can run them. CI runs the suite on every push, from three working
  directories. What stays unpublished is working notes, which are the only genuinely internal part.

- The test suite states where it is standing. `route-lint` reads `route.config.json` from the working
  directory, which is the point of that file, so the check asserting the built-in default layers now
  runs from a directory that has no config, and a sibling asserts that a config present in the working
  directory replaces them. Run from `production/` — the directory the plan records — the suite used to
  report 140 of 141 while the plan claimed 141. It now reports the same total from the repository root,
  from `production/` and from `prova/`.
- Every eval case carries a `scaffold_script` and builds its own repository.

### Added

- `route-history append --no-operator`, and `ROUTE_NO_OPERATOR` in the environment for a whole
  session or a CI job. The history records `git config user.name` and `user.email` into a file you
  will commit and may publish; until now nothing said so and nothing let you decline. The field is
  omitted entirely rather than blanked, the hash chain verifies either way, and the switch beats an
  explicit `--operator`, because a privacy switch a stale flag can override is not one. `SECURITY.md`
  now says all of this where a reader looks for what leaves their machine.
- A declared runtime floor. The scripts need **Node 18**; the README and the plugin manifest both say
  so, and each script refuses an older runtime by name with exit 2 rather than surfacing a stack
  trace. The guard cannot help below Node 14, where the module does not parse — that limit is stated
  rather than glossed. Claude Code itself requires Node 22, so inside the plugin the floor is already
  met; the lower number matters when the scripts run standalone from a project's own CI.
- `docs/route/README.md`. That directory is the skill used on itself, and it now says so: which plan
  is which, what the history is, and why the author's attribution is published on purpose.
- CI runs the test suite on **Linux, macOS and Windows**, at Node 18 and 22. The lock defect fixed in
  this version was Windows-only and was found by hand; a single-platform matrix could not have caught
  it and now would.
- CI installs the plugin from the marketplace and runs the installed copy's own suite, so a release
  is proven by installing it rather than by inspecting the tree.

- Probes covering every false answer the five review rounds produced, in both directions. The
  executable predicate is checked over 54 spans; the suite is 149 checks.

## [1.0.0] - 2026-08-29

First release.

### Added

**The cycle**

- Three roles in a repeating cycle — Planner, Executor, Reviewer — each with one mandate and one
  gate phrased so a reader who was not present can apply it.
- Three depths selected from blast radius rather than diff size: Light plans in chat, Standard
  writes a plan, Guarded adds a compatibility plan, a rollback statement and an ADR.
- Defects enter at Plan with a reproduction. A plan for a defect nobody can reproduce is a guess.

**The two gates that carry the product**

- **Placement is the Plan gate.** Every requirement names the symbol and the layer that owns it,
  exactly once, before anything is written. A rule with no named home is not planned.
- **Execution is the Review gate.** Nothing closes on a read. A requirement closes on a test that
  ran, a recorded command, or a driven flow.

**Review**

- Cross-model review. An external model of a different family runs read-only, receives the plan, the
  frozen candidate and the evidence, and is asked to refute. It never receives the conversation or
  the reasoning behind the code.
- Three attack axes: contract, evidence, placement.
- Seven finding classes routing each correction deterministically. `DEFECT`, `UNPROVEN`,
  `MISPLACED` and `SCOPE` return to Execute; `UNDERSPECIFIED` and `WRONG-PLAN` return to Plan;
  `NOISE` is discarded with its reason. If the fix changes what must be true it goes to Plan,
  otherwise to Execute.
- The repeat rule: a second finding on the same requirement returns to Plan whatever its class.
- Findings confirmed by running their verification step before any code is touched; unconfirmed
  findings refuted with counter-evidence recorded.
- One repair round then blocked, one plan revision then stop and ask.
- Declared degradation when no external reviewer is available: evidence verified, no adversarial
  pass, and the report says so rather than presenting it as a review.

**Memory and budget**

- `MAP.md` — a per-repository index, not a summary. Contexts, entry points, seams, language,
  invariant owners and landmines, each entry carrying `path:line` and the revision it was verified
  at. Capped at roughly 400 lines and enriched one cycle at a time.
- Token neutrality as a design constraint, with the recovery mechanism stated per feature and an
  explicit reading discipline.

**Project history**

- `HISTORY.jsonl` — append-only, one entry per gate and per verdict, recording which model acted,
  when, under which operator identity, on which change, at which revision.
- Hash chain: each entry carries its own digest and the digest of the entry before it, so a
  rewritten past is detectable.

**Plan and execution discipline**

- Falsifiable requirements with stable identifiers, acceptance criteria including the case that
  catches a naive implementation, measured non-functional requirements, enforced out-of-scope,
  recorded assumptions, and a retrofit path that marks inference as inference.
- Ubiquitous language, bounded contexts and edge relationships, aggregate sizing, invariants with a
  single owner, layering with a placement table for the ambiguous cases.
- Declared write scope, reuse ordering, error handling, concurrency, security and observability
  defaults, and expand-migrate-contract sequencing for every contract and data change.

**Voice**

- English code comments only where they carry what the code cannot, with the allowed and banned
  patterns enumerated.
- Reports without preamble, narration, self-assessment or hedged completeness.
- Three claims that are never softened: a degraded review, a blocked cycle, an unproven requirement.

**Deterministic checks** — no model calls, no dependencies

- `route-lint.mjs` — plan structure, identifier uniqueness, acceptance criteria, requirements with
  no home, proofs that assert nothing executable, findings acted on without verification, unnamed
  gaps, unmeasured requirements and six comment patterns. Exit 1 on error, `--json` for CI.
  `--stage plan|execute|review` selects the gate under check, because a plan is complete before a
  proof exists. `--layers`, or `route.config.json`, replaces the four default layer names.
- `route-map.mjs` — repository skeleton from structure, sizes, git churn and manifests. No file
  content reaches the model, so cost is flat in repository size.
- `route-history.mjs` — append, render, verify, tail. The only writer of the three, it only appends,
  and it holds a lock while it does: an append is read-then-write, and simultaneous appends would
  otherwise produce duplicate sequence numbers and a chain that no longer verifies.

**Evals**

- `evals/` — four cases scoring the skill rather than its scripts, against a no-plugin baseline arm:
  `plan-gate`, `proof-gate`, `depth-scales`, `comment-voice`. `depth-scales` fails on
  over-application, which is the failure mode a discipline dies of. Unverified: `claude plugin eval`
  is in early access and was unavailable on the authoring account, so no case has been executed.

### Found by running the cycle on itself

Before release, one Standard cycle was run end to end on a real change with Codex as the external
reviewer. It ended **blocked**, which is the outcome the budget is supposed to produce, and it
surfaced three defects in the skill itself, all fixed here:

- The documented freeze command was `git diff`, which omits untracked files. On a new capability it
  produced an empty patch, and a reviewer handed an empty patch returns a PASS about nothing. It is
  now `git add -A && git diff --cached`, with an instruction to check the line count.
- `route-lint` had no notion of cycle stage, so it demanded a proof section at the Plan gate and
  exited 1 on a plan that was complete. Hence `--stage`.
- The review section said nothing about reviewer latency. At high reasoning effort a review of a few
  hundred lines takes minutes, and a foreground call times out and loses the work. The reference now
  says to run it in the background, and that a timed-out reviewer means the review did not happen.

### Found by running the defect route on route-lint itself

A second cycle, this one on a defect rather than a capability, probed the two gates and found that
`route-lint` reported **zero errors** on a plan that violated both. Three false negatives, each now
closed with a test that fails on the pre-fix revision:

- An NFR with no row in Placement was never reported: the unplaced check skipped every non-REQ.
- Any backticked span of three characters closed a requirement, so `` `checked` `` counted as an
  execution. A proof cell must now name something with a path separator, a test-id, a flag, a call,
  a file extension, or a second token.
- A Findings table with fewer than six columns was skipped whole, so no finding in it was checked.
  Columns are now located by header name, and a table with no Outcome column is itself an error.

The first of these immediately caught a case in this repository's own test fixtures.

A fourth followed, in the repair of the second: whitespace alone still made a command, so `a b`
closed a requirement. Then an adversarial round over that repair found six more, all confirmed:

- `e.g. checked` still closed the gate, because a one-letter extension counted as a file extension.
- `mytool check` was refused, because the runner list cannot enumerate every project's tooling.
  A `$ ` prefix now declares a span an executed command outright.
- A `Unverified reason` column answered for `Verified`, because the lookup matched substrings.
  Columns are located by exact header first.
- An invariant with no owner passed every gate, though the reference requires exactly one.
- The missing-Outcome rule fired once per row, making an open finding look like one closed without
  verification. It is one defect of the table, reported once.
- The plan claimed a 25-case probe while citing a test that held 16. The test now holds 30 and the
  plan says 30.

### The proof rule, after four rounds

A third adversarial round found two more BLOCKERs in the same predicate — `$ # comment only`,
`README.md` and `pass/fail` all closed a requirement, while `pytest` alone was refused — plus a
column lookup that let `Not verified` answer for `Verified`, a qualified outcome like
`fixed under REQ-004` going unchecked in the very form this project's own plans use, a three-column
table suppressing every check, and the template's own owner placeholder counting as an owner.

Four rounds, four sets of false negatives in one requirement. That is the repeat rule's signature,
and the answer was not another patch: no string can prove that something ran, so the inference from
a span's characters is gone. A proof cell names a program the tool knows, or the author writes `$ `
and takes responsibility. Both are decidable, and the surface stops widening with each repair.

### Measured, not asserted

`proof-gate` was executed by hand against a scaffolded repository and graded by its own rubrics:
**0 on both graders without the skill, 1 on both with it.** The same runs showed the skill does not
auto-invoke in headless mode, which the score alone would have hidden.

[1.0.0]: https://github.com/jannotix/claude-code-route/releases/tag/claude-code-route--v1.0.0
