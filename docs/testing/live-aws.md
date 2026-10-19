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
rejecting oversized grace before an ECS update remains Phase 3. Configured application checks, ECS readiness and
capacity admission remain later phases.

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

### Readiness and capacity qualification (phase 3)

The owned runner's `--phase3` argument keeps the private-ECR Cloud Map drain container and adds the essential
`/stacktape-supervisor readiness` ECS command through the benchmark build plugin. Ordinary builds remain unchanged. The
command queries a live Unix socket; the supervisor checks the current generation through its proxy every five seconds.
Admission, bootstrap, stale checks, process failure and task stop cannot pass readiness. Configured application checks
remain a later qualification scope.

```sh
pnpm --filter @stacktape/cli exec bun scripts/code-swap/capacity/qualify.ts
STP_CODE_SWAP_BENCH_LIVE=1 pnpm --filter @stacktape/cli exec bun scripts/code-swap/run.ts --regression --phase3 --configurations 1024-1
```

The first command uses MiniStack DynamoDB transactions and a synthetic ECS membership server. It tests 501 concurrent
requests, duplicate grants, confirmed-STOPPED reclamation and stale workers; it does not establish AWS IAM or startup
latency. The live runner deploys the separate 256 MiB capacity Lambda, reserved concurrency two, filtered stream,
STOPPED-only rule and alarms through the Stacktape CLI. Its controller initializes the capacity plan after task-role
creation. This unsigned benchmark bootstrap is not final protected CFN lifecycle adoption; phase 4 owns that boundary.
Preserve the generated template, lifecycle samples and every failed run.

The application grace and ECS timeout are separate: `W=G`, `D=max(30,W)`, `T=max(60,D+G+2)`, and `T<=120`. The 35-second
drain sidecar has its own 40-second ECS timeout and stops before the supervisor; the supervisor then serves cached
routes for D and signals application trees concurrently for G. Thus the ordered stop can exceed the supervisor's T (at
most `40+T`); the Fargate 120-second limit applies to each container timeout. Measure both the ordinary 35-second hold
and supervisor shutdown when qualifying task stops. The fixed drain container reserves 16 MiB from the supervisor's task
memory budget; arbitrary additional sidecars remain unsupported.

Lifetime ptrace imposes fork/signal latency and prevents external debugger attachment. The narrowed runtime traces only
candidates through preparation and overlap, then detaches after old-tree reaping and OOM-score restoration. Baseline and
committed bootstrap use ordinary process waits. Denied ptrace refuses candidate execution and leaves the checked image
baseline serving for image repair. Worker SIGKILL attribution is available during candidate overlap; idle descendant
discovery uses process-group/parent membership and start identities. Qualification must cover its late-fork/leader-exit
limits before customer enablement. A leader that keeps answering while its workers exit without SIGKILL remains an
explicit deferred B3 clause; an authored check that reaches those workers is the eventual remedy.

For a local diagnostic of tracer overhead alone, run `STP_MEASURE_TRACE=1 go test -run '^TestTraceOverhead$' -v` in the
pinned Go builder against the supervisor sources. It compares direct, lifetime-traced and detached HTTP fixtures with
fork and signal work, with 100 warmups and 500 measured requests per round. Keep all three paired rounds, p50/p99 and
throughput. This diagnostic excludes the proxy, AWS and application OOM-score setup; it cannot substitute for live
end-to-end overhead measurements. The seccomp-denial test and `go test -race` are part of the built supervisor lane.

Before publication, the existing code-swap action in the private v4 readiness guide still requires the pinned artifact,
readiness/stop/admission template, final writer policies and runner permissions to ship together. Complete that action
only after the release binary and selected runner pass the initial opt-in, swap and image-repair acceptance checks. No
benchmark PR authorizes publication or customer activation.

`--lifecycle-only --phase3 --configurations 1024-1` seeds one committed overlay, then exercises scale-out, a 60-second
bootstrap delay during a healthy-old rollout, replacement after CLI exit, a 60-second allocator outage with serving
survivors, and recovery from an unhealthy fleet. This is a lifecycle fixture, not a repeat of the 20-edit speed gate.
The separate `observe-discovery.ts <run-directory>` companion records actual Cloud Map `HEALTHY` versus
`HEALTHY_OR_ELSE_ALL` results and public responses; keep its host-monotonic samples with the run.

`--image-penalty-only --phase3 --configurations 1024-1` runs one unchecked/checked image pair with the same application,
admission and drain. Its image-only control may remove ECS readiness; a swap cannot use that control. The report fits
AWS clocks separately and labels its single-pair scope. It does not establish a p95 or replace the Phase-1 matched image
distributions. The runner records failure frames before cleanup, which can wait for ECS's delayed revision removal.
`GetTemplate` output can be YAML even when the submitted source was JSON.

The [Ireland cost model](../../apps/cli/scripts/code-swap/cost.ts) includes strong 4-KiB reads, status/transaction
writes, retained bundles, allocator calls/duration, signing, alarms and bounded supervisor logs without free-tier
credits. Its rates were checked against the regional AWS Price List offers for
[DynamoDB](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonDynamoDB/current/eu-west-1/index.json),
[Lambda](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSLambda/current/eu-west-1/index.json),
[S3](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/eu-west-1/index.json),
[KMS](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/awskms/current/eu-west-1/index.json) and
[CloudWatch](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonCloudWatch/current/eu-west-1/index.json).
Archive those offers with each live qualification. Archive measured request counts, retry/churn bursts and duration
alongside the model before treating it as a release-budget pass. The startup envelope includes the owned burst observers
and retries; latency and recovery gates remain independent.

`--capacity-only --regression --phase3 --configurations 512-1` declares a 450-slot budget, runs the short speed gate,
then starts 100 additional actual ECS tasks. It records request-to-grant p95/max before attempting the independent
500/501 counter boundary; either failed latency gate leaves the run a no-go. The boundary deliberately changes the owned
service desired count beyond its declared scaling maximum; this is a hard-cap fault fixture, not a supported scaling
configuration. The runner checks the account's Fargate quota without changing it, persists every attempted desired count
and task identity, and scales to zero in `finally`. `--capacity-admission-only` replaces the 20 edits with one seed
overlay for an allocator-only rerun. Preserve failed SLA runs, including their throttle counts, rather than pooling them
with successful repetitions.

Use `observe-capacity.ts <run-directory>` during the run to retain exact-function request/duration logs and table API
counts before cleanup removes the log group. Request-to-grant measurements use task/Lambda timestamps from AWS, not the
WSL clock. Common admissions probe conditional slots directly; full fixed-key reads and confirmed-STOPPED reconciliation
run under pressure. The stream collects up to 20 records for one second and processes one batch per shard against the
fixed two-execution reservation. Within an invocation, ECS membership lookups batch actual identities by service; no
observation comes from event contents or persists across invocations. Transaction conflicts are retryable failures, not
evidence that another owner already reclaimed a slot. The local fixture injects that conflict and verifies it cannot
silently acknowledge a STOPPED release. `cleanup-audit.ts <run-directory>` checks saved capacity resources and every
revision status, including `DELETE_IN_PROGRESS`; an accepted ECS deletion is not verified absence.

The lifecycle fixture also replaces a healthy-old rollout with an owned missing bundle key, verifies the new bootstrap
stops, restores the committed record and waits for ECS recovery. Its outage stage stops one of two serving tasks while
the allocator is disabled, queues an owned poison record, restores service after 60 AWS seconds, and requires a routed
replacement within 180 AWS seconds. Retain the capacity log companion to separately check the 30-second post-restore
grant limit; the 180-second routing assertion alone does not prove it. Neither case performs a manual replacement to
hide scheduler backoff.

`--capacity-hundred-only --capacity-only --regression --phase3 --configurations 1024-1` runs the full 20-edit speed
regression and the 100-start allocator gate without repeating the separate 501-task drift fixture. Preserve both runs;
the smaller rerun alone cannot establish the live hard-counter boundary. Failed speed medians and admission tails remain
in the evidence even if a later scoped repeat passes.

`--speed-only --regression --phase3 --configurations 1024-1` runs the isolated 20-edit regression without repeating
lifecycle or admission pressure. Fleet preflights read the protected plan alongside ECS discovery, then task details
alongside exact own grants. Prepare, commit and completion each repeat those validations. Status polling reuses only the
checked RoleId for key addressing; it still strongly reads every task status and cannot cache a health/grant result.
