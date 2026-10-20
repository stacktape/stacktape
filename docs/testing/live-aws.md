# Live AWS testing

Follow the [test-selection policy](../testing.md); use this procedure only when the assertion depends on AWS. For shared
Console dev work, also follow the [reservation procedure](console.md#shared-dev-reservation).

Agents may run development AWS operations without asking again: they may deploy unique disposable stacks, deploy
`console-app-dev`, refresh `console-app-devlocal`, and build test AMIs without asking for each run. This authorization
never includes production.

Every live scenario must enforce these rules in code:

1. Resolve the active AWS account and region before mutation and compare the account with an explicit expected ID.
2. Use a unique project/stage or resource name and ownership tags. Never discover cleanup targets from a broad prefix.
3. Write recovery state before or immediately after creating each resource.
4. Once resource creation has been attempted, clean up in `finally` after success and failure, then query AWS to verify
   that owned resources are gone. A rejected account, name, or ownership preflight must never authorize cleanup.
5. If cleanup is interrupted, preserve the state file and print one exact `--cleanup-only` command. Run cleanup before
   starting another scenario.
6. Keep credentials and parameter values out of commands, logs, reports, and Git.

Prefer low-cost Lambda, S3, DynamoDB, SQS, and log-group scenarios. Provision NAT gateways, load balancers, RDS,
OpenSearch, large EC2 instances, or long-running fleets only when that resource is the behavior under test. Keep them
for the shortest practical time and never leave an idle runner. AMI scenarios must deregister obsolete test images and
delete their owned snapshots after verification.

Run existing guarded scenarios through:

```sh
pnpm test:aws --aws-scenario=<name>
```

The required disposable-account confirmation, exact account ID, credential selection, unique name, state, and recovery
contract are documented in [`../../apps/cli/scripts/real-aws/README.md`](../../apps/cli/scripts/real-aws/README.md).

The packaging and init canaries require a genuinely disposable account. Permission to create uniquely owned test
resources in the shared Console hosting account does not make that account disposable. Use a separate test account or
first qualify an explicitly scoped shared-account runner; never bypass the canary's account acknowledgement.

Before changing a shared Console support stack, inspect its existing resources. Removing legacy data is a migration
decision, not routine cleanup. Existing dev authorization covers ordinary development operations; a newly discovered
destructive effect on unrelated shared data needs a concrete explanation and approval.

## Source CLI and local workload runtime

These two commands are easy to confuse:

- **Source-built CLI:** `pnpm dev:cli <command>` builds the current CLI source and then runs that command with
  `STP_DEV_MODE=true`. This automatically selects the dev Stacktape API and dev Cognito pool. The target deployment
  stage is still explicit, for example `--stage dev`.
- **Local workload runtime:** `pnpm dev:cli dev ...` invokes the Stacktape product's `dev` command. It starts selected
  workloads locally and may start emulators or use remote resources.

Never replace `pnpm dev:cli` with an installed `stacktape` binary when testing an unbuilt CLI change. Never infer the
deployment stage from source-CLI dev mode; spell out `--stage`, `--region`, `--projectName`, and the credential mode for
mutating commands.

## Source-only code-swap benchmark

The phase-1 experiment lives in `apps/cli/scripts/code-swap`. Its explicit build plugin produces a separate source CLI;
normal dev/release builds do not contain its unsigned, unfenced activation path. An active benchmark run omits the
separate Cloud Map drain sidecar because its supervisor owns the cached-routing allowance. Ordinary builds and inactive
benchmark commands retain main's sidecar behavior. This keeps the qualification single-container; it does not establish
compatibility with arbitrary sidecars. There is no public configuration or installed CLI switch. This is a speed
decision before runtime, ECS-readiness, capacity and protected-lifecycle work.

Build the source benchmark from the CLI working directory, after `pnpm dev:cli version` has materialized development
artifacts:

```sh
pnpm --filter @stacktape/cli exec bun scripts/code-swap/build-cli.ts .stacktape/code-swap/cli
STP_CODE_SWAP_BENCH_LIVE=1 pnpm --filter @stacktape/cli exec bun scripts/code-swap/run.ts
```

The runner accepts only account `597581086285`, region `eu-west-1`, profile/connected account `stacktape-e2e`, and a new
owned `v4swap-` project at stage `bench`. It copies the `deploy-benchmarks/fixtures/containers/node` commerce API from
`STP_CODE_SWAP_BENCH_FIXTURE` (default `/home/congy/projects/deploy-benchmarks/fixtures/containers/node`) into its
ignored run directory. A small entrypoint starts its exported app because the bundler resolves `import.meta.url` at
build time. The pinned Go builder requires Docker. No package is published.

Each 512/1024 MiB, one/two-task configuration receives 20 consecutive edits and 20 matched image controls under public
traffic. The real CLI discovers configuration, bundles, builds/pushes images, uploads S3 bundles, allocates releases and
records ordinary release history. The supervisor enforces the lifetime kernel-peak screen; image fallbacks remain in the
latency distribution. Preparation runs alongside image work, and activation waits for the pushed image. No voluntary
task reset occurs within a swap sequence. Readiness, signed authority and final IAM are deliberately outside this
experiment.

The runner prints an exact recovery command and cleans up in `finally`. Recovery accepts an artifact bucket already
removed by partial stack deletion. Keep its state until deletion is verified. Run
`pnpm --filter @stacktape/cli exec bun scripts/code-swap/analyze.ts <run-directory>` to write the summary. It fits each
edit against AWS proxy timestamps rather than assuming a constant WSL clock rate or the historical 9.6% drift. Each fit
needs at least 100 low-RTT samples over three seconds and a maximum residual of 250 ms; unqualified edits cannot pass.
After the timed command, the runner allows a 15-second clock qualification window. This does not extend the recorded
CLI-exit or first/all-task serving times. If qualification still fails, analysis retains and flags the edit. Retain
every raw sample, failure and outlier. Report first/all-task serving, old-process exit, CLI exit, fallback rate and
matched image times. Every Node configuration must have serving p50 ≤5 s, p95 ≤15 s, maximum ≤25 s, p50/p95 at most half
the image control, and zero memory fallbacks. A miss stops later safety phases pending investigation and a new explicit
go/no-go result.

Both the runner (after cleanup) and standalone analysis exit nonzero for a no-go result. Partial runs still retain their
recovery state and raw measurements for standalone analysis.

For timing investigations, each edit also writes a CLI monotonic trace, the ordinary `STP_TIMINGS_FILE` spans and a
shared-host-clock offset. Analysis relates those to the edit's qualified AWS clock fit; laptop wall timestamps are
metadata only. `timing-details.json` separates the serial image/commit path from overlapping download, startup and
health checks, and retains slow AWS attempts. Every request records its start, end, phase and gateway request ID when
available. Analysis writes every failure to `request-errors.json` and refuses a go result if a swap request fails,
including a request that began before proposal. Baseline, image settlement and command gaps remain separately labelled.
The runner exports gateway failures and supervisor events before deleting their log groups. Keep those files with the
raw polls; a client timeout alone does not establish that the supervisor dropped a request. Initial routing
qualification requires 30 uninterrupted AWS-clock seconds of successful responses from expected tasks within its
two-minute deadline, and records every request in `setup-traffic.json`. Errors or foreign task identities reset that
setup window. Every expected task must appear in that window before timed edits start. The existing ten-second baseline
precedes the initial business checks. Those checks and every post-edit business check keep their exact assertions
without retries; their responses are drained and saved separately, including bounded failure bodies, so a gateway error
cannot appear only as “Wrong receipt”. Baseline waiting is outside every timed edit.

The benchmark build minifies and splits commands into separate modules, so invoking deploy does not parse unrelated
commands. Both swap edits and image controls use that same build. Its transport experiment uses shared HTTP/HTTPS
keep-alive agents for service clients, profile role assumption and Console JSON requests. It retains the 30-second
whole-response deadline and caller cancellation. This measured transport is installed only by the benchmark build
plugin; the ordinary CLI retains its native fetch transport, including credential-provider calls. Do not promote the
experiment into ordinary builds without qualifying long-lived commands and their streaming operations.

Each `aws-http` trace row records the SDK invocation/attempt (including retries), socket assignment, DNS completion, TCP
connection, TLS handshake, response headers and drained-body completion. Marks are cumulative host-monotonic intervals,
not wall time. Reused sockets have no new DNS/TCP/TLS work. `timing-details.json` converts these through each edit's AWS
fit and keeps every transport attempt, including Console calls, without headers, paths, bodies or credentials. It labels
every swap above ten seconds as a tail. Response wait means request-sent to response-headers; it includes the network
and service wait and cannot by itself identify an AWS service bottleneck. Preserve raw marks alongside that attribution.

The benchmark image keeps its supervisor in a reusable layer ahead of the application layer. Each owned run has its own
local Docker tag, so independent configurations can run concurrently without overwriting another run's image. Normal
release/dev builds contain neither the activation hooks nor these diagnostics.

### Runtime and artifact qualification (phase 2)

The same source-only boundary also owns `scripts/code-swap/qualify.ts` and `live-runtime.ts`. The former runs the built
supervisor in capped, pinned Node images; the latter deploys that image with the Stacktape CLI and runs owned Fargate
1.4.0 amd64 tasks. Both use the same application and controller fixtures. The controller uses container monotonic time.
Each OOM/lifetime-peak scenario gets a fresh container/task because a read-only kernel lifetime peak cannot be reset.

```sh
pnpm --filter @stacktape/cli exec bun scripts/code-swap/qualify.ts
STP_CODE_SWAP_BENCH_LIVE=1 pnpm --filter @stacktape/cli exec bun scripts/code-swap/live-runtime.ts
pnpm --filter @stacktape/cli exec bun scripts/code-swap/artifact-consumer.ts
STP_CODE_SWAP_BENCH_LIVE=1 pnpm --filter @stacktape/cli exec bun scripts/code-swap/run.ts --regression --configurations 1024-1
```

The runtime cases cover inherited OOM scores and their restoration, late workers, actual prepare/post-switch worker
OOMs, leader/worker crashes, detached-tree refusal, complete reaping, long HTTP/SSE/WebSocket drains and task SIGTERM
during application startup, after switching and while shutting down old code. Clean and ordinary nonzero child exits are
allowed; child SIGKILL fails the attempt. A stopped grandchild is killed and reaped on startup failure. The combined
burst/cache/tmpfs scenario proves an aggregate peak increase; it does not isolate cache or tmpfs charging. The live stop
cases use ECS `StopTask`; the fixture forwards that signal and verifies child reaping before the essential container
exits. WebSockets receive close code 1001 at the drain deadline. Shutdown retains cached HTTP traffic for 30 seconds and
preserves the original old-tree deadline and concurrent grace. The test-only task-definition override supplies the exact
82-second ECS stop budget for a 40-second drain and grace. The local default-grace cases use a 60-second budget.
Production synthesis stays unchanged. The timeout formula is checked by fixture arithmetic with a hand-set override;
rejecting oversized grace before an ECS update remains Phase 3. Configured application checks, ECS readiness and the
service-cap check remain later phases.

Docker needs `--oom-score-adj=-998` to reproduce Fargate's inherited score. The supervisor verifies protection before
starting applications. Kernel exit observation uses parent-owned `PTRACE_SEIZE` before the launcher gate opens, with
inherited fork/clone/exit events, so a parent-reaped child SIGKILL is distinguishable from a clean exit. Job-control
stops use `PTRACE_LISTEN`. No capability is added; an environment denying parent-child tracing refuses startup. The
pinned builder runs `go test -race` before building the static supervisor. This remains a source-only amd64
qualification; other architectures and production runtime integration need their own qualification. Local targeted
debugging accepts `QUAL_SCENARIOS` with comma-separated scenario names. `review-fixes` covers clean/nonzero child exits,
a startup failure with a stopped grandchild, and a child SIGKILL. The live runner also accepts `QUAL_SCENARIOS` for
standalone tasks and `QUAL_MAIN_SCENARIO` for its service task; preserve those selections with the report. Preserve the
reports and source/artifact revision with the handoff. An intentional candidate failure remains a failed swap even after
local recovery; never count it as a successful traffic sample.

The live runner prints its exact `--cleanup-only --state <directory>` recovery command. Cleanup uses the exact owned
stack/family and task identities, stops standalone tasks, deregisters/deletes revisions one at a time (below ECS's
10-revision maximum), and waits for ACTIVE, INACTIVE and DELETE_IN_PROGRESS listings to become empty. ECS can retain
recently referenced revisions for an hour; an accepted deletion alone does not mark cleanup verified.

`--memory-fallback --configurations 512-1` runs a deliberate working-set increase followed by a code edit that must use
exactly one image fallback. Its report retains both attempts, the peak, fallback frequency and AWS-calibrated image
latency.

`--regression` runs only 20 swaps for the selected configuration. It retains per-edit AWS clock fits, all requests,
failures and fallbacks, and checks p50 ≤5 s, p95 ≤15 s, max ≤25 s, zero memory fallbacks and unchanged task identity.
Its report is labelled `phase-2-regression`; it cannot replace the four-configuration phase-1 decision or its
matched-image ratios. Without that argument the original phase-1 runner and gate are unchanged.

The benchmark HTTPS agent starts a second TCP connection after 100 ms if the first is still pending. It keeps the
original alive, selects one connected socket, and performs one normal verified TLS handshake before sending HTTP. The
unused socket closes without receiving HTTP headers or a body. Whole-response deadlines and caller cancellation cover
both dials and body collection. Traces retain both dial outcomes and the winner's DNS/TCP/TLS timing, including all
waiting time in end-to-end latency. The ordinary installed CLI transport is unchanged. Offline tests cover a delayed TCP
completion, stalled TLS, body/header deadlines, cancellation, certificate verification and one dispatched POST. The
benchmark build also removes credential identifiers from identity-lookup errors.

The installed-package consumer uses the CLI's `benchmarkBaseInputs` function and the same ten inputs: manifest, lock,
authored config (including environment), supervisor hash, Dockerfile, runtime, Node version/target, minification and
architecture. It proves changes to each invalidate the base. `.npmrc`, patches absent from the lockfile and Railpack
plans are not benchmark inputs; their wiring remains later work. Committed-code restart/scale-out, exact-image rollback
and same-revision scale-only overlay retention remain Phase 3/5 clauses of B8.

`socketMs` always means the request's socket-assignment event. Hedged connections additionally record `dialStartMs`, the
winning dial's start offset; DNS/TCP/TLS marks include that offset. Queued requests carry their own cancellation signal
through request options. The measured speed margin depends on the 100 ms backup dial; it is not supervisor-only speed or
a repeat of the matched-image Phase-1 gate.

The immutable bundle upload overlaps the fleet preflight. Both operations finish successfully before prepare is
published, including on failure paths. Neither changes the image-upload gate before commit. Trace spans retain the
actual overlapping upload interval and the time when both prerequisites finished.

### Readiness and service-cap qualification (phase 3)

The source-only `--phase3` runner retains the private-ECR Cloud Map drain container and adds an essential
`/stacktape-supervisor readiness` ECS command. Ordinary builds remain unchanged. The command queries a live Unix socket;
the supervisor checks its committed generation through the proxy every five seconds. Pending/failed bootstrap, stale
checks, process failure and task stop cannot pass readiness. Configured application checks remain a later scope.

Before opt-in and every deploy, the benchmark checks the declared autoscaling maximum and effective deployment surge:
`floor(maximum * maximumPercent / 100) <= 10`. Unknown bounds and larger services use images with a one-line CLI reason.
ECS rounds this limit down
([deployment configuration](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DeploymentConfiguration.html)).
The static stack budget sums surge plus one draining generation across opted-in services and must stay at most 500. The
owned harness has exactly one service. It has no coordinator, stream, admission grants, slots or STOPPED handler.

```sh
STP_CODE_SWAP_BENCH_LIVE=1 pnpm --filter @stacktape/cli exec bun scripts/code-swap/run.ts --cap-lifecycle --phase3 --configurations 1024-1
STP_CODE_SWAP_BENCH_LIVE=1 pnpm --filter @stacktape/cli exec bun scripts/code-swap/run.ts --over-cap-only --phase3 --configurations 1024-1
STP_CODE_SWAP_BENCH_LIVE=1 pnpm --filter @stacktape/cli exec bun scripts/code-swap/run.ts --speed-only --regression --phase3 --configurations 1024-1
```

The cap fixture seeds a committed overlay, then scales to ten tasks with maximumPercent 100 and
minimumHealthyPercent 90. It tests delayed committed bootstrap, a missing bundle, replacement after CLI exit and
all-unhealthy recovery. It then raises the maximum to eleven and verifies a real CLI image deploy with the cap reason.
`--over-cap-only` exercises that image transition without repeating the ten-task scale-out. The application entrypoint
defaults PORT to 8080 so the ordinary image also runs without the supervisor. Preserve the synthesized template,
lifecycle samples, fallback output and every failed run. `--lifecycle-only` runs the smaller two-task variant.
`observe-discovery.ts <run-directory>` records actual Cloud Map filtering and public responses alongside a live run. The
speed command runs twenty edits on one unchanged task, retains every request failure and fits AWS-side timestamps. It
must meet p50 <=5 s, p95 <=15 s, max <=25 s and zero swap request failures.

The application grace and ECS timeout remain separate: `W=G`, `D=max(30,W)`, `T=max(60,D+G+2)`, `T<=120`. The 35-second
drain sidecar has its own 40-second ECS timeout and stops before the supervisor. The supervisor then serves cached
routes for D and signals application trees concurrently for G. Ordered stop can reach `40+T`; the 120-second Fargate
limit is per container. The fixed helper reserves 16 MiB; arbitrary extra sidecars remain unsupported.

The narrowed runtime traces candidates only during prepare/overlap, then detaches after old-tree reaping and OOM-score
restoration. Baseline and committed bootstrap use ordinary waits. Denied ptrace refuses a candidate and leaves the
checked image serving for image repair. Idle process census cannot attribute SIGKILL already reaped by the application.
`go test -race` and the seccomp-denial test run in the pinned Go builder. For a tracer-only diagnostic use
`STP_MEASURE_TRACE=1 go test -run '^TestTraceOverhead$' -v`; retain all paired rounds. This excludes proxy/AWS costs.

`--image-penalty-only --phase3 --configurations 1024-1` runs one unchecked/checked image pair with the same app and
drain. Only its image control can remove ECS readiness. Separate AWS clock fits label the single-pair scope; this does
not replace the matched image distributions. `cleanup-audit.ts <run-directory>` checks exact saved resources and every
ECS revision status, including DELETE_IN_PROGRESS. Legacy coordinator-resource checks exist solely to recover old runs.

The [Ireland cost model](../../apps/cli/scripts/code-swap/cost.ts) reuses the archived 19 October regional rates and
includes strong 4-KiB polling, bounded bootstrap and CLI status reads, status writes, signing, S3 requests/retention and
bounded logs. There are no coordinator invocations, streams, grants or alarms. At 730 hours, 100 edits/day, 100
starts/task-month, 20-MiB bundles and 30 retained releases/service, the model estimates $1.87/month for one task, $7.44
for ten and $316.66 for 500 pollers across 25 services. Account cost is the sum of stack budgets; no account-wide
runtime registry is introduced for small dev/staging fleets. Administrator drift and external overlapping rollouts are
outside this static bound. Measure actual request/retry counts before treating the model as a customer cost
qualification.

Before the first publication exposing code swap, ship the pinned supervisor/SBOM, cap/readiness/stop template, protected
record policies and runner permissions together. The existing private v4 launch action owns publication timing. Complete
only when the extracted release and selected runner pass protected opt-in, eligible swap, over-cap image fallback and
ordinary rollback on a disposable non-production stack. These benchmark PRs authorize no publication.
