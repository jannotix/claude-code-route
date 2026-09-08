# .github

The checks that run on every push, and the three gates they call.

`workflows/checks.yml` holds three jobs: static checks over the manifests and the skill, the test
suite across Linux, macOS and Windows at each supported Node version, and an install job that installs
the plugin from this checkout, hashes every installed file against the commit under test in both
directions, checks that the CLI lists the skill at that version, and runs the installed copy's own
suite. On the default branch it then reinstalls through the marketplace and repeats those checks over
what the channel served, which is the only place that channel can serve this commit.

`changelog-gate.mjs`, `published-dirs.mjs` and `round-counts.mjs` were once inline in the workflow,
or not written at all. They are modules the workflow calls and the test suite runs both ways, so each
gate is proven to fail on the thing it exists to catch. The third generates each round summary's
counts from the table itself and checks that the file already holds them, because seven wrong figures
across two releases were all in prose and every attempt to read that prose was got past.

This directory ships with the plugin; the install carries it like every other tracked file.
