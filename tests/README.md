# tests/

The proof for the three scripts, shipped so that the evidence a plan cites is frozen with the commit
it proves and runnable by anyone holding that commit.

```bash
node tests/route-lint.test.mjs
```

Exit 0 when every check passes. No dependencies, no framework. CI runs it on Linux, macOS and Windows
at Node 18, 22 and 24, from three working directories — `route-lint` reads `route.config.json` from
the directory it stands in, and a check that ignored that reported a different total depending on
where it ran.

`fixtures/` holds plan documents used as inputs: `clean` passes every gate, `broken`, `plan-stage` and
`false-negatives` each carry the defects a test asserts are caught. Source corpora with deliberate
defects are written at run time instead of kept here, so nothing defective ships.
