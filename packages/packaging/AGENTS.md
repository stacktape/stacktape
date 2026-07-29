# @stacktape/packaging

The deployment-package build engine extracted from the CLI. It owns the part of packaging that turns an already
split-bundled set of Lambda entrypoints into shipped artifacts: deciding which shared chunks become AWS Lambda layers,
writing those layers, and rewriting the chunk import paths that both halves of that split then depend on.

## Ownership boundary

The boundary is the CLI's own runtime state and orchestration vocabulary, not an architectural layer:

- Code that only needs chunk metadata, file contents and paths lives here.
- The package may depend on `@stacktape/config` for configuration types that its implementation genuinely consumes.
  Keeping those types beside the packaging contracts is preferable to duplicating them or relying on CLI ambient
  declarations.
- Code that raises typed `StacktapeError`s, drives `eventManager` progress events, reads `globalStateManager`, or is
  coupled to CLI command arguments stays in `apps/cli`. Do not move those dependencies behind generic ports merely
  to make a file fit in the package.

That is why `apps/cli/shared/packaging/bundlers/es/split-bundler/bundler.ts` — which installs the user's dependencies,
reports progress and raises `PACKAGING` errors — is still an application module even though it consumes this package.
`apps/cli/src/domain/packaging-manager` remains the composition root: it decides what to package, computes S3 keys and
digests, and reports to the user.

## Layout

- `src/runtime-contracts.ts` — explicit packaging inputs and outputs shared with the CLI. It imports authoritative
  configuration types where needed and does not import application code.
- `src/split-bundler/types.ts` — the chunk/layer vocabulary. It is deliberately structural:
  `SplitBundleDependency` and `ProgressLogger` here describe only what this engine reads, so nothing in the package
  needs the CLI's globals.
- `src/split-bundler/layer-assignment.ts` — which chunks become layers (`DEFAULT_LAYER_CONFIG`, dependency-aware
  promotion, first-fit-decreasing packing, and un-layering whatever the packing could not place along with its
  importers, because a layered chunk cannot import one that stayed in the Lambda package).
- `src/split-bundler/layer-builder.ts` — writing the `nodejs/chunks` layer tree, pruning the lambda package, and the
  content hash that decides whether a layer is re-uploaded.
- `src/split-bundler/chunk-rewriter.ts` — the import-path rewriting both of the above depend on.

There is no barrel: `package.json` `exports` lists one subpath per module, and every consumer imports the module it
actually uses.

## Checks

```sh
pnpm --filter @stacktape/packaging run typecheck
pnpm --filter @stacktape/packaging run test
```

`layer-builder.ts` uses `Bun.file`/`Bun.hash`, so the tests run under `bun test` like the CLI's own suites. Unlike the
CLI, this package compiles under the strict workspace `tsconfig.package.json`.
