# @stacktape/packaging

This package builds deployable Lambda, container and web artifacts. It owns language bundlers, image buildpacks, custom
artifacts, Dockerfile and Railpack (`buildpack`) image builds, hosting and SSR builds, ES split bundling, artifact
hashing and runtime defaults.

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

A subpath import (`#name`) that the importing package's `imports` map points at a package is asked about that package,
and an import left out of the bundle is written with the package's own name, because the artifact keeps no `imports`
map.

That decision lives once, in `es/import-classification`, and the plugins both call it. Add a rule there, never in a
plugin: two copies of these rules drifted for months and shipped the AWS SDK in every split artifact. `es/bun-plugins`
holds the plugins both builds install for the same reason. Where the two must genuinely differ, say so at the call site
and say why.

`jscpd` guards this: both files are in `pnpm check:duplicates`. Do not put either back on the ignore list.

`es/minify` decides what "minify" means for both builds: whitespace and syntax, identifiers only when the user asks. The
Console's issue detector groups runtime errors by message and function name, and mangled names change every build. The
AWS SDK rule in `es/import-classification` leaves `@aws-sdk/client-*` and `@aws-sdk/lib-*` to the Lambda runtime and
nothing else; the e2e script's runtime probe is the evidence for that list, and `bundleAwsSdk` is the way out for code
that needs a newer SDK than the runtime ships.

## Packages the bundle leaves out

Everything is bundled except native packages, packages that read their own files at run time and packages the
configuration excludes. `es/native-packages` decides what is native from the installed files (addons, `binding.gyp`,
prebuilds, `os`/`cpu`/`libc`, platform optional dependencies, and compiled programs, whose headers show their system,
architecture and C library), never from a list of names; an install script alone does not count.
`es/self-reading-packages` finds packages such as pdfkit that read a file they ship through a path built from
`__dirname` or `import.meta.url`: only packages that ship data files are checked, and only the files their main entry
point loads. A short list names the few packages that give no such sign. Both kinds leave the bundle the same way.
`es/native-dependencies` copies each left-out package with what a production install (`npm install --omit=dev`) gives it
from the project's `node_modules`: dependencies, optional dependencies built for Lambda's platform and required peers.
An optional peer comes only when a production install of the project has it for another reason: it is reachable from
`dependencies` or `optionalDependencies` of the project's own manifests, through dependencies, optional dependencies and
required peers, whether the function bundles those packages or copies them (`getProductionDependencies` in
`es/installed-packages`). The manifests are the detected project root's and every `package.json` from each source file's
directory up to the first workspace root or top of a Git clone or worktree, where `findProjectRoot` stops. A nested
manifest therefore never hides the ones around it, and nothing outside the repository is read. Outside Git and any
workspace (a tarball, or CI sources copied without `.git`) the walk stops at the nearest directory with a lockfile
(`package-lock.json`, `npm-shrinkwrap.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock` or `bun.lockb`); without one,
only the nearest manifest counts. `findProjectRoot` keeps its own rule. One build computes this once for all its
functions (`createProductionDependencyCache`) and the next build starts again. The same rule decides which native peers
of a bundled package are installed (`optionalPeer`): Prisma's optional TypeScript peer stays out of a project that has
TypeScript only in `devDependencies`. Never decide from a package's source whether it loads a package: native compilers
such as `@swc/core` emit imports that no script spells out. `es/installed-packages` reads npm, pnpm, Yarn and Bun
layouts alike and repeats the installed layout under the artifact's `node_modules/.installed`: each package's real
directory once, at its path relative to the project, with the `node_modules` links that lead to it. Every package
therefore resolves what it resolved on the build machine. The artifact's top-level `node_modules` links each package the
bundle requires to the installation the bundle resolved. An SSR framework's native runtime package (Astro's `sharp`)
also gets its own dependencies linked there, because the framework bundle inlines its JavaScript, which then requires
its platform build (`@img/sharp-linux-x64`) from the bundle's directory. The Lambda archive stores the links; on Windows
they are junctions. A package's `.yarn` directory, Yarn's state that some packages publish by mistake, is never copied.
The digest covers the copied files and the links. Only a native package whose installed files do not run on Lambda is
installed again, with npm in the Lambda build image, one installation per version, with its dependencies pinned to the
installed ones; the artifact keeps the build machine's copies of those dependencies and takes only the rebuilt package
and its platform packages from the image. On a Linux build machine with glibc that is rare, so most builds never start
Docker. Externalizing a package never externalizes its dependencies: a bundled importer keeps its own copy.

## Sensitive behavior

Changes to source selection, digest exclusions, runtime defaults, emitted paths or import rewriting can invalidate
caches or produce artifacts that deploy but cannot load. Preserve these contracts deliberately:

- an artifact's identity is its bytes and its configured inputs, never a path from the build host: an absolute path in a
  digest defeats the cache the customer's own bucket provides across machines and runs. Bun's chunk names, debug IDs,
  module path comments and map `sources` all depend on the absolute build path; `es/artifact-identity` neutralizes them
  after every build, and the CLI's `test:node-lambda` builds the same project from two directories to prove it;
- what a split build must do besides bundling — Prisma engines, the tracing wrapper, file selection — is what the
  per-Lambda buildpack does after its own bundle; anything missing here is a function that deploys and then fails, so a
  split build either does it or the CLI's policy keeps that function off this path;
- a Lambda carries Prisma's engine and schema in `.prisma/client` under `/var/task`, and its bundled client is pointed
  there, because a split build can move the client into a layer under `/opt`; an image keeps them beside its bundle. A
  client with an engine whose generated fallback the build does not recognize fails the build, and a query-compiler
  client keeps its own fallback. Which engine a client has comes from the configuration its `index.js` records, however
  a tool reformatted it, for the files copied and the rewrite alike (`getPrismaClientEngine`), never from the files
  beside it: regenerating leaves the previous engine there. A Lambda client whose engine cannot be read fails the build;
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
