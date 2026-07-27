# Release primitives

Release orchestration is deferred. No script in this repository performs a release, and
`.github/workflows/release.yml` intentionally cannot publish. What remains here are the primitives the retained
build, publish and verification scripts import.

Reached by a current workspace script:

- `build-cli-sources.ts` — compiles the CLI binary and assembles the platform assets that ship next to it. Used by
  `build:dist`, `pkg:hl` and `test:cli-smoke`.
- `checksums.ts` — writes and verifies the `SHA256SUMS` manifest of a built distribution. Run directly by
  `release:checksums`, imported by `build:npm` and `test:release-artifact`. Its `checksums.spec.ts` is part of
  `test:release-security`.
- `args.ts` — parses the version and platform flags those build scripts accept (`--version`, `--major`, `--minor`,
  `--patch`, `--prerelease`, `--platforms`, …) and rewrites a `package.json` version. Used by `build:npm` and
  `build:dist`.
- `stacktape.ts` — `syncBucket`, used by `publish:install:scripts`, `publish:schemas` and `publish:llm:docs`.

Retained as inputs for the deferred pipeline, with no current caller: `get-version.ts` and `github.ts` (reachable
only through `scripts/github-actions/`, which nothing in this repository invokes yet).

Version selection, build sequencing, publishing and tagging return with the release-pipeline phase, together with
the v3 release workflow and its gate.
