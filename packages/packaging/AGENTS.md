# @stacktape/packaging

This package builds deployable Lambda, container and web artifacts. It owns language bundlers, image buildpacks, custom
artifacts, Dockerfile/Nixpacks behavior, hosting and SSR builds, ES split bundling, artifact hashing and runtime
defaults.

The CLI remains the composition root. It supplies invocation paths, dependency installation, process/Docker actions,
errors and progress reporting. Packaging code accepts only the values and callbacks it uses; it never imports the CLI or
reads global invocation state.

## Boundaries

- File selection, hashes, cache digests and artifact sizes live here because they define artifact identity, not because
  they are generic filesystem helpers.
- Runtime defaults live here and are imported by synthesis so packaging and generated templates cannot disagree.
- Native dependency policy is package behavior. The CLI still owns Docker execution and the invocation build root.
- Layer upload and deployment orchestration stay in the CLI; layer assignment and artifact construction live here.
- Depend on `@stacktape/config` only for authored packaging inputs. Do not copy those types.
- Export only concrete subpaths used outside this package. Internal modules use relative imports; do not add a barrel.

## Sensitive behavior

Changes to source selection, digest exclusions, runtime defaults, emitted paths or import rewriting can invalidate
caches or produce artifacts that deploy but cannot load. Preserve these contracts deliberately:

- split chunks promoted into a layer carry their dependency closure;
- a chunk that cannot be packed is un-layered together with its importers;
- layer files use the `nodejs/chunks` layout expected by Lambda;
- the layer content hash represents the bytes that decide re-upload;
- secrets passed to Docker use stdin/environment-safe mechanisms and never appear in argv.

Prefer semantic tests over abstractions introduced only to reduce duplicate-code metrics. The language buildpacks are
explicitly repetitive where each language has different tools and failure behavior.

## Checks

```sh
pnpm --filter @stacktape/packaging run typecheck
pnpm --filter @stacktape/packaging run test
pnpm test:packaging-e2e
```

The package is strict-TypeScript-clean. Unit tests use Bun because some artifact code uses `Bun.file` and `Bun.hash`.
The root E2E lane requires Docker and runs produced artifacts; it does not contact AWS.
