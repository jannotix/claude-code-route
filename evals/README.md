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

**Unverified.** `claude plugin eval` reports `currently in early access` on the account this suite
was authored under, so no case here has ever been executed and the schema below follows the CLI's
own `--help` output rather than a successful run. What would close it: an account with the feature
enabled, one `claude plugin eval claude-code-route` run, and the field names corrected against
whatever the runner actually accepts.

Writing an unverified suite and calling it tested is precisely the failure this skill exists to
prevent, so it is recorded here instead.
