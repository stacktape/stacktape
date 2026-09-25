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

## The two ES bundlers

`bundlers/es` builds one Lambda at a time; `split-bundler` builds many in one pass so shared code can become a layer.
They ask the same question of every bare import — bundle it, leave it to the runtime, or externalize and install it —
and they differ only in where the answer is recorded, flat arrays against per-importer attribution.

That decision lives once, in `es/import-classification`, and the plugins both call it. Add a rule there, never in a
plugin: two copies of these rules drifted for months and shipped the AWS SDK in every split artifact. `es/bun-plugins`
holds the plugins both builds install for the same reason. Where the two must genuinely differ, say so at the call site
and say why; `alsoExternal` in the split plugin is the worked example.

`jscpd` guards this: both files are in `pnpm check:duplicates`. Do not put either back on the ignore list.

`es/minify` decides what "minify" means for both builds: whitespace and syntax, identifiers only when the user asks. The
Console's issue detector groups runtime errors by message and function name, and mangled names change every build. The
AWS SDK rule in `es/import-classification` leaves `@aws-sdk/client-*` and `@aws-sdk/lib-*` to the Lambda runtime and
nothing else; the e2e script's runtime probe is the evidence for that list, and `bundleAwsSdk` is the way out for code
that needs a newer SDK than the runtime ships.

## Sensitive behavior

Changes to source selection, digest exclusions, runtime defaults, emitted paths or import rewriting can invalidate
caches or produce artifacts that deploy but cannot load. Preserve these contracts deliberately:

- an artifact's identity is its bytes and its configured inputs, never a path from the build host: an absolute path in a
  digest defeats the cache the customer's own bucket provides across machines and runs;
- what a split build must do besides bundling — Prisma engines, the tracing wrapper, file selection — is what the
  per-Lambda buildpack does after its own bundle; anything missing here is a function that deploys and then fails, so a
  split build either does it or the CLI's policy keeps that function off this path;
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
