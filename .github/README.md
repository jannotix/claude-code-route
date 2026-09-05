# .github

The checks that run on every push, and the two gates they call.

`workflows/checks.yml` holds three jobs: static checks over the manifests and the skill, the test
suite across Linux, macOS and Windows at each supported Node version, and an install job that adds
the marketplace, installs the plugin, hashes every installed file against the default branch, and
runs the installed copy's own suite.

`changelog-gate.mjs` and `published-dirs.mjs` were once inline in the workflow, where the only way to
exercise them was to push. They are modules the workflow calls and the test suite runs both ways, so
each gate is proven to fail on the thing it exists to catch.

This directory ships with the plugin; the install carries it like every other tracked file.
