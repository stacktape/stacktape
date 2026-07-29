# @stacktape/packaging

The deployment-package build engine extracted from the CLI. It owns ES split bundling from dependency analysis and the
single Bun build through emitted Lambda entrypoints, shared chunks, layer assignment, layer writing, and the import
rewrites that connect those artifacts.

## Ownership boundary

The boundary is the CLI's own runtime state and orchestration vocabulary, not an architectural layer:

- ES package/module resolution, split-build policy, emitted file processing, and code that only needs chunk metadata,
  file contents and paths live here.
- The package may depend on `@stacktape/config` for configuration types that its implementation genuinely consumes.
  Keeping those types beside the packaging contracts is preferable to duplicating them or relying on CLI ambient
  declarations.
- The CLI's concrete dependency installer and typed `StacktapeError` remain application concerns. The split bundler
  accepts exactly two actions for those boundaries: `installDependencies()` and `createPackagingError(details)`.
- Installing native Node dependencies is package behavior, while invoking the Docker CLI and allocating Stacktape's
  invocation-specific build root remain application concerns. The native-dependency builder therefore accepts the
  explicit installation root and one `runDocker(commands)` action.
- `eventManager`, `globalStateManager`, command arguments, higher-level layer deployment and user progress remain in
  `apps/cli/src/domain/packaging-manager`, which is still the composition root.

## Layout

- `src/runtime-contracts.ts` — explicit packaging inputs and outputs shared with the CLI. It imports authoritative
  configuration types where needed and does not import application code.
- `src/split-bundler/types.ts` — the chunk/layer vocabulary. It is deliberately structural:
  `SplitBundleDependency` describes only what this engine reads, so nothing in the package needs the CLI's globals.
- `src/es/` — ES packaging policy, package/module resolution, ESM output compatibility, and project-root discovery
  shared by the regular and split ES bundlers, plus native dependency installation and Lambda-layer layout.
- `src/split-bundler/bundler.ts` — dependency installation boundary, Bun build, metafile analysis, entrypoint/chunk
  emission and source-map copying.
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
