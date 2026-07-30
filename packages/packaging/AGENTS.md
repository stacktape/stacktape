# @stacktape/packaging

The deployment-package build engine. It owns language bundlers, Stacktape/external image buildpacks, custom
artifacts and Dockerfiles, Nixpacks, Lambda artifacts, hosting-bucket builds, Next.js/SSR packaging, and ES split
bundling through emitted Lambda entrypoints, shared chunks, layer assignment and import rewrites. It also owns the
artifact-identity primitives every language bundler depends on: source-file selection, content hashing, artifact size
reporting, cache digests, and the language/runtime defaults that decide what an unpinned workload is built with.

The former CLI-owned packaging implementation has been removed. Do not recreate forwarding wrappers in the
application.

## Ownership boundary

The boundary is the CLI's own runtime state and orchestration vocabulary, not an architectural layer:

- ES package/module resolution, split-build policy, emitted file processing, and code that only needs chunk metadata,
  file contents and paths live here.
- The package may depend on `@stacktape/config` for configuration types that its implementation genuinely consumes.
  Keeping those types beside the packaging contracts is preferable to duplicating them or relying on CLI ambient
  declarations.
- The CLI's concrete dependency installer, typed `StacktapeError`, process runner, Docker runner and installed binary
  paths remain application concerns. Packaging functions accept only the concrete callbacks and values they use:
  `installDependencies()`, `createPackagingError(details)`, `executeProcess()`, `runDocker()`, `runPack()`,
  `runNixpacks()`, and explicit build/source-map paths.
- Installing native Node dependencies is package behavior, while invoking the Docker CLI and allocating Stacktape's
  invocation-specific build root remain application concerns. The native-dependency builder therefore accepts the
  explicit installation root and one `runDocker(commands)` action.
- `eventManager`, `globalStateManager`, command arguments, higher-level layer deployment and user progress remain in
  `apps/cli/src/domain/packaging-manager`, which is still the composition root.

## Layout

- `src/fs/files.ts` — which files a build selects (globs), how their bytes become a digest, and how artifact sizes are
  reported. These are artifact-identity semantics, not generic filesystem helpers: the CLI keeps its own path/IO
  helpers in `src/utils/fs-utils.ts`, and the few application call sites that need _these_ meanings import this
  module so a digest is computed one way only.
- `src/artifact/hashing.ts` — directory checksums, digest merging, and the directories excluded from a project
  checksum. Changing any of them invalidates every cached artifact.
- `src/bundlers/constants.ts` — language and Node.js runtime defaults for workloads that do not pin a version. The
  CLI's resource resolvers import the same constants, so synthesis and packaging cannot disagree about a runtime.
- `src/bundlers/node-version.ts` — the explicit → AWS-runtime-identifier → default resolution order.
- `src/bundlers/digest.ts` — the source-set digest every language bundler caches on.
- `src/vendor-modules.d.ts` — narrow declarations for `cup-readdir` and `folder-hash`, which ship no types. The CLI
  compiles them as `any`; this package compiles strictly, so the shapes are stated rather than suppressed.
- `src/runtime-contracts.ts` — explicit packaging inputs, outputs and narrow injected-action types shared with the
  CLI. It imports authoritative configuration types where needed and does not import application code.
- `src/bundlers/` and `src/buildpacks/` — language-specific artifact builders and the Lambda/image policies that
  compose them.
- `src/artifact/`, `src/image/` and `src/web/` — custom/Lambda archives, Dockerfile/buildpack/Nixpacks images, and
  hosting/Next.js/SSR artifacts.
- `src/docker/dockerfiles.ts` — deterministic Dockerfile text generation. Docker execution remains injected.
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

There is no barrel. `package.json` exports only the concrete subpaths consumed outside this package; package-internal
modules use relative imports and remain private. External consumers import the narrow module they actually use.

## Checks

```sh
pnpm --filter @stacktape/packaging run typecheck
pnpm --filter @stacktape/packaging run test
```

`layer-builder.ts` uses `Bun.file`/`Bun.hash`, so the tests run under `bun test` like the CLI's own suites. Unlike the
CLI, this package compiles under the strict workspace `tsconfig.package.json`.

The duplicate-code check narrowly excludes the language buildpacks, legacy language-bundler entrypoints, image
builders, ES bundler entrypoint and Dockerfile generator that were moved here from the historically ignored
`apps/cli/**` tree. This preserves their existing exemption without weakening the zero-duplication threshold for new
packaging modules. Do not broaden the exclusion or add abstractions merely to satisfy the metric. Consolidate a
repeated workflow only when characterization tests show that its behavior is genuinely shared.
