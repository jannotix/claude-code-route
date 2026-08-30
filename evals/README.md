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

`claude plugin eval` still reports `currently in early access` on this account, so the runner has
never executed the suite and the field names below follow the CLI's `--help` rather than a
successful run. Structure is checked in CI: manifest declaration, case names, grader references,
unreferenced graders, and that every grader states both a 1 and a 0 condition.

**Discrimination is measured on one case.** `proof-gate` was run by hand — the prompt through
`claude -p` against a scaffolded repository, twice, then each response graded by its own two rubrics
with a Haiku judge:

| Grader | Not invoked | Not invoked, after the description was rewritten | Invoked |
| --- | --- | --- | --- |
| `executed-proof.md` | **0** | **0** | **1** |
| `named-gap.md` | **0** | **1** | **1** |

The middle column is a second measurement. The skill's description was rewritten after the first run
to lead with the situations that should trigger it rather than with what it is. That moved one
grader from 0 to 1 and left the other at 0: the answer became more honest about what it had run, and
the skill still did not fire. The rewrite is kept because it is a better description and it measured
better, not because it solved anything.

The two responses are why. Without the skill: *"Done. Changed rounding.py to use half-to-even
rounding via ROUND_HALF_EVEN."* — the change was correct and nothing was run, which is the failure
the case exists to catch. With it: a plan, a declared scope, five acceptance tests created and
executed, and every requirement closed by a named execution with real values.

**And the finding that matters more than the score.** In headless `claude -p`, the skill did **not
auto-invoke** on that prompt, before or after the description was rewritten. It had to be named. The delta above is therefore between *skill
invoked* and *skill absent*, not between *plugin installed* and *plugin absent*, and the real
`--ablation with-without` arm would likely measure closer to zero until the skill fires on its own.
The suite's `tool_used: Skill` indicator exists to separate exactly these two things, and this run
is the first evidence that they need separating.

What would still close it: an account with the runner enabled, one `claude plugin eval
claude-code-route`, the field names corrected against what it accepts, and the other three cases
measured the way `proof-gate` now has been.
