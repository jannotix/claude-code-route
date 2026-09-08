# Adversarial rounds — release 1.1.0 to 1.1.3

These are the records of the rounds run over `docs/route/plans/release-1-1-0/PLAN.md`. They live
on this orphan branch rather than on the default branch, because everything tracked there is
served by the marketplace: nineteen rounds put four hundred lines of narrative into a plan that
governs a skill of three hundred and sixty-four, and every install carried all of it.

## Round 11 — the release cut

> 4 findings, 2 BLOCKER, 4 confirmed by execution, 0 refuted. Generated from the table below by `.github/round-counts.mjs`.

Ran 2026-09-05 over `00fc38a..3fb532b`, the release cut itself, with the receipts in the reviewer's
evidence rather than in the tree. The count from round 7 to this one is seventeen, ten, nine, eight and four. <!-- quoted -->

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 11.1 | DEFECT | BLOCKER | The version window reopened between the round-10 repair and the release cut | confirmed: `de04601` reached the default branch at 02:41 still declaring 1.1.1, and `3fb532b` at 03:04 — twenty-three minutes in which the marketplace served a third tree by that name | recorded rather than repaired: a window already opened cannot be closed by a later tag. AC-001.7 postdates it and is what prevents the next one |
| 11.2 | UNPROVEN | BLOCKER | The command chosen to be durable resolved to nothing | confirmed: `gh run list --commit` takes a SHA and passes a tag label through untouched | every row resolves the tag first with `git rev-parse <tag>^{commit}`, run against the 1.1.1 tag to prove it returns the run |
| 11.3 | UNPROVEN | MAJOR | The load assertions accepted wrong names and versions | confirmed by execution: `claude-code-route-extra`, `1x1x2` and `1.1.20` all passed | `grep -qxF` matches the whole line literally; all three counterexamples now fail and the true line still passes |
| 11.4 | UNPROVEN | MAJOR | NFR-002's proof asked for fields that carry no duration | confirmed: `--json name,conclusion` has no timing, and "26 seconds" was declared an earlier measurement | the row reads each install job's own start and finish |

**11.1 is the honest limit of AC-001.7.** The criterion was written in the same commit that closed
the window it describes, so it could not have prevented the window before it. It prevents the next
one, and what happened here is recorded rather than reported as repaired. That distinction is the
whole difference between this release and the two before it.

**11.2 is the defect committed in the act of repairing it.** Rounds 7, 9 and 10 each found a proof
row citing a CI run that was not the candidate's. The repair replaced the identifier with a command
described as durable, and the command was never run. A citation that has not been executed is the
same class of claim as a check that has not been proven to fail.

## Round 12 — the release cut, squashed

> 4 findings, 3 BLOCKER, 4 confirmed by execution, 0 refuted. Generated from the table below by `.github/round-counts.mjs`.

Ran 2026-09-06 over `3fb532b..0b82e32`. 

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 12.1 | DEFECT | BLOCKER | The proposed tag was not the manifest-bump commit | confirmed: `git log -1 -- .claude-plugin/plugin.json` gave `3fb532b` while the candidate was `0b82e32` | the bump and the repairs are one commit; `git log -1` on the manifest and `HEAD` now agree |
| 12.2 | UNPROVEN | BLOCKER | The install proof measured the default branch, not the candidate | confirmed: the job added the marketplace, which serves the default branch, and the trees differed in three files | the candidate installs itself from the checkout and is compared both ways against `GITHUB_SHA`; CI reports `compared 53 installed files against 53 tracked at 53f2e77` |
| 12.3 | UNPROVEN | BLOCKER | An unquoted revision expression returned the wrong commit | confirmed by execution: in PowerShell `git rev-parse <tag>^{commit}` exits 128 and prints the tag's parent, because `{commit}` is read as `-encodedCommand`; quoted it exits 0 and prints the tag | every proof row quotes the expression |
| 12.4 | UNPROVEN | MAJOR | The install budget was printed, not asserted | confirmed: the command shape exited 0 against a 361-second job, and the workflow declared no timeout | the job declares `timeout-minutes: 5`, so a run over the budget fails |

**12.2 is what a new constraint costs.** AC-001.7 moved work to a branch, and the install proof had
silently depended on the candidate *being* the default branch. The signal was printed in every run
that had ever passed -- `compared 53 installed files against 53 published on main` -- and the number
was read while the word was not.

## Round 13 — the tagged commit, reviewed after it was tagged

> 3 findings, 3 BLOCKER, 3 confirmed by execution, 0 refuted. Generated from the table below by `.github/round-counts.mjs`.

Ran 2026-09-06 over `3fb532b..53f2e77`, the commit tagged `claude-code-route--v1.1.2`. The tag was cut
while this round was still running, on the requester's instruction, and that is finding 13.2.

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 13.1 | DEFECT | BLOCKER | 1.1.2 names two published trees | confirmed: `3fb532b` and `53f2e77` both declare 1.1.2, their tree ids differ, and `git merge-base --is-ancestor 3fb532b origin/main` exits 1 | **not repairable.** `3fb532b` was the default branch from 03:04 to 15:34 and the marketplace served it. A later tag cannot make 1.1.2 historically unique; 1.1.3 descends from the published history and is unique by construction |
| 13.2 | DEFECT | BLOCKER | The tag was cut before the round that was to authorise it | confirmed: the tag object says the round was still running, and the changelog claimed the release was reviewed before its tag | the claim is corrected in 1.1.3, and what actually happened is recorded here rather than smoothed over |
| 13.3 | UNPROVEN | BLOCKER | The marketplace step proved the version and nothing else | confirmed by execution: a copy reporting the right version with `Skills (0)` passed the step's only assertion, and the step ran neither the skill check nor the suite | the step makes the same three assertions the candidate install makes, over the copy the marketplace served, after clearing the cache the candidate install left |

**13.1 and 13.2 are not code defects.** Both repairs under review were correct and measured. What
went wrong was the order of publication: the tag preceded the verdict, and a force update put a
second tree under a name that already had one. A release is a sequence as much as it is a tree, and
this plan had written the sequence down one round earlier than it managed to follow it.

**A count in this release was published without being measured.** The 1.1.2 commit message and tag
object read "Forty-three findings, forty-two confirmed, fourteen BLOCKER". <!-- quoted -->
Counted from the tables above, rounds 8 to 12 hold 35 findings, 34 confirmed by <!-- quoted -->
execution, 1 refuted, and 17 marked BLOCKER of which 16 were confirmed. <!-- quoted -->
Forty-three is not a sum of anything here; it was written from
memory. The tag object cannot be edited, so the correction lives here and in the changelog. The rule
it broke -- never publish a figure that was not measured -- is the oldest one this project has.

## Round 14 — the 1.1.3 candidate, before its tag

> 5 findings, 3 BLOCKER, 5 confirmed by execution, 0 refuted. Generated from the table below by `.github/round-counts.mjs`.

Ran 2026-09-06 over `53f2e77..2da8065`. 

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 14.1 | UNPROVEN | BLOCKER | The marketplace copy was never compared with the commit it claims to serve | confirmed: the block contains no `GITHUB_SHA`, `hash-object` or `ls-tree`, so a different tree with the same version, one skill and a passing suite passes it | the block runs the same two-way comparison the candidate install runs, on Linux, and reports the counts |
| 14.2 | WRONG-PLAN | BLOCKER | AC-006.3 asked CI to prove a channel that cannot serve a candidate | confirmed: the strengthened block is conditioned on the default branch and was skipped on `release-1.1.3`; the substitute ran by hand on one system against version 1.1.2 | the criterion states which half each install proves, and that the marketplace half is reachable only at publication |
| 14.3 | UNPROVEN | BLOCKER | The proof rows resolved the previous release's tag | confirmed: five rows named `claude-code-route--v1.1.2^{commit}` while the candidate is one commit past it | every row names `claude-code-route--v1.1.3^{commit}` |
| 14.4 | DEFECT | MAJOR | The window in the changelog was stated from memory, in the entry correcting a count stated from memory | confirmed: the remote ref's log gives 2026-09-05T03:05:24+02:00 to 2026-09-06T15:34:23+02:00, which is one day twelve hours and twenty-nine minutes, not twelve and a half hours on one day | the entry carries both timestamps and the measured interval |
| 14.5 | DEFECT | MINOR | Round 7's prose said six BLOCKER and its table marks seven | confirmed: 17 rows, 7 carrying BLOCKER — 7.1, 7.2, 7.3, 7.9, 7.11, 7.15 and 7.16 | the prose names them; and "four rounds" listing five counts now says five |

**14.2 is a fact about marketplaces, not a defect in this one.** A marketplace serves the default
branch, so no marketplace can serve a commit that has not been published. A criterion demanding that
CI prove the marketplace path for a candidate demands something no ordering achieves. The criterion
now says which half each install proves: the checkout install proves the commit under review on every
push, and the marketplace install proves the channel at publication, confirmed by the next round.

**14.4 is the same failure as the count it was correcting, one paragraph later.** The entry that
recorded a figure written from memory stated its own interval from memory. Three separate figures in
this release were wrong for the same reason, and none of them was wrong in a table -- they were wrong
in the prose summarising a table. Nothing in this project reads prose.

## Round 15 — the 1.1.3 candidate again, before its tag

> 3 findings, 2 BLOCKER, 2 confirmed by execution, 1 not saying which, 0 refuted. Generated from the table below by `.github/round-counts.mjs`.

Ran 2026-09-06 over `2da8065..a385e7b`. 

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 15.1 | WRONG-PLAN | BLOCKER | REQ-006 was marked pass while half of AC-006.3 cannot run before the tag by its own terms | confirmed: the branch is `release-1.1.3`, `git merge-base --is-ancestor a385e7b origin/main` exits 1, and the marketplace step is conditioned on the default branch | the row closes what runs and marks the marketplace half open; the Waivers section accounts for it, which is what T10 depends on |
| 15.2 | UNPROVEN | BLOCKER | Five rows marked pass cite a command that cannot run yet | confirmed: `git rev-parse --verify 'claude-code-route--v1.1.3^{commit}'` exits 1, because the tag list ends at 1.1.2 | the Proof section states that such a row is a reproducer and not the proof: the proof is the run at the commit, which a commit cannot name about itself |
| 15.3 | DEFECT | MINOR | Three summaries still disagreed with the tables they summarise | confirmed by counting the severity column: round 7 has 7 BLOCKER against prose saying six, round 8 has 4 marked against prose saying three, and "five rounds before it" listed rounds 7 to 11 inclusive | all three corrected, and round 8's now separates four marked from three confirmed |

**15.3 is the fourth appearance of one defect.** A summary of a table is prose, and nothing in this
project reads prose. The count that produced it was itself taken with a tool that answers a nearby
question: `grep -c BLOCKER` counts rows that name the word, and row 14.5 names it in its summary. That
is finding 7.1 in another costume -- `| tail -1` reports `tail`'s status, not the command's.

**15.2 is the terminal form of a defect five rounds found.** A proof row cannot name the run that
proves its own commit, because the run happens afterwards. Rounds 7, 9, 10, 11 and 12 each found a row
naming the wrong run; the answer is not a better identifier but the admission that the row is a
reproducer and the receipt lives outside the tree.

## Round 16 — the check built to end the class, attacked

> 9 findings, 3 BLOCKER, 7 confirmed by execution, 2 not saying which, 0 refuted. Generated from the table below by `.github/round-counts.mjs`.

Ran 2026-09-07 over `a385e7b..d204d48`, the commit that added REQ-008. The count rose because the
patch added a surface, and a new surface is where the next defect lives.

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 16.1 | DEFECT | BLOCKER | The check read a summary anywhere in a section, and counted rows inside a fence | confirmed by execution: a section whose counts appear only after its table returned `[]`, and so did one whose only rows were inside a fenced block | the summary is what stands before the table, and a fenced row is an example of a row rather than one |
| 16.2 | DEFECT | MAJOR | Correct summaries in digits or the singular were rejected | confirmed: `**2 findings, 2 confirmed.** 1 was BLOCKER` and `**One finding, one confirmed.**` both reported "no count this can read" | both are read |
| 16.3 | DEFECT | BLOCKER | The release commit message said seven BLOCKER | confirmed: the severity column across rounds 13, 14 and 15 holds 3, 3 and 2 | the message is rewritten with the counted figure |
| 16.4 | DEFECT | MAJOR | The authorisation said one waiver and two stood under it | confirmed: two `**AC-` entries stood between the Waivers heading and round 7 | the sentence counts them |
| 16.5 | DEFECT | MAJOR | The changelog promised a report the check skipped in silence | confirmed: a table carrying a row from another round, with otherwise correct counts, returned `[]` | a foreign row is named |
| 16.6 | DEFECT | MINOR | Two documents said two gate modules and the workflow calls three | confirmed by listing the `node .github/*.mjs` invocations | both corrected, and `.github/README.md` no longer describes an install job that was changed four rounds ago |
| 16.7 | DEFECT | MINOR | The inventory of wrong figures listed three and there were four | confirmed: 1.1.2 also published a wrong confirmed total | the entry lists four |
| 16.8 | UNPROVEN | BLOCKER | The receipt handed to the reviewer said 53 files where CI printed 54 | confirmed: `git ls-tree -r --name-only d204d48` gives 54, and the run log reads `compared 54 installed files against 54 tracked` | the evidence is generated by a script; no figure in it is typed |
| 16.9 | UNPROVEN | MINOR | The proof row said ten checks and eleven ran | confirmed by counting `check(` in the block | the row states the counted figure, and the count is produced by the repair script rather than read off |

**16.8 is the finding this release exists to make impossible, committed while making it impossible.**
The check added in this patch reads `PLAN.md`. It does not read a commit message, and it cannot read
an evidence file assembled by hand. CI had printed the right number, in the log, in plain text; a hand
copied it wrongly into the receipt. Earlier rounds extracted that number with `grep` and this one did
not. The repair is not a larger check but a rule with no exceptions: a figure that a command can
produce is never typed.

**16.1 and 16.5 are the cost of a new surface.** The cases they carry are all in the file added to
end the prose class, and they are ways past it. That is not an argument against building it
-- it found three summaries in the linter plan stating no BLOCKER count while their tables held three,
three and two, all wrong for days -- but it is the reason the count rose from three to nine.

## Round 17 — the reader of prose, and what replaced it

> 8 findings, 5 BLOCKER, 7 confirmed by execution, 1 not saying which, 0 refuted. Generated from the table below by `.github/round-counts.mjs`.

Ran 2026-09-07 over `d204d48..e67ba4f`.

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 17.1 | WRONG-PLAN | BLOCKER | REQ-008 covered finding and BLOCKER totals and nothing else, while a published document claimed something its own tables denied | confirmed by execution: `docs/route/README.md` said every finding was confirmed by executing its verification step, and counting the Verified column of the linter plan gives 35 executed and 11 read | both statements carry the counted figures, and AC-008.5 says which totals the requirement does not cover |
| 17.2 | DEFECT | BLOCKER | A fence was closed by a shorter delimiter | confirmed: a three-backtick line inside a four-backtick fence closed it and the row after was counted | a fence closes on its own character, at least as long |
| 17.3 | DEFECT | BLOCKER | A lone row was a table and an emphasised severity was invisible | confirmed: a single row-shaped line with no header was accepted, and `**MAJOR**` was not read as a severity | a table is a header and a separator, columns are found by name, and emphasis is markup |
| 17.4 | DEFECT | BLOCKER | Word numbers stopped at twenty and the first of two counts won | confirmed: twenty-one findings was reported unreadable, and an opening with a draft count and a wrong final count passed | no count is read at all; see below |
| 17.5 | DEFECT | MAJOR | The release was dated before its own commit | confirmed: the entry said 2026-09-06 and `git show -s --format=%aI` gives 2026-09-07 | the date comes from the commit |
| 17.6 | UNPROVEN | BLOCKER | A proof row said twelve round sections and the command counts thirteen | confirmed by running it | the row states the counted figure |
| 17.7 | DEFECT | MINOR | Five parser cases were called five findings | confirmed: the table assigns them to three ids | the sentence names no number |
| 17.8 | UNPROVEN | MINOR | A proof row said six checks and nine ran | confirmed by counting `check(` in the block | the row states the counted figure |

**17.4 is the finding that ended the approach.** Rounds 15 to 17 spent themselves on a
reader of prose, and each repair added surface for the next. Reading prose robustly is open-ended;
comparing bytes is not. The counts are generated from the table and written into the section now, the
check is whether the file already holds what the generator writes, and no round section states a count
anywhere else. A generated line cannot drift from the table it came from.

**17.1 is the one a user would have met.** `docs/route/README.md` told a reader that every finding in
the linter plan had been confirmed by executing its verification step. Its own tables record eleven
confirmed by reading. That is the rule this method exists to enforce, claimed as kept where it was
not, in the document that introduces the method.

## Round 18 — the generator, attacked

> 10 findings, 6 BLOCKER, 9 confirmed by execution, 1 by reading, 0 refuted. Generated from the table below by `.github/round-counts.mjs`.

Ran 2026-09-07 over `e67ba4f..6ae200c`, the commit that replaced the reader with a generator.

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 18.1 | WRONG-PLAN | BLOCKER | REQ-001 was marked pass while AC-001.1's marketplace half cannot run before the tag | confirmed by execution: the branch is `release-1.1.3`, no 1.1.3 tag exists, and `main` declares 1.1.2 | the row closes what runs and the Waivers section accounts for the half that cannot, beside AC-006.3's |
| 18.2 | DEFECT | BLOCKER | The generator called every non-refuted row confirmed by execution | confirmed by execution: seventeen rows across the two plans say "by reading", and eleven generated lines said otherwise | how a row was checked is read from its own cell; a row saying neither is counted and named rather than assumed |
| 18.3 | DEFECT | BLOCKER | The stray-count grammar missed a qualifier between the number and its noun | confirmed by execution: `There were 21 total findings.` passed | a qualifier is allowed between them, and an aggregate with no noun at all carries the marker instead |
| 18.4 | DEFECT | BLOCKER | A second line bearing the generated marker was exempted with the first | confirmed by execution: `> 99 findings, 99 BLOCKER. Generated from the table below.` later in a section returned no finding | only the first is the generated line; a second is named |
| 18.5 | DEFECT | BLOCKER | A blank id was dropped and a repeated id counted twice, both in silence | confirmed by execution: one blank-id row gave `0 findings`, and `3.1` twice gave `2 findings` | each is named; a repeated id counts once |
| 18.6 | DEFECT | MAJOR | A fence closed on a line carrying content, and an escaped pipe split a cell | confirmed by execution: a table after ```` ```still-code ```` was counted, and `refuted` after `\|` was read as confirmed | a closing fence carries nothing but its delimiter, and `\|` is not a boundary |
| 18.7 | UNPROVEN | BLOCKER | The proof row said thirteen sections and the command counts fourteen | confirmed by running it | the row states the counted figure |
| 18.8 | UNPROVEN | MAJOR | Nothing asserted the failing branch, its exit code, or the file it names | confirmed: the only subprocess call ran against the already-clean repository | three checks drive a stale plan through exit 1, `--write`, and the pass that follows |
| 18.9 | DEFECT | MINOR | Two documents described the reader that had been replaced | confirmed by reading them against the module | both describe the generator |
| 18.10 | DEFECT | MINOR | Removing count prose corrupted two finding identifiers | confirmed: `7.1` had become `1,` and `8.2` had become `2` in the published tree | both restored |

**18.2 is the argument against the choice made one round earlier.** A generator is safer than a reader
only for what the data actually carries. How many rows a table has, it carries. How a finding was
checked lives in a prose cell, and deducing it by exclusion turned one drifting figure into a false
statement rewritten into eleven sections at once. The repair is not a better deduction: the category
is read from the cell that states it, and a row that states nothing is counted separately and named.

**18.10 is damage this release did to itself.** The script that stripped counts out of prose ate the
`7.` and `8.` from two identifiers, and the corruption shipped in the candidate. Nothing checks that a
finding referred to in prose exists in a table, and that is a gap this requirement does not close.

## Round 19 — the generator again, and the documents around it

> 9 findings, 5 BLOCKER, 8 confirmed by execution, 1 not saying which, 0 refuted. Generated from the table below by `.github/round-counts.mjs`.

Ran 2026-09-08 over `6ae200c..7fb2b7b`.

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 19.1 | DEFECT | BLOCKER | Unusual wording was still called execution | confirmed by execution: `confirmed by inspection` generated `1 confirmed by execution` | only wording that says execution counts as execution; everything else is unstated and named |
| 19.2 | DEFECT | BLOCKER | Four ways past the stray-count check | confirmed by execution: `Thirty findings remained.`, `There were 2 BLOCKERs.`, `There were 2 serious findings.` and a pipe-prefixed line all returned nothing | the number words run past twenty, the plural is read, any two words may stand between, and only the lines of a table this parsed are exempt |
| 19.3 | UNPROVEN | BLOCKER | Three criteria about the tag were marked passed before one existed | confirmed by execution: `git rev-parse --verify` on the 1.1.3 tag exits 128 | they are pending T10, and the row says which pass now |
| 19.4 | UNPROVEN | BLOCKER | Two execution totals outside the generated sections were false | confirmed: the initial review's summary claimed seven execution-confirmed while row 0.3 says reading, and the verdict claimed the same of round 7 while its generated line disagrees | the first carries the counted categories, the second defers to the generated line |
| 19.5 | UNPROVEN | BLOCKER | "eleven sections" survives no counting | confirmed: fourteen generated lines existed and seven sections carried a reading or unstated row | the sentence names no number |
| 19.6 | DEFECT | MAJOR | The waiver inventory said two and held three | confirmed by counting the entries between the headings | it says three |
| 19.7 | DEFECT | MAJOR | The changelog dated the release before its own commit | confirmed: the entry said 2026-09-07 and the commit is 2026-09-08 | the date is taken from the release commit, after it exists |
| 19.8 | UNPROVEN | MINOR | The evidence script counted checks at one indentation | confirmed: 25 by `^  check(` against 28 at any indentation | the script counts at any indentation |
| 19.9 | DEFECT | MINOR | A published document counted commit headers | confirmed: it said thirteen and there are twenty-seven | the sentence states the fact without the number, which the next commit would stale again |

**19.1 is the repair of 18.2 repeating its own mistake.** That round replaced a deduction with a
narrower deduction: anything not `by reading` stayed `by execution`. The false claim remained
generatable, one wording away. A category is either read from the cell or it is not known, and the
third state — not knowing — is what both repairs were missing.

**19.2 and the two lines it then flagged are the shape of this whole surface.** Widening the grammar
to catch `2 serious findings` made `16.8 is the finding` a count, and tightening that made <!-- quoted -->
`Rounds 15, 16 and 17 spent their findings` one. Every rule that reads prose has a boundary, and <!-- quoted -->
moving the boundary moves what falls outside it rather than removing the outside.

## Round 7 — the release, and the linter it ships

> 17 findings, 7 BLOCKER, 12 confirmed by execution, 1 by reading, 4 not saying which, 0 refuted. Generated from the table below by `.github/round-counts.mjs`.

Ran 2026-09-04 over two candidates, `.route/` emptied first and each patch cut to its own change
rather than to the range between pushes. The BLOCKERs were 7.1, 7.2, 7.3, 7.9, 7.11, 7.15 and 7.16. <!-- quoted -->

This is the round T11 asked for. It happened after the 1.1.0 tag existed, which is the first finding
in the table and the reason T11 now runs before T10.

### On the release, `4902921..90ff4e7`

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 7.1 | UNPROVEN | BLOCKER | The installed-suite check could not fail | confirmed: `bash -e -c 'node -e "process.exit(7)" \| tail -1'` exits 0, and the run log shows the install job on `/usr/bin/bash -e` with no `pipefail` | fixed, every job declares `shell: bash` |
| 7.2 | DEFECT | BLOCKER | The published tree fails its own gate | confirmed: scanning `.` rather than `skills/` gave 1 error and 20 warnings, not the adjudicated 14 | fixed, 0 errors and 14 warnings over `.` |
| 7.3 | WRONG-PLAN | BLOCKER | The plan declared delivery with T11 open | confirmed by reading the task table against the verdict | T11 moved before T10 |
| 7.4 | DEFECT | MAJOR | AC-004.2 promised a named error on every older Node | confirmed: below Node 14 the module does not parse and no guard in it runs | criterion corrected to what a single-file guard can do |
| 7.5 | DEFECT | MAJOR | The matrix omitted the current LTS | confirmed: `node: [18, 22]` against an AC naming floor and current LTS | fixed, 18, 22 and 24 |
| 7.6 | DEFECT | MAJOR | AC-007.2's release check did not exist | confirmed: renaming `docs/route/README.md` and running the cited command still passed | built, and it fails when a README is removed |
| 7.7 | DEFECT | MAJOR | The install proof did not run on every push | confirmed: `push: branches: [main]` | fixed, every push |
| 7.8 | UNPROVEN | MAJOR | The changelog proof cited a file that never shipped | confirmed: `git cat-file -e 90ff4e7:cg_probe.js` exits non-zero | proof row now cites the committed suite |
| 7.9 | DEFECT | BLOCKER | Four commits carried 1.1.0 before the tag existed | confirmed: two CI runs installed different trees, both reporting 1.1.0 | AC-001.4 states the window and when it must close |
| 7.10 | MISPLACED | MAJOR | The floor is copied into three files, not placed once | confirmed: `REQUIRED_NODE_MAJOR` appears in all three scripts | placement corrected, and a test asserts the three agree |

### On the linter it ships, `4f4499b..4902921`

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 7.11 | DEFECT | BLOCKER | A two-backtick span bypassed the backtick rule | confirmed: a fenced span carrying `` ` `` was truncated at the inner backtick and accepted as marked | fixed, the scanner reads a fence of N |
| 7.12 | DEFECT | MAJOR | A file-path owner was refused as two owners | confirmed at the candidate | already repaired before the tag |
| 7.13 | SCOPE | MAJOR | The candidate changed the excluded comment-voice surface | confirmed by `git diff --name-status` | scope amended |
| 7.14 | SCOPE | MAJOR | The suite drives tools the scope excluded | confirmed: the suite imports `route-map` and `route-history` | scope amended: testing a tool is not changing it |
| 7.15 | UNPROVEN | BLOCKER | The receipt was not bound to the candidate | confirmed: the evidence said 154 checks, the candidate carried 145 | recorded; a freeze takes its evidence from the revision under review |
| 7.16 | UNPROVEN | BLOCKER | CI masked a failing test process | the same defect as 7.1, reached from the other candidate | fixed with 7.1 |
| 7.17 | MISPLACED | MAJOR | The placement named `SHELL_META`, the code has `hasShellMeta` | confirmed by `git grep -w SHELL_META` | placement corrected |

**Seven of the seventeen are criteria that promised more than was built.** AC-007.2 named a release
check nobody had written, AC-004.2 claimed coverage a single-file guard cannot have, AC-005.3 named
an LTS the matrix did not carry, and a proof row cited a probe file that never entered the repository.
The plan gate could not catch any of them: it checks that a proof *names a command*, not that the
command proves what the criterion says. That is a real limit of the gate and it is written here rather
than left for the next round to find again.

**7.1 is the one that mattered most.** `node tests/... | tail -1` under `bash -e` reports `tail`'s
status, so the job that proved the installed copy passes could not go red. Eight green jobs were
reported for 1.1.0, and one of them was green by construction. The suite job had `shell: bash` and was
sound; the install job did not.

**7.2 came from asking a question the plan had not.** NFR-001 said "the published tree" and its proof
scanned `skills/`. The marketplace publishes `./`. Scanning what actually ships found an error in a
fixture full of deliberate defects — a file that existed to be wrong, sitting in the artifact users
install. The corpus is written at run time now and asserted there, so it is exercised and nothing
defective ships.

**And two false positives that had been left as a named gap.** `comment-commented-code` refused prose
beginning `from` and `print`. The gap was declared out of scope, and then the release requirement for
zero unadjudicated warnings made it in scope. A keyword now counts only alongside a character that
code carries and prose does not.

158 checks pass. The gate over the whole published tree reports 0 errors and the 14 adjudicated
warnings.

## Round 8 — the 1.1.1 repairs, attacked

> 10 findings, 4 BLOCKER, 8 confirmed by execution, 1 by reading, 1 refuted. Generated from the table below by `.github/round-counts.mjs`.

Ran 2026-09-05 over `claude-code-route--v1.1.0..claude-code-route--v1.1.1`, the change and nothing
else, with the evidence taken from the revision under review. 8.2 is the refuted one.

This is the round 1.1.1 shipped without. It ran after the tag again, and finding 8.5 is that fact.

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 8.1 | WRONG-PLAN | BLOCKER | AC-001.4 permits what AC-001.2 forbids: two trees, one version | confirmed: `f35864c` and `d9d1466` both declare 1.1.1 and differ in `.github/workflows/checks.yml` | open |
| 8.2 | DEFECT | BLOCKER | A mismatched backtick fence still closes a proof | **refuted**: the finding's own probe returns no match — three backticks closed by two matches nothing, so no span is accepted | discarded, counter-evidence recorded |
| 8.3 | DEFECT | MAJOR | AC-004.2 overclaims across the whole of Node 14 | confirmed by execution: 14.13.0 exits 1 with `ERR_UNSUPPORTED_ESM_URL_SCHEME`, because the `node:` specifiers link before the guard runs; 14.13.1 and 16.20.2 exit 2 with the named message | open |
| 8.4 | DEFECT | MAJOR | The directory check tests existence, not purpose | confirmed by execution: three empty `README.md` files and an undocumented `skills/undocumented/` pass the step with exit 0 | open |
| 8.5 | UNPROVEN | BLOCKER | The tagged repairs were never reviewed | confirmed: `90ff4e7..claude-code-route--v1.1.1` carries two commits, one of them the tag | open |
| 8.6 | UNPROVEN | BLOCKER | Nothing recorded compares the installed tree with the tag | confirmed: the install job installs and runs the suite, and compares no hash; the plan's proof row cites the 1.1.0 ancestry instead | open |
| 8.7 | UNPROVEN | MAJOR | The changelog proof cites a suite that does not carry it | confirmed: `CHANGELOG` and `Unreleased` appear nowhere in `tests/route-lint.test.mjs` | open |
| 8.8 | UNPROVEN | MAJOR | The Windows EPERM check passes vacuously | confirmed by reading: the assertion holds whenever the race does not occur, and round 6 measured it at about one writer in 250 | open |
| 8.9 | UNPROVEN | MAJOR | Nothing asserts the manifest's floor | confirmed by execution: `engines.node` set to `>=20.0.0` against scripts declaring 18, and the suite still reports 158/158 | open |
| 8.10 | MISPLACED | MAJOR | REQ-007 landed in three files, two outside scope | confirmed: `docs/README.md` and `skills/README.md` are added by the candidate and named by neither the placement row nor the scope | open |

**8.7 is the same defect as 7.8, on the same requirement.** Round 7 found REQ-003's proof citing
`cg_probe.js`, a file that never entered the repository; the repair replaced it with a citation to
the committed suite, which does not carry that gate either. A second finding on one requirement goes
to Plan whatever its class, and this one earns it: the requirement's proof has been wrong twice.

**8.1 is a contradiction the round-7 repair introduced.** AC-001.4 was written to state the window
between bumping the manifest and cutting the tag. AC-001.2 requires one artifact per version. Stating
a violation as a criterion does not satisfy the criterion it violates.

**8.5 and 8.6 are the honest shape of the release.** The installed tree *was* compared with the tag
by hand — 49 of 49 files identical — and the comparison is in no proof row and in no job. A check
that exists only in a transcript is the thing this skill exists to refuse.

**8.2 is the first refuted finding in eight rounds.** Its verification step, run unchanged, returns
no match: the scanner's fence is anchored and a three-backtick opening is not closed by two. The
reviewer's own probe, visible in its transcript, had already returned `accepted: false` twice.

## Round 9 — the round-8 repairs, before the tag

> 9 findings, 3 BLOCKER, 7 confirmed by execution, 2 by reading, 0 refuted. Generated from the table below by `.github/round-counts.mjs`.

Ran 2026-09-05 over `claude-code-route--v1.1.1..a7a9bdf`, the repair and nothing else, with the
evidence taken from that revision's own CI run. 

This is the first round in the project's history to run while its subject was still a candidate.

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 9.1 | WRONG-PLAN | BLOCKER | There is no reviewed 1.1.2 artifact to tag, and REQ-001's row already claimed its ancestry | confirmed: three commits past the tag, `plugin.json` and `CHANGELOG.md` unchanged, and `git rev-list ...v1.1.2..main` exits 128 | AC-001.6 states what the tagged commit may differ by; the row no longer claims a tag that does not exist |
| 9.2 | DEFECT | BLOCKER | The artifact comparison walked one way | confirmed: a file dropped from a simulated install left `differ=0` while 50 others remained | both sides walked, 53 against 53 with a floor on each |
| 9.3 | DEFECT | MAJOR | The directory check skipped what ships | confirmed: `.claude-plugin` and `.github` are tracked and the install carried all 51 files; and an indented heading counted as 60 characters of prose | published means tracked and git is asked; a heading is a heading at any indentation; both directories now state their purpose |
| 9.4 | UNPROVEN | BLOCKER | The proof rows cited a run that was not the candidate's | confirmed: rows cited `33930561278`, the receipt cited `33930715990` | repaired wrongly: the rows were pointed at a run of the revision then under review, and the candidate moved again. Round 10 found the same defect a third time; the rows now name a command that resolves against the tag rather than an identifier minted after the commit |
| 9.5 | UNPROVEN | MAJOR | The floor assertions matched digits, not declarations | confirmed by execution: `<=18` passed, and so did a README reading "Node 18 is unsupported; use Node 20" | both match the exact declaration, and both counterexamples fail |
| 9.6 | UNPROVEN | MAJOR | Node 18.0.0 was never run | confirmed: the matrix named the selector `18`, which resolves to the newest 18.x | the matrix names `18.0.0` too, green on all three platforms |
| 9.7 | UNPROVEN | MAJOR | REQ-005 was marked pass while AC-005.2 admits it cannot be | confirmed by reading the row against the criterion | the row closes AC-005.1 and AC-005.3 and marks AC-005.2 open |
| 9.8 | UNPROVEN | MAJOR | The scan of "the whole published tree" skipped `.github` | confirmed: the walker skips dot-prefixed entries, and the patch had just added two `.mjs` files there | the proof runs both paths; the second reports 0 and 0 |
| 9.9 | MISPLACED | MAJOR | Three placements omitted homes the repairs created or relied on | confirmed by reading the table against the files | REQ-001, REQ-004 and REQ-007 name what they actually own |

**9.1 is the shape of the problem, not a slip in it.** Every repair creates content the last round did
not see, so a rule of "tag only what was reviewed" never terminates on its own. AC-001.6 ends the
regress by bounding what the tagged commit may add: the version, the changelog and this plan's proof
rows, nothing else. What CI proved at the reviewed commit is then what the tag carries.

**9.4 is round 7's finding 7.15 returning on the author rather than the reviewer.** The proof rows
were updated to a CI run, the candidate then moved, and the rows kept pointing at the older run. A
freeze takes its evidence from the revision under review, and a revision that moves takes its
evidence with it.

**9.2 and the counting fix before it are the same defect twice.** The comparison was written, found
to pass without comparing, given a count — and the count only proved one side of it. A check that
walks a set and reports agreement proves nothing about what is not in that set.

## Round 10 — the round-9 repairs, and the scheme meant to end the regress

> 8 findings, 5 BLOCKER, 7 confirmed by execution, 1 by reading, 0 refuted. Generated from the table below by `.github/round-counts.mjs`.

Ran 2026-09-05 over `a7a9bdf..00fc38a`. 

| # | Class | Severity | Summary | Verified | Outcome |
| --- | --- | --- | --- | --- | --- |
| 10.1 | DEFECT | BLOCKER | The default branch carried a second tree named 1.1.1 | confirmed: six commits past the tag, both manifests reading 1.1.1, and the marketplace serves the branch | AC-001.7 written; **it did not stop the window reopening** — see 11.1 |
| 10.2 | UNPROVEN | BLOCKER | The proof rows cited a run that was not the candidate's, a third time | confirmed: `33932657547` six times, `33932948856` none | the rows name a command resolving against the tag; no identifier minted after the commit appears in it |
| 10.3 | DEFECT | BLOCKER | The round-9 history entry recorded the repair as the reviewed revision | confirmed: entry 30 carries `011a88e` where the round reviewed `a7a9bdf` | corrected by a later entry, the only way an append-only log can be corrected |
| 10.4 | WRONG-PLAN | BLOCKER | AC-001.6 did not close the regress | confirmed: recording the review that authorises the tag is itself a change to the tree being tagged, and no command enforced the criterion | rewritten: the version is cut first, the round reviews that SHA, the tag points at it, and what a release produces about itself lands in the next one |
| 10.5 | WRONG-PLAN | BLOCKER | T10 depended on T11 alone, so a criterion could stay open and ship | confirmed by reading the task table | T10 depends on every criterion being closed or waived, and the Waivers section exists |
| 10.6 | UNPROVEN | MAJOR | The published-tree scan reached neither `.github` nor `.claude-plugin` | confirmed: the walker skips dot-prefixed entries and `.claude-plugin` scans 0 and 0 | the proof row names all three paths |
| 10.7 | SCOPE | MAJOR | `.claude-plugin/README.md` landed outside the declared scope | confirmed: the scope permitted `plugin.json` alone | scope widened to the directory the placement already required |
| 10.8 | DEFECT | MINOR | A README contradicted the directory it described | confirmed: "two manifests and nothing else" against three tracked files | corrected |

**10.4 is the finding this round existed to produce.** AC-001.6 tried to bound what a tagged commit
may add. The bound could not hold, because a release produces facts about itself -- a verdict, a CI
run, a history entry -- that did not exist when the commit was written. The correction is not a
tighter bound but a different order: cut the version, review that commit, tag it, and let the
receipts land in the next release. A tag does not contain the record of its own review, and asking it
to was the mistake.

**10.1 had been live for six commits.** Repairs were pushed to the default branch while the manifest
still read 1.1.1, and the marketplace serves the default branch, so every install during that window
received a tree calling itself a version it was not. The rule that prevents it is AC-001.7 and it is
about where work happens, not about care taken: the default branch is a publication channel, so work
that is not a release belongs on a branch.

**10.2 is 7.15 and 9.4 in the same clothes.** Three rounds, one defect: a document citing the CI run
of its own commit cannot be right, because the run happens after the commit. Discipline had been
applied to it twice and failed twice; what fixes it is that the citation no longer names an
identifier at all.
