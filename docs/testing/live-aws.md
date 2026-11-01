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

A CLI deploy with a Stacktape API key also creates a Console project for each unique project name. After its stages are
deleted, remove the project with `stacktape project delete <project> --yes`; the command refuses while a stage is still
deployed.

Some deletions finish only after AWS releases a resource on its own schedule; a Lambda@Edge function, for example, stays
for 40 to 60 minutes after its distribution while CloudFront removes the replicas. A scenario may report such a resource
as deferred cleanup instead of failing: it records it in the state file, passes, and prints the exact `--cleanup-only`
command, which deletes the resource once AWS allows it and verifies that it is gone. Anything else left behind still
fails the run.

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

## Code-swap qualification

The qualification harness lives in `apps/cli/scripts/code-swap`; runtime code is owned by
`apps/cli/src/domain/code-swap` and customers activate the feature with `web-service.properties.codeSwap`, off by
default in every stage. The harness's build plugin adds timing transport to the ordinary CLI; ordinary builds contain
neither the activation hooks nor these diagnostics, and no package is published from them. The registry's `code-swap-*`
lanes own these scripts; the offline `code-swap-build-boundary` and `code-swap-artifacts` lanes run per PR, the Docker
lanes run on change, and the live lanes run on a release candidate or when the runtime changes.

Every live runner accepts only account `597581086285`, region `eu-west-1`, profile and connected account
`stacktape-e2e`, and a new owned `v4swap-` project at stage `bench`. Each run keeps raw request samples, command logs
and exact cleanup state under its state directory, cleans up in `finally`, and prints its exact
`--cleanup-only --state <directory>` recovery command. Keep that state until deletion is verified: ECS can retain
recently referenced task-definition revisions for an hour, and an accepted deletion alone does not mark cleanup
verified. `cleanup-audit.ts <run-directory>` checks the saved resources and every revision status afterwards.

Build the benchmark CLI from the CLI working directory after `pnpm dev:cli version` has materialized the development
artifacts, then run the selected scenario with the explicit live flag:

```sh
pnpm --filter @stacktape/cli exec bun scripts/code-swap/build-cli.ts .stacktape/code-swap/cli
STP_CODE_SWAP_BENCH_LIVE=1 pnpm --filter @stacktape/cli exec bun scripts/code-swap/run.ts --regression --configurations 1024-1
```

`run.ts` selections, all combinable with `--configurations <memory-tasks,...>` (default `512-1,512-2,1024-1,1024-2`):

| Flags                                | What it qualifies                                                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| none                                 | The original four-configuration serving decision: 20 edits and 20 matched image controls per configuration under public traffic.    |
| `--regression`                       | 20 edits on one configuration against the fixed gate; it cannot replace the matched-image decision.                                 |
| `--customer-path`                    | A fresh stack through the public `codeSwap` property, two swaps under traffic, an environment-change image fallback, then deletion. |
| `--customer-path --retention-only`   | One code-only swap, a deploy with `codeSwap` removed, and an empty `code-swap/` prefix afterwards.                                  |
| `--phase3 --cap-lifecycle`           | Ten-task scale-out with committed bootstrap, missing bundle, replacement after CLI exit, all-unhealthy recovery and the cap reason. |
| `--phase3 --over-cap-only`           | Only the image deploy a service above the ten-task cap falls back to.                                                               |
| `--phase3 --lifecycle-only`          | The smaller two-task lifecycle variant.                                                                                             |
| `--phase3 --speed-only --regression` | Twenty edits on one unchanged task with every request failure retained.                                                             |
| `--phase3 --image-penalty-only`      | One unchecked/checked image pair measuring the readiness check's cost.                                                              |
| `--memory-fallback`                  | A working-set increase followed by an edit that must use exactly one image fallback.                                                |

The gate for every Node configuration is serving p50 ≤ 5 s, p95 ≤ 15 s, maximum ≤ 25 s, zero memory fallbacks and zero
swap request failures; the full decision also requires p50 and p95 at most half the matched image control. The runner
(after cleanup) and `analyze.ts <run-directory>` both exit nonzero on a miss. Analysis fits each edit against AWS proxy
timestamps rather than trusting the WSL wall clock, needs at least 100 low-RTT samples over three seconds per edit, and
retains every raw sample, failure and outlier; `timing-details.json` and `request-errors.json` carry the attribution.
`observe-discovery.ts <run-directory>` records Cloud Map filtering beside an owned live run. A miss stops later safety
work pending investigation and a new explicit go/no-go result.

The Node fixture is the `deploy-benchmarks/fixtures/containers/node` commerce API, copied from
`STP_CODE_SWAP_BENCH_FIXTURE` (default `/home/congy/projects/deploy-benchmarks/fixtures/containers/node`). For Python
and multi-service applications use `extension.ts` with `container-python`, `five-services` or
`container-node --benchmark-only`, setting `STP_CODE_SWAP_BENCH_FIXTURES_ROOT` when the deploy-benchmarks checkout is
elsewhere:

```sh
STP_CODE_SWAP_BENCH_LIVE=1 AWS_PROFILE=stacktape-e2e STACKTAPE_AWS_ACCOUNT=stacktape-e2e \
  pnpm --filter @stacktape/cli exec bun scripts/code-swap/extension.ts container-python --customer-path --state .stacktape/swap-python
```

Business probes use fresh job IDs and the fixture's public webhook signature; their assertions never retry, and
responses are drained and saved so a gateway error cannot hide behind a wrong-receipt message. Do not delete a run's
state while an ECS task-definition deletion is still pending.

### Runtime and artifact qualification

`qualify.ts` runs the built supervisor in capped, pinned Node images; `live-runtime.ts` deploys that image with the
Stacktape CLI and runs owned Fargate 1.4.0 amd64 tasks through the same application and controller fixtures;
`artifact-consumer.ts` installs the produced Node package and proves that each of the ten base inputs (manifest, lock,
authored config, supervisor hash, Dockerfile, runtime, Node version/target, minification and architecture) invalidates
the base. `smoke.ts` builds and runs the supervisor once in Docker.

```sh
pnpm --filter @stacktape/cli exec bun scripts/code-swap/qualify.ts
STP_CODE_SWAP_BENCH_LIVE=1 pnpm --filter @stacktape/cli exec bun scripts/code-swap/live-runtime.ts
pnpm --filter @stacktape/cli exec bun scripts/code-swap/artifact-consumer.ts
```

The runtime scenarios cover inherited OOM scores and their restoration, late and failing workers, leader and worker
crashes, detached-tree refusal, complete reaping, long HTTP, SSE and WebSocket drains and task `SIGTERM` during startup,
after switching and while old code shuts down. Clean and ordinary nonzero child exits are allowed; an unexplained child
`SIGKILL` fails the attempt. Each OOM scenario gets a fresh container or task because a kernel lifetime peak cannot be
reset. Docker needs `--oom-score-adj=-998` to reproduce Fargate's inherited score, and the supervisor refuses to start
where parent-child `ptrace` is denied. `QUAL_SCENARIOS` selects scenarios by name in both runners; `live-runtime.ts`
also takes `QUAL_MAIN_SCENARIO` for its service task. The pinned Go builder runs `go test -race` and the seccomp-denial
test before building the static supervisor; `STP_MEASURE_TRACE=1 go test -run '^TestTraceOverhead$' -v` is the
tracer-only diagnostic. This is a source-only amd64 qualification: other architectures and other runtime integrations
need their own, and an intentional candidate failure stays a failed swap even after local recovery.

Before the first publication exposing code swap, the CLI/release owner qualifies the extracted release and selected
runner on a disposable non-production stack through protected opt-in, an eligible swap, over-cap image fallback,
ordinary rollback and `--customer-path --retention-only --configurations 1024-1`. The private v4 launch checklist owns
that timing; these benchmark runs authorize no publication.
