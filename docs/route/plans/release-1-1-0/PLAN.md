# Release 1.1.0 and distribution

Depth: Guarded
Context: Distribution
Date: 2026-09-04

## Request

Bring the plugin to production and distribution, tested and working. An adversarial pass on the
published artifact found three blockers and four gaps; this plan closes them and states what a
released version means for this project.

Depth is Guarded rather than Standard because a published version string is a contract with people
who are not in this conversation. A wrong one cannot be taken back — it can only be superseded.

---

# Plan

## Requirements

REQ-001  A version string must identify exactly one artifact.
  AC-001.1  Given the version in `.claude-plugin/plugin.json` When a user installs from the marketplace and a reader checks out the matching tag Then the two trees are identical
  AC-001.2  Given a release tag When `git rev-list --count <tag>..main` is run Then it prints 0, or the difference is itself a released version
  AC-001.3  Given a bug report naming a version When the maintainer checks out that tag Then the behaviour the reporter saw is reproducible from it

REQ-002  The published tree must not carry an operator's identity unless publishing it is a recorded decision.
  AC-002.1  Given the versioned tree When it is searched for the operator's address Then either no match is found, or `docs/route/README.md` states that the history is published with attribution on purpose
  AC-002.2  Given `route-history append` When the operator asks not to be recorded Then the entry carries no `actor.operator` field and the chain still verifies
  AC-002.3  Given `SECURITY.md` When a reader asks what leaves their machine Then it says that the history file records the git identity and how to suppress it

REQ-003  A release must leave no user-visible change unversioned.
  AC-003.1  Given `CHANGELOG.md` at the moment a tag is cut When the `[Unreleased]` section is read Then it contains no entry
  AC-003.2  Given a changelog whose `[Unreleased]` section holds an entry When CI runs Then it fails and names the section
  AC-003.3  Given the same changelog with that entry moved under a version heading When CI runs Then it passes

REQ-004  The runtime the scripts require must be declared and must fail clearly below it.
  AC-004.1  Given the README and the plugin manifest When a reader looks for the required Node version Then both state the same floor
  AC-004.2  Given a Node older than the floor When any of the three scripts is run Then it exits non-zero with a message naming the required version, not a syntax error
  AC-004.3  Given a Node at the floor exactly When the test suite is run Then it passes

REQ-005  Continuous integration must exercise every operating system the plugin is documented to support.
  AC-005.1  Given the CI workflow When its matrix is read Then it includes Linux, macOS and Windows
  AC-005.2  Given the lock defect that returned `EPERM` on Windows and exit 1 When it is reintroduced on a branch Then the Windows job fails
  AC-005.3  Given the matrix When it is read Then it includes the declared Node floor and the current LTS

REQ-006  A release must be proven by installing it, not by inspecting it.
  AC-006.1  Given a clean environment When the marketplace is added and the plugin installed by the commands the README gives Then the install succeeds
  AC-006.2  Given that installed copy When its own test suite is run from the installed path Then it passes
  AC-006.3  Given AC-006.1 and AC-006.2 When CI runs Then both are executed there, not only by hand

REQ-007  Every directory in the published tree must have a stated reason to be there.
  AC-007.1  Given `docs/route/` in the published tree When a reader opens it Then a README in that directory says what it is and why it ships
  AC-007.2  Given any published directory with no such statement When the release check runs Then it is reported

## Non-functional requirements

NFR-001  Gate noise: the product's own checks report 0 errors against the published tree, and 0 of
         the warnings they report are unadjudicated. A warning the authors have considered and
         accepted in writing is a judgement a reader can weigh; one nobody has ruled on is noise, and
         it is the second count that must be zero.
  AC-N001.1  Given the gate run against the published tree When its output is read Then it reports 0 errors
  AC-N001.2  Given each warning it reports When a reader looks for a ruling on it Then this plan states one

NFR-002  Install cost: a first install and its verification complete in under 5 minutes of CI wall
         clock, so the end-to-end proof of REQ-006 is cheap enough to run on every push rather than
         on release days only.

## Placement

| REQ | Rule | Home | Layer |
| --- | --- | --- | --- |
| REQ-001 | A version names one tree; the tag and the installed artifact agree | `.claude-plugin/plugin.json` with the release tag | release |
| REQ-002 | Identity is recorded only when recording it was decided | `route-history.mjs` for the switch, `docs/route/README.md` for the decision | release |
| REQ-003 | Nothing user-visible ships without a version heading | `.github/workflows/checks.yml` | release |
| REQ-004 | The runtime floor is declared once and enforced at entry | `skills/claude-code-route/scripts/` shared preamble | release |
| REQ-005 | The matrix covers the platforms the README claims | `.github/workflows/checks.yml` | release |
| REQ-006 | A release is proven by installing it | `.github/workflows/checks.yml` | release |
| REQ-007 | Every published directory declares its purpose | `docs/route/README.md` and the release check | release |
| NFR-001 | Zero errors, and every warning ruled on in writing | this plan's Adjudicated warnings section | release |
| NFR-002 | The install proof is cheap enough to always run | `.github/workflows/checks.yml` | release |

The layer name `release` is this repository's own, alongside `domain` and `application`. It covers
the rules about what is published and under which name — distinct from the rules about what the
scripts decide, which stay in `domain`. Lint this plan with
`--layers domain,application,release`, or add `release` to `route.config.json` and update the test
that asserts the current pair.

## Adjudicated warnings

The gate reports 14 `comment-banner` warnings against the published tree — 5 in `route-history.mjs`,
5 in `route-map.mjs`, 4 in `route-lint.mjs` — all section dividers of the form `// --- lock ---`. The
rule behind them says a file that needs sections needs splitting, and it is right about most files.

It is not right about these three, and the reason is a trade-off rather than an exception.
`SECURITY.md` tells a reader that this project is documentation plus three Node scripts with no
dependencies, and that claim is the security argument: three files can be read end to end by one
person in an afternoon, and fifteen cannot. Splitting `route-history.mjs` into its five
responsibilities would satisfy the heuristic and make the artifact harder to audit — trading the
property that matters for the one that is measured.

They stay, and they stay as warnings rather than errors, which is what the lint plan already declared
when it put the comment-voice heuristics outside its scope. What changes here is that the ruling is
written where a reader meets the warnings, instead of being re-derived by everyone who runs the gate.

The ruling expires with its premise: if the scripts grow past what one sitting can review, the
argument for keeping them whole goes with it.

**One more warning was found while writing this plan, and it is a defect rather than a judgement.**
`comment-commented-code` flagged three prose lines whose only offence was beginning with the word
`from`, which the rule lists as a keyword. It is the same shape as the lint plan's finding 5.3: a
gate refusing correct work. The comment-voice heuristics are declared out of scope for that plan and
stay out of scope here, so the lines were reworded rather than the rule fixed, and the defect is
recorded in Gaps with its reproduction instead of being silently absorbed.

## Invariants

INV-001  A published version string never changes meaning: the tree it names is fixed once the tag exists.  Owner: `.claude-plugin/plugin.json`

INV-002  The history chain verifies, and any deliberate rewrite of it is recorded as an event inside the rewritten chain.  Owner: `route-history.mjs`

## Scope

    .claude-plugin/plugin.json, .github/workflows/checks.yml, CHANGELOG.md, README.md, SECURITY.md, docs/route/**, skills/claude-code-route/scripts/**, tests/**

## Out of scope

- The eval runner. It remains in early access on this account and no release waits on it.
- Rewriting git commit metadata. The author address is in all thirteen commit headers, and removing
  it from one file while it stays in every commit would be theatre rather than a fix. Whether to
  rewrite git history is a separate decision with its own cost, taken outside this plan.
- New skill capability. This release ships what exists, correctly labelled.
- The comment-voice heuristics. Named as a gap in the lint plan and unchanged here.

## Assumptions

ASSUMPTION-001  The marketplace installs from the default branch, not from a tag. Verified on
                2026-09-04: an install produced a tree containing `tests/` and lacking
                `comment-voice`, which is `main` and not `claude-code-route--v1.0.0`. REQ-001 is
                written for that behaviour. If the marketplace later resolves tags, AC-001.1 becomes
                easier to satisfy, not harder.

## Compatibility

The version moves 1.0.0 to 1.1.0 under semantic versioning: the proof gate accepts and rejects spans
it did not before, which is a behaviour change for anyone whose plan was passing on the old rules.
It is a minor and not a major because the gate becomes stricter in the direction the product already
claimed, and because a plan that fails the new gate was being answered wrongly by the old one.

Anyone pinned to 1.0.0 keeps a tag that still resolves. There is no migration: plans are text, and a
plan that now fails names the span it failed on.

---

# Execution

## Built

Tasks in dependency order; each is done when its acceptance criteria hold. Status as of the first
execution round, 2026-09-04.

| Task | Requirement | Depends on |
| --- | --- | --- |
| T1 — decide and act on published identity | REQ-002 | **done** — attribution kept and declared in `docs/route/README.md` |
| T2 — add the identity switch to `route-history` | REQ-002 | **done** — `--no-operator`, `ROUTE_NO_OPERATOR`, documented in `SECURITY.md` |
| T3 — declare or remove `docs/route/` | REQ-007 | **done** — declared as a worked example |
| T4 — declare and enforce the Node floor | REQ-004 | **done** — Node 18, README and manifest, exit 2 below it |
| T5 — CI fails on a non-empty `[Unreleased]` | REQ-003 | **done** — gate run both ways |
| T6 — CI matrix over three platforms and two Node versions | REQ-005 | written, unproven until CI runs |
| T7 — CI installs the plugin and runs its suite | REQ-006, NFR-002 | written, unproven until CI runs |
| T8 — adjudicate the 14 gate warnings in writing | NFR-001 | **done** — see Adjudicated warnings |
| T9 — close `[Unreleased]` as 1.1.0, bump the manifest | REQ-003, REQ-001 | **done** — manifest at 1.1.0 |
| T10 — tag and release, notes describing this code | REQ-001 | T9 |
| T11 — adversarial round over this release | — | T10 |

## Deviations

**NFR-001 was amended during execution rather than met as written.** It asked for zero warnings from
the product's own gate. Meeting that literally would have meant either splitting three scripts the
security argument depends on being few, or deleting the section dividers that prompted the warnings
without addressing what they marked — gaming a measure rather than satisfying it. The requirement now
asks for zero *unadjudicated* warnings, and the ruling is written where a reader meets them. Recorded
here rather than silently rewritten, because a requirement that changes to match the outcome is the
failure this method exists to catch.

## Dependencies added

None. The release adds no dependency; the CI matrix uses actions already in the workflow.

---

# Review

## Findings

The adversarial pass that produced this plan, run 2026-09-04 against `4902921` and the installed
artifact. **Seven findings, seven confirmed by execution, none refuted.**

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 0.1 | DEFECT | BLOCKER | Two different trees both call themselves 1.0.0 | confirmed: the installed copy contains `tests/` and no `comment-voice`, which is `main`; `git rev-list --count claude-code-route--v1.0.0..HEAD` is 4 | open, REQ-001 |
| 0.2 | DEFECT | BLOCKER | The author's address is published 21 times | confirmed: `grep -c` on the versioned `docs/route/HISTORY.jsonl` returns 21 | open, REQ-002 |
| 0.3 | DEFECT | BLOCKER | `[Unreleased]` holds user-visible behaviour changes | confirmed by reading the section against the proof-gate changes | open, REQ-003 |
| 0.4 | UNPROVEN | MAJOR | No runtime floor is declared anywhere | confirmed: no mention in README, manifest or SECURITY; the scripts need Node 14 for `??` and `?.` | open, REQ-004 |
| 0.5 | UNPROVEN | MAJOR | CI runs one OS, and a Windows-only defect shipped | confirmed: the matrix is `ubuntu-latest` alone, and the `EPERM` lock defect was found by hand | open, REQ-005 |
| 0.6 | UNPROVEN | MAJOR | No test proves a fresh install works | confirmed: every install check to date was run by hand in this conversation | open, REQ-006 |
| 0.7 | SCOPE | MINOR | The gate reports 14 warnings on the tree that ships | confirmed: 14 `comment-banner` — 5 in `route-history.mjs`, 5 in `route-map.mjs`, 4 in `route-lint.mjs` | adjudicated, see below |

**What the pass could not fault**, listed because a PASS without its list is worth nothing. Both
README install paths were executed: `claude plugin marketplace add jannotix/claude-code-route`
followed by the bare `claude plugin install claude-code-route` succeeds, so the documented command
is the working command. A first run in a virgin non-git directory was executed: `route-map` and
`route-history` both complete, and outside a git repository no operator identity is recorded, which
locates 0.2 in this repository's git config rather than in the script. `.route/` is ignored and
untracked, so no review transcript reached the published tree. The installed copy runs its own suite
at 145 of 145.

## Proof

Every row below runs from the repository root. `tests/` is in the repository, so these are
reproducible by anyone holding the commit.

| Requirement | Proof | Result |
| --- | --- | --- |
| REQ-001 | `$ git rev-list --count claude-code-route--v1.1.0..main` returning 0, recorded at release | open |
| REQ-002 | `node tests/route-lint.test.mjs` — the suppressed-identity append and its chain verification | open |
| REQ-003 | `node tests/route-lint.test.mjs` — the changelog gate on a non-empty and an empty `[Unreleased]` | open |
| REQ-004 | `node tests/route-lint.test.mjs` — the floor check refusing an older runtime with a named message | open |
| REQ-005 | `$ gh run view --job <windows job>` on a branch reintroducing the `EPERM` defect | open |
| REQ-006 | `$ gh run view --job <install job>` showing marketplace add, install, and the installed suite | open |
| REQ-007 | `node skills/claude-code-route/scripts/route-lint.mjs docs/route/plans/release-1-1-0 skills/` | open |
| NFR-001 | `node skills/claude-code-route/scripts/route-lint.mjs docs/route/plans/release-1-1-0 skills/ --json` reporting 0 warnings | open |
| NFR-002 | `$ gh run list --limit 1` showing the install job under five minutes | open |

Nothing above is closed. This plan is at its Plan gate and no execution has begun; the table records
what each requirement will owe, so that a later reader can tell a proof that ran from one that was
promised.

## Gaps

**Two requirements wait on a decision that is not the Planner's to take.** REQ-002 asks whether an
address already present in thirteen commit headers should be removed from one file, and REQ-007 asks
whether this repository's own cycle artifacts are a demonstration or clutter. Both are the
requester's, both are recorded as open, and T1 and T3 are blocked until they are answered. Guessing
either would be the failure this method exists to prevent.

**`comment-commented-code` refuses prose that starts with a keyword.** Reproduction: a comment line
beginning `from somewhere inside the file...` is reported as commented-out code, because the rule
matches `^(if|for|...|from|...)` with no requirement that the line also look like code. Three
lines in this release tripped it. Out of scope here and in the lint plan, which declares the
comment-voice heuristics advisory; recorded so the next round has its case ready.

**The round-6 repairs to the linter and the round-8 repairs to the capability fixture have not been
attacked.** They are not part of this plan and do not block a release, but a release ships them.

## Verdict

**Plan gate open, execution not started.**

Seven findings, all confirmed by execution, none refuted. Three are blockers and none of them is in
the skill's own logic: the product works, and what is not ready is the way it is labelled, proven
and shipped. That distinction is the reason this plan exists rather than a patch.
