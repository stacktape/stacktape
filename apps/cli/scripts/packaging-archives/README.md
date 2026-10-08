# Packaging and artifact acceptance

Read the [test-selection policy](../../../../docs/testing.md) first, then only the lane relevant to the changed
behavior. Run commands from the public workspace root. These procedures describe coverage and prerequisites, not a
checklist for every change.

Use `pnpm test:packaging-e2e` for archive/image behavior, and
`pnpm --filter @stacktape/cli run test:runtime-acceptances` for the CLI-process acceptances below (helper Lambdas,
Node.js Lambdas through the package command, SSR starters); the qualification runtime lane runs both. Use the import,
package, and runtime qualification lanes for customer projects as described in
[project qualification](../../../../docs/project-qualification.md). The package lane intentionally blocks unreviewed
project code on the host. Packaging proves that artifacts can be produced; only the runtime and AWS lanes prove that
they run.

## Lambda archives

`pnpm --filter @stacktape/cli run test:lambda-archives` tests ZIPs made by the CLI's own archiver. It extracts each
archive with `unzip` into a new directory and invokes it in the official Lambda Node.js image as an unprivileged user
that owns none of the files: executables, a single file, hidden entries, links, removed files and quoted paths, through
archiver, zip, 7-Zip and a failing native tool. It also seeds local deployment buckets with permission-broken ZIPs under
their pre-format keys. Custom and managed packaging must rebuild them, reuse the rebuilt objects, and rebuild after a
chmod-only change. Split functions with their shared and native layers go through the deploy command's own packaging and
upload code, with local stand-ins for S3, CloudFormation and Docker: they must replace the old objects, reuse unchanged
ones, and rebuild after a mode-only change exactly where the archive changes. It needs Docker and `unzip`. Pass
`--zip-dir` and `--7z-dir` for tools not on `PATH`; a native tool it cannot find is reported as not qualified.

## Asset replacement

`pnpm --filter @stacktape/cli run test:asset-replacer` runs the service helper's Next.js asset replacer as a stack does.
It builds every helper artifact with the release packaging and verifier, then runs the service helper's ZIP in the
official Lambda Node.js 22 image for x86_64, its deployed runtime, as the same unprivileged user, with an owned host
directory as `/tmp`. The helper container shares the network namespace of a fixture container that has no network, so
the SDK the runtime provides reaches only the fixture's S3 and CloudFormation-response endpoints on loopback. One warm
container receives two Creates for one key with different inputs and values, a key with several dots, an invalid ZIP,
ZIPs with escaping links (one with non-ASCII names), a refused download, a refused upload and a Delete. A second
container, whose `/tmp` is a 10 MiB tmpfs, must replace values in a package with 4 MiB of incompressible data. Each
outcome is read from the CloudFormation response, not the invocation status. Uploaded ZIPs are extracted with `unzip`,
inspected and run in the Lambda runtime; the helper's logs must not contain any search or replacement value, and its
`/tmp` must be left as it was. It needs Docker and `unzip`, not AWS. `--helper-lambdas-dir` characterizes already built
helper artifacts instead, and the report marks them as supplied.

## Node.js Lambdas through the package command

`pnpm --filter @stacktape/cli run test:node-lambda` runs the CLI's own `package` command as a child process, in an
isolated home with every AWS and Stacktape request routed to the offline guard, on a TypeScript project outside the
repository: an ESM split group whose shared module becomes a chunk layer, with a dynamic `import()`, a file asset, an
ESM-only dependency and `@aws-sdk/client-s3`, and a CommonJS `.cjs` function packaged for Node.js 22. Each ZIP is
extracted with `unzip` and invoked in the official Lambda image for its runtime as the unprivileged user, with the
layers at `/opt` and source maps enabled: the shared chunk must load from the layer and not be duplicated, the dynamic
import and the asset must resolve under `/var/task`, the AWS SDK must come from `/var/runtime` and be absent from the
ZIP, `__dirname` must be `/var/task`, and a thrown error must name the original TypeScript file and line. Then an
unchanged repeat must reproduce every digest and the layer bytes, an edit of one function must change only its digest,
and the untouched project built from another directory must reproduce the first digests and layer bytes, and no file of
a function or layer may mention the build host's temporary or home directory. `--keep` leaves the fixture and the CLI's
build directories. It needs Docker and `unzip`, not AWS.

The lane splits across hosts: `--export <dir>` runs the build phase only (the CLI packages, digests are compared) and
copies the first and edited builds' ZIPs and assembled `/opt` into the directory with a manifest, on any host the CLI
supports, Windows included; `--import <dir>` runs the Lambda runtime checks on that directory on Linux. A Windows
packaging job is the export phase on a Windows runner with the directory uploaded as an artifact, and the import phase
on a Linux runner that downloads it.

## SSR starters in the Lambda runtime

`pnpm --filter @stacktape/cli run test:ssr-web` materializes each SSR starter (Astro, Nuxt, SolidStart, SvelteKit,
TanStack Start, Remix, Next.js) as `stacktape init` writes it and packages it with the `package` command the same way;
the CLI installs the dependencies and runs the framework build. The server function ZIP is extracted and invoked in the
Lambda Node.js 24 image as the unprivileged user with HTTP API v2 events: the index page must be HTML, the starter's
`/api/hello` route must answer from server code, an unknown path must get the framework's not-found status, a request
with a cookie must still be served, and the build must leave hashed assets for the hosting bucket.
`--starter <id>[,<id>]` selects starters. It needs Docker, `unzip` and network for the installs, not AWS.

## Helper Lambdas in the Lambda runtime

`pnpm --filter @stacktape/cli run test:helper-lambda-runtime` builds the helper Lambdas as a release does (or takes
`--helper-lambdas-dir`), verifies them, and runs the two CDN edge functions in the Lambda Node.js 22 image as the
unprivileged user with CloudFront origin-request and origin-response events: single-page-application rewrites, files
with extensions, bucket origins without URL normalization, the rewrite-host header on custom origins, and the
`x-amz-meta-` prefix removal on bucket responses. The service helper is covered by the asset replacement lane; the batch
job trigger and the uptime prober need live AWS and the Console API. It needs Docker and `unzip`, not AWS.

## Docker preparation

`pnpm --filter @stacktape/cli run test:docker-preparation` packages small projects through the CLI's own
`packageAllWorkloads`, each in a fresh process whose `docker` is a generated stand-in. The stand-in records every
command and answers only what the scenario's Docker state allows: a broken buildx, an unreachable or stuck daemon, a
missing arm64 platform, or an existing registry-cache builder. It refuses privileged containers, binfmt installation and
builder changes, and fails like Docker when a build targets an unsupported platform or uses the registry cache before
`docker login`. Pure JavaScript and custom artifacts must be packaged without any Docker command, whatever Docker's
state. A pure JavaScript split group is built together even when Docker is unreachable, stuck or not installed. Without
Docker, its function ZIPs and its shared layer, zipped as a deployment zips it, must hold the same entries as with
Docker ready, and each function must run in the Lambda Node.js image with the layer at `/opt`. A single function, and
any group under `--disableLayerOptimization`, stays per function. A split group whose shared analysis finds a native
dependency may only ask `docker info`, and without Docker must fail before any artifact, naming the dependency. Four
deployments of two image jobs against a stand-in registry must keep each job's registry cache tag while the job exists,
so later builds import it; old image versions and replaced cache images must still be deleted, and a removed job's cache
tag with the next deployment. Lambda ZIPs over 50 MB, on their own, split and as a custom artifact, must package and run
in the Lambda image; a split function whose package and Stacktape layers exceed 250 MB together must fail before any
upload, naming each size. A job that needs Docker must prepare only the platform it builds for, once for concurrent
jobs, using the pinned binfmt helper. The registry-cache builder and ECR login must be prepared only for a build that
uses them. One more scenario builds a `FROM scratch` image for linux/amd64 on the real daemon. A guard forwards only
that build and its inspections and refuses everything else. The acceptance then removes the image and checks the
daemon's image events for pulls. It skips that scenario unless the default builder uses the docker driver and supports
linux/amd64 natively. It contacts no AWS service or registry.

## Layer uploads with a local bucket

`pnpm --filter @stacktape/cli run test:layer-upload` runs three deployments of the split project through the deploy
command's own packaging and upload code into one local bucket. The shared layer is 12 MiB, and a native-dependency layer
changes alone. A deployment must zip and upload only the layers its bucket does not hold yet. Each ZIP must extract with
`unzip` to exactly its layer, and the bucket must store exactly that ZIP. Every layer key the template uses must stay
protected from retention. It needs `unzip`, not Docker or AWS.

## Fresh installs

`pnpm --filter @stacktape/cli run test:fresh-install` runs the first `package` of a fresh npm checkout with the compiled
release CLI. The CLI installs dependencies and bundles in one process, and Bun caches the project directory's entries
when that process starts; the acceptance fails if the bundler cannot see the `node_modules` the install just created.
The CLI and a one-package registry run in the Lambda Node.js image with no network but loopback, no Docker, no
capabilities and a read-only root filesystem. The project has only a lockfile and no `node_modules` anywhere above it.
The first run must install and build; its ZIP, extracted with `unzip`, must return the dependency's value in the Lambda
runtime. The repeat must skip the install and produce the same files. `report.json` records the executable, each run's
install decision, ZIP checksums and file list, and every registry request. It needs Linux, Docker and `unzip`, not AWS.
`--install` tests an already built release install instead.

## External tools

`pnpm --filter @stacktape/cli run test:external-tools` resolves railpack and the Session Manager plugin as a customer's
first command does: each resolution runs in its own process through the CLI's resolver. A loopback stand-in serves a
tar.gz, a zip bundle and a `.deb` around synthetic executables under a test manifest, and a proxy on a closed port
refuses every other request. Cold first use must download, verify, extract and run the executable. Warm use must make no
request. A preseeded railpack must serve `runRailpackPrepare` and the init planner's `planStartCommand` without any
request; the synthetic executable answers `railpack prepare` by writing `plan.json` and `info.json` to its `--plan-out`
and `--info-out` paths, and a build variable must reach it through the environment, never the command line. A checksum
mismatch must leave no executable, and a refused download must name the URL, the checksum and the path to place the file
offline. A process killed mid-download must leave nothing usable before the retry succeeds, and two concurrent first
uses must download once. It needs Linux or macOS, not Docker, AWS or the internet. The real upstream assets are checked
by `scripts/pin-external-tools.ts` whenever a version changes, and by the release artifact check, which downloads each
one on first use.

## Packaging performance

For packaging performance, `pnpm --filter @stacktape/cli run perf:packaging` measures the Node Lambda packaging
entrypoints offline on deterministic 1–50 function fixtures: cold, unchanged, handler, shared-module, manifest and asset
states, each sample in a fresh process. It reports phase timings, artifact sizes and which digests each edit changes in
an ignored `.stacktape/packaging-perf/` directory. It is not CLI wall time, never installs dependencies (the fixtures
vendor theirs) and never contacts AWS. `--docker` adds a container shape that builds with the local daemon and pulls
public base images. `pnpm --filter @stacktape/cli run analyze:bundle` attributes the release executable's JavaScript to
modules and dynamic import boundaries; `--verify-compile` also builds the host executable and reports its exact size and
SHA-256. A given `--out` must be new or empty; both tools refuse existing content rather than overwrite it. Both record
the Git source before and after measuring and fail when it changed or could not be read. Run measurements one at a time,
with no other build or test running and no edits to the measured source.

## MiniStack S3 pilot

The opt-in `pnpm --filter @stacktape/cli run test:layer-upload:ministack` lane exercises the CLI's real S3 SDK path. It
needs Docker and runs a pinned [MiniStack](https://ministack.org/) image in a disposable container on a loopback port.
The runner creates isolated buckets with dummy credentials, rejects a non-local endpoint, and blocks all other AWS
requests from the deploy worker. It compares stored layer and function ZIP bytes with the generated ZIPs, checks changed
and unchanged layer uploads, and verifies that an unchanged deployment uploads only its new template files. An A/B/A
function edit then exercises real retention deletion: the reused A object must survive while an obsolete template is
removed. A missing local bucket makes a layer SDK upload fail without a success result. The runner removes the container
in `finally`, verifies its removal, and writes a source-bound `report.json` and worker logs under ignored
`apps/cli/.stacktape/` output. Pass `--out <empty-directory>` to keep the evidence elsewhere. This lane is not part of
the default gate because it needs Docker; a missing Docker daemon fails the opt-in command.

Use an emulator only for the services and operations a test actually exercises. Run the current application code through
normal AWS clients, point them at an owned local endpoint, assert service state or a durable application result, and
record the emulator version with the source revision. Keep credentials synthetic and fail closed against live AWS. Check
the emulator's supported behavior before accepting a passing test as evidence. MiniStack's
[known limitations](https://ministack.org/docs/limitations) include no SigV4 signature validation, metadata-only EC2 and
CloudFront resources, and no CloudFormation stack policy enforcement. Keep the existing disposable-AWS acceptance for
behavior owned by those services. An emulator test should replace a handwritten fixture only when it preserves or
improves the assertion; it is not an extra test to add to every feature.
