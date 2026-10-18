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
normal dev/release builds do not contain its unsigned, unfenced activation path. There is no public configuration or
installed CLI switch. This is a speed decision before runtime, ECS-readiness, capacity and protected-lifecycle work.

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

The runner prints an exact recovery command and cleans up in `finally`. Keep its state until deletion is verified. Run
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
qualification retries transient public errors within its existing two-minute deadline and records every request in
`setup-traffic.json`. It still requires a response from every expected task before timed edits start. The existing
ten-second baseline precedes the initial business checks. Those checks and every post-edit business check keep their
exact assertions without retries; their responses are drained and saved separately, including bounded failure bodies, so
a gateway error cannot appear only as “Wrong receipt”. Baseline waiting is outside every timed edit.

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
