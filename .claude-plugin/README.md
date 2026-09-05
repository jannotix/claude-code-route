# .claude-plugin

Two manifests the Claude Code marketplace reads, and nothing else.

`plugin.json` names the plugin, its version, the runtime floor its scripts require, and the eval
suite. `marketplace.json` is what `claude plugin marketplace add` fetches to find the plugin at all.

The version in `plugin.json` is the same string as the release tag, and the tag points at the commit
that bumps it — a commit that declares a version whose tag does not yet exist is how one version came
to name two different trees. Both files ship: the install carries this directory verbatim.
