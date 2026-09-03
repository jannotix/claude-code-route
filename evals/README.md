# Eval suite

Three cases, each measuring one property the skill claims. They score the **skill**, not the scripts:
`tests/` already covers the scripts, and a green script says nothing about whether an agent
holding the skill behaves differently from one without it.

```bash
claude plugin eval claude-code-route
claude plugin eval claude-code-route --case plan-gate --runs 5
```

Every case runs under `--ablation with-without` by default, so the number that matters is the delta
against an agent with no plugin loaded. A case that scores well in both arms is measuring the model,
not the skill, and should be rewritten or deleted.

## Cases

| Case | Property under test | Fails when |
| --- | --- | --- |
| `plan-gate` | A rule gets a named home before code is written | The agent writes source with no placement decision |
| `proof-gate` | Nothing closes on a read | The agent reports done without executing anything |
| `depth-scales` | Rigour is proportional to blast radius | The agent writes a full plan for a typo |

`depth-scales` is the one that fails if the skill is over-applied rather than under-applied. A
discipline that cannot be cheap on a typo gets abandoned, so it is measured in the same suite as the
gates.

## Status

`claude plugin eval` accepts `--help` on this account but still answers `currently in early access`
on every execution, including `init`, re-checked 2026-09-03. The runner has never executed the suite.

Each case carries a `scaffold_script`, so it builds its own repository and needs no hand scaffolding
when the runner opens. The field name is the one the CLI's `--scaffold` help gives. Every block is
extracted with a YAML parser and passed through `bash -n` in CI, and all of them were executed to
build the arms measured below.

## Measured, by hand

Run on 2026-09-01 and 2026-09-03 in isolated sessions — `claude --restricted --plugin-dir <this
plugin>` for the *with* arm and no plugin for the *without* arm — then graded against each case's own
rubrics by a Haiku judge.

| Case | with | without | delta | skill fired on its own |
| --- | --- | --- | --- | --- |
| `plan-gate` | **2/2** | 1/2 | **+1** | **yes** |
| `proof-gate` | **2/2** | 0/2 | **+2** | no — invoked by name |
| `depth-scales` | 2/2 | 2/2 | 0 | no |

`plan-gate` is the one case measured end to end as a plugin: the skill fired by itself, wrote
`docs/route/plans/discount-code/PLAN.md` with a placement table mapping REQ-001..004 to named symbols
and a layer, and only then wrote source. The baseline named symbols in prose but produced no table
and left the layer implicit, which is `placement-table` scoring 0.

`proof-gate` is the largest delta and the weakest evidence, because the skill had to be named. Without
it: *"Done. Changed rounding.py to use ROUND_HALF_EVEN."* — correct edit, nothing executed, which is
exactly the failure the case exists to catch. With it: a plan, a declared scope, five tests created
and executed, every requirement closed by a named execution.

`depth-scales` scoring 2/2 in both arms is the result it is designed for. It is a guard-rail, not a
discrimination case: it fails on over-application, and equal arms mean the discipline did not make a
typo expensive. The delta is not the number to read on it.

## The case that was retired

`comment-voice` is gone. It measured whether comments carry what the code cannot, and across **three
designs it never separated the arms**:

1. *Write a retry function, comment it well.* Both arms 2/2. The model writes a constraint-carrying
   comment for that prompt unaided, so the case measured the model.
2. *Annotate this dense function line by line, leave a TODO, keep the old line commented out.* Both
   arms 0/2. The three requests are for exactly the forms the voice rules ban, and both arms complied.
   That is not a defect in either: an explicit instruction from the user is not a rule the skill
   should silently override, so the grader was asking for the wrong thing.
3. *The same file and constraints, without the two obedience traps.* The arms visibly differ — the
   baseline annotates the accumulation loop, the day rollover and the success branch; the skill arm
   annotates only the three constraints and leaves the mechanics alone — but both still carry at
   least one comment that restates its line, so a binary rubric scores both 0.

The property is real and the skill improves it. It is not separable by a binary pass or fail from an
LLM judge on one file, and rewriting the case a fourth time until it flattered would have been
fitting the measurement to the answer. By the rule at the top of this file it was deleted instead.

Two things were checked before deleting, and neither rescued it. `route-lint` carries deterministic
comment checks — banner, emoji, ownerless TODO, commented-out code, step narration, non-English — and
**none of them fired on either arm's output**, so the property is not covered deterministically
either. That is a real gap, and it now has a reproduction: the prompt, the graders and both observed
outputs are kept in `tests-debug/comment-voice-retired/` for whoever strengthens the narration
heuristic, which is out of scope for the current lint plan.

## What auto-invocation depends on

The old claim in this file — that the skill does not auto-invoke headless — was measured on one prompt
and generalised too far. Two things decide it, both established by execution.

**Roster size decides whether the description is read at all.** On a machine with 466 plugin skills
installed, a headless session lists this skill as the bare name `claude-code-route:claude-code-route`
with no description; asked to quote it, the model reports there is none. Loaded alone with
`--plugin-dir`, the same probe quotes it back: *"Use when changing code that has to actually work"*.
A description the model never sees cannot trigger anything, and no rewrite of it can fix that.

**Blast radius decides whether it fires.** With the description visible, the skill invoked itself on
`plan-gate` — a real capability with four requirements — and did not on any one-file task. On
`depth-scales` that is the depth rule working. On `proof-gate` it is a genuine miss: the change is
small and the reporting failure is not.

One more thing worth recording, found while measuring the retired case: **the `/claude-code-route`
slash form does nothing as a prompt prefix in headless mode.** The transcript showed no `Skill` call
and no skill text; the model simply went looking for a Bash tool. Naming the skill in words — *"Use
the claude-code-route skill for this task"* — invoked it properly. An arm labelled "with the skill"
because of a slash prefix is mislabelled.

So the honest statement is narrower than the old one: **the skill fires on work with blast radius,
provided its description is visible.** Name it in words for small changes, and on a machine with
hundreds of skills installed, name it regardless.
