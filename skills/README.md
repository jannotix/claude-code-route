# skills/

The product. `claude-code-route/` is the skill Claude Code loads: `SKILL.md` is the entry file that
sits in context, `references/` holds the per-role detail loaded only when a gate is in doubt,
`templates/` holds the plan skeleton, and `scripts/` holds the three deterministic checkers.

The scripts have no dependencies and make no network call. `SECURITY.md` at the repository root lists
what each one reads, writes and executes.
