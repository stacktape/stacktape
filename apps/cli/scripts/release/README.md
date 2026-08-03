# Release implementation

The root `pnpm release` command calls `trigger-release.ts`, a small local dispatcher for
`.github/workflows/release.yml`. The workflow owns the build and is the only release path: `candidate` produces a
verified artifact without authority, while `preview` additionally runs the real-AWS canary and publishes an immutable
GitHub/npm prerelease. See the root [`RELEASING.md`](../../../../RELEASING.md) for setup and operator instructions.

Reached by a current workspace script:

- `build-cli-sources.ts` — compiles the CLI binary and assembles the platform assets that ship next to it. Used by
  `build:dist`, `pkg:hl` and `test:cli-smoke`.
- `checksums.ts` — writes and verifies the `SHA256SUMS` manifest of a built distribution. Run directly by
  `release:checksums`, imported by `build:npm` and `test:release-artifact`. Its `checksums.spec.ts` is part of
  `test:release-security`.
- `args.ts` — parses the version and platform flags those build scripts accept (`--version`, `--major`, `--minor`,
  `--patch`, `--prerelease`, `--platforms`, …) and rewrites a `package.json` version. Used by `build:npm` and
  `build:dist`.
- `stacktape.ts` — `syncBucket`, retained for the stable-only `publish:install:scripts`, `publish:schemas` and
  `publish:llm:docs` paths. Preview releases intentionally do not call them.

The preview workflow directly uses the candidate archive and verification primitives. It also uses
`validate-release-input.ts`, `verify-candidate-assets.ts`, `verify-npm-package.ts`, and
`verify-published-preview.ts` to keep input validation, archive identity and public download checks executable and
unit-tested.

`get-version.ts` and `github.ts` remain stable-release primitives; the current explicit preview dispatcher does not
guess or modify a version. `scripts/github-actions/create-github-release.ts` is likewise retained for stable release
orchestration. Do not connect these to preview without updating the workflow tests and the documented channel
contract.
