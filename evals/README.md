# Eval suite

Four cases, each measuring one property the skill claims. They score the **skill**, not the scripts:
`tests-debug/` already covers the scripts, and a green script says nothing about whether an agent
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
| `comment-voice` | Comments carry what the code cannot | The agent narrates the code in comments |

`depth-scales` is the one that fails if the skill is over-applied rather than under-applied. A
discipline that cannot be cheap on a typo gets abandoned, so it is measured in the same suite as the
gates.

## Status

`claude plugin eval` accepts `--help` on this account but still answers `currently in early access`
on every execution, including `init`, re-checked 2026-09-01. The runner has never executed the suite.

Each case now carries a `scaffold_script`, so it builds its own repository and needs no hand
scaffolding when the runner opens. The field name is the one the CLI's `--scaffold` help gives. Every
block was extracted with a YAML parser and passed through `bash -n`, and all four were executed to
build the arms measured below. Structure is checked in CI: manifest declaration, case names, grader
references, unreferenced graders, and that every grader states both a 1 and a 0 condition.

## Measured, by hand

All four cases were run on 2026-09-01, both arms each, in an isolated session — `claude --restricted
--plugin-dir <this plugin>` for the *with* arm and no plugin for the *without* arm — then graded
against each case's own rubrics by a Haiku judge.

| Case | with | without | delta | skill fired on its own |
| --- | --- | --- | --- | --- |
| `plan-gate` | **2/2** | 1/2 | **+1** | **yes** |
| `proof-gate` | **2/2** | 0/2 | **+2** | no — invoked by name |
| `depth-scales` | 2/2 | 2/2 | 0 | no |
| `comment-voice` | 2/2 | 2/2 | 0 | no |

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
typo expensive. It stays for that reason, and the delta is not the number to read on it.

**`comment-voice` does not discriminate and should be rewritten or deleted.** Both arms scored 2/2:
the model writes a constraint-carrying comment for this prompt without any help. By the rule at the
top of this file that makes it a measurement of the model, and it is recorded here rather than
quietly kept.

## What auto-invocation actually depends on

The earlier claim in this file — that the skill does not auto-invoke headless — was measured on one
prompt and generalised too far. Two things were found on 2026-09-01, both by execution.

**Roster size decides whether the description is read at all.** On a machine with 466 plugin skills
installed, a headless session lists this skill as the bare name `claude-code-route:claude-code-route`
with no description; asked to quote it, the model reports there is none. Loaded alone with
`--plugin-dir`, the same probe quotes it back: *"Use when changing code that has to actually work"*.
A description the model never sees cannot trigger anything, and no rewrite of it can fix that.

**Blast radius decides whether it fires.** With the description visible, the skill invoked itself on
`plan-gate` — a real capability with four requirements — and did not on `proof-gate`, `depth-scales`
or `comment-voice`, all of which are one file or less. On `depth-scales` that is the depth rule
working. On `proof-gate` it is a genuine miss: the change is small and the reporting failure is not.

So the honest statement is narrower than the old one: **the skill fires on work with blast radius,
provided its description is visible.** Name it or run `/claude-code-route` for small changes, and on
a machine with hundreds of skills installed, name it regardless.
