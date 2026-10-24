# Real AWS canaries

These runners test behavior that local and emulator tests cannot prove. They create billable resources and are never
part of `pnpm check` or a normal release.

The project qualification runner selects these canaries as explicit deployment archetypes. See
[`../../../../docs/project-qualification.md`](../../../../docs/project-qualification.md) for the package-broadly,
deploy-selectively strategy and commands.

## Guardrails

The runners support Windows, Linux, and macOS. Every runner refuses implicit credentials, AWS endpoint overrides, unsafe
project names, and an account-id mismatch.

Before starting:

1. Use STS to confirm the exact account and region.
2. Confirm that the account is disposable. A production account named “dev” is not disposable.
3. Choose a unique project name and owner for this run.
4. List existing stacks and confirm the name is unused.
5. Keep the state file if the process is interrupted; it is the recovery identity.

Never weaken these checks to make a canary run on a convenient machine or account.

## Packaging canary

This deploys the Lambda fixture in `_test-stacks/packaging-smoke` (two functions sharing a layer, one packaged on its
own), invokes it, proves an exact redeploy is a no-op, changes one environment value without changing code/layer
identity, and deletes the stack and owned log groups. It also checks that no deployed function or layer ZIP carries a
`.map`, that the deployment bucket holds their map bundles without source code, and that a deliberate error (`?fail=1`),
logged by the real Lambda runtime from the layer and from a bundle, maps through those bundles to its source line, in an
execution environment that started after the function's `LastModified`. When the organization has several connected
accounts, set `STP_AWS_CANARY_AWS_ACCOUNT` to the connection name of the expected account.

```sh
export STACKTAPE_API_KEY='<development API key>'
export STP_AWS_CANARY_DEPLOY=1
export STP_AWS_CANARY_CONFIRM_DISPOSABLE=this-is-a-disposable-test-account
export STP_AWS_CANARY_EXPECTED_ACCOUNT_ID='<12-digit account id>'
export STP_AWS_CANARY_CREDENTIAL_MODE=profile
export STP_AWS_CANARY_PROFILE='<profile>'
export STP_AWS_CANARY_PROJECT_NAME="v4canary-$(date -u +%s)"
export STP_AWS_CANARY_OWNER="local-$(date -u +%s)"
pnpm --filter @stacktape/cli run test:real-aws-canary
```

## Alias publication canary

This deploys `_test-stacks/alias-publication` (one Node.js function behind a CodeDeploy alias) through the source CLI
(`pnpm dev:cli`, which reads `STACKTAPE_API_KEY` from `apps/cli/.env.local` in dev mode). It changes only the function's
environment value and requires the alias to serve it from a newly published version. It then deploys a change
CloudFormation rejects while creating it (the fixture adds an impossible queue when `STP_AWS_ALIAS_CANARY_BREAK=1`),
requires the CLI to report the failure and the stack to roll back with the alias, versions and template untouched,
redeploys unchanged from that state and requires no new version, deletes the stack, and verifies that the stack, its
deployment bucket, functions and log groups are gone. Its account preflight takes the expected account from the
environment and refuses any other account; it has no disposable-account confirmation, so run it only where the owner has
authorized a unique disposable stack. The CLI deploys through the single active Stacktape connection to that account,
found with `info:whoami`: an organization with several connections needs `--awsAccount`, and a privileged connection
gives the CLI Stacktape-issued credentials instead of the profile's.

```sh
export STP_AWS_ALIAS_CANARY_DEPLOY=1
export STP_AWS_ALIAS_CANARY_EXPECTED_ACCOUNT_ID='<12-digit account id>'
export STP_AWS_ALIAS_CANARY_PROFILE='<profile>'
export STP_AWS_ALIAS_CANARY_OWNER="local-alias-$(date -u +%s)"
export STP_AWS_ALIAS_CANARY_STATE_FILE="$(pwd)/.stacktape-alias-canary-${STP_AWS_ALIAS_CANARY_OWNER}.json"
pnpm test:aws --aws-scenario=lambda-alias-configuration-update
```

The project name defaults to a new `v4aliascanary-` name and the region to `eu-west-1`. If cleanup does not finish, the
canary prints one exact `--cleanup-only` command for the same run.

## NAT instance canaries

Two runners for `stackConfig.nat` on `_test-stacks/nat-instance` (one VPC function that returns the public IP its
request left through, so every call names the zone that served it). Both use the alias canary's guardrails and
environment contract with the `STP_AWS_NAT_CANARY_` prefix, and both delete the stack and verify with AWS that the
stack, NAT interfaces, Elastic IPs, instances, heartbeat parameters, function and log groups are gone.

- `test:real-aws-nat-canary` (scenario `nat-instance-failover`): deploys `ha-ec2`, terminates one instance while
  invoking every two seconds and measures the reroute, the replacement and the failed-call window, then runs a rolling
  replacement (a new `instanceSize`) and an unchanged redeploy.
- `test:real-aws-nat-switch-canary` (scenario `nat-kind-switch`): deploys `gateway`, switches to `ha-ec2` (the VPC,
  subnets and route tables must survive, the gateways must be gone), breaks forwarding on one instance so the heartbeat
  and probe path has to recover, then switches to `ec2`.

```sh
export STP_AWS_NAT_CANARY_DEPLOY=1
export STP_AWS_NAT_CANARY_EXPECTED_ACCOUNT_ID='<12-digit account id>'
export STP_AWS_NAT_CANARY_PROFILE='<profile>'
export STP_AWS_NAT_CANARY_OWNER="local-nat-$(date -u +%s)"
export STP_AWS_NAT_CANARY_STATE_FILE="$(pwd)/.stacktape-nat-canary-${STP_AWS_NAT_CANARY_OWNER}.json"
export STP_AWS_NAT_CANARY_REPORT="$(pwd)/.stacktape-nat-canary-${STP_AWS_NAT_CANARY_OWNER}.report.json"
pnpm test:aws --aws-scenario=nat-instance-failover
```

Each run takes 25 to 35 minutes and two `t4g.nano` or `t4g.micro` instances (plus two NAT gateways for the first few
minutes of the switch scenario). The report records every measured window. A NAT instance that fails to boot tags itself
with `stacktape:nat-failure` and the reason; the report's cleanup section lists those tags. Set
`STP_AWS_ALIAS_CANARY_TERMINAL_FIRST_DEPLOY=1` to run the first deploy in a terminal (`script`) from this repository's
GitHub checkout. That deploy creates the stack, so it must offer CI/CD setup ("Set up automatic deployments on push to
..."). The canary presses Ctrl+C at the offer without answering it and continues as usual.

## Container fast-deploy canary

`test:real-aws-container-canary` (scenario `container-fast-deploy-serving`) deploys
`_test-stacks/container-fast-deploy`: a small Node.js web service behind an application load balancer and the same
service behind an HTTP API Gateway with a container health check. Each measurement changes only the release string in
the server source and deploys again, which takes the fast path (RegisterTaskDefinition and UpdateService). While the
deploy runs, the canary polls ECS, the target group, Cloud Map and both public URLs, and it writes one timeline per
service to the report: image build and push, task definition registration, UpdateService, task creation, image pull and
container start (from the task timestamps), target and Cloud Map health, when Cloud Map's `DiscoverInstances` returns
the new task as API Gateway calls it, the first response with the new release, when the CLI reported the service
updated, and when the old tasks drained and stopped. A measurement fails when the CLI reported a service updated more
than a second before it served the new release, or when any probe failed.

It uses the alias canary's guardrails and environment contract with the `STP_AWS_CONTAINER_CANARY_` prefix, and cleanup
verifies that the stack, deployment bucket, image repository and log groups are gone. `--keep` leaves the stack in place
after the measurements and prints the cleanup command; `--reuse` measures again on that stack, for example with another
CLI revision checked out. `STP_AWS_CONTAINER_CANARY_MEASUREMENTS` (default 2) and `STP_AWS_CONTAINER_CANARY_LABEL` name
the measurements in the report. A run with two measurements takes about 20 minutes; the load balancer and two 0.25 vCPU
Fargate tasks are the main cost.

```sh
export STP_AWS_CONTAINER_CANARY_DEPLOY=1
export STP_AWS_CONTAINER_CANARY_EXPECTED_ACCOUNT_ID='<12-digit account id>'
export STP_AWS_CONTAINER_CANARY_PROFILE='<profile>'
export STP_AWS_CONTAINER_CANARY_OWNER="local-ctr-$(date -u +%s)"
export STP_AWS_CONTAINER_CANARY_STATE_FILE="$(pwd)/.stacktape-container-canary-${STP_AWS_CONTAINER_CANARY_OWNER}.json"
export STP_AWS_CONTAINER_CANARY_REPORT="$(pwd)/.stacktape-container-canary-${STP_AWS_CONTAINER_CANARY_OWNER}.report.json"
pnpm test:aws --aws-scenario=container-fast-deploy-serving
```

## Dev-mode canary

This runs the `stacktape dev` loop on `_test-stacks/dev-mode` (a container API, local PostgreSQL and Redis containers,
and a hosting-bucket dev server with a detached watcher) through the source CLI. The first session deploys the dev
stack; the others reuse it. The sessions cover agent mode with an edit and `POST /rebuild/api`, `dev:stop --agentPort`,
terminal sessions (PTY) ended by Ctrl+C and by SIGTERM, `--watch`, occupied default ports with SIGTERM to the agent, a
workload that crashes on start, and an unknown `--resources` name. After every session no process, container or port it
started may remain; a Docker command that fails counts as a failure, not as "no containers". Linux only; Docker must be
running. Like the alias canary it reads the API key from `apps/cli/.env.local` and uses the single active Stacktape
connection to the expected account. Run it in a disposable test account, such as the `stacktape-e2e` profile. A run
takes about 10 minutes, most of it the dev-stack deploy.

```sh
export STP_AWS_DEV_CANARY_DEPLOY=1
export STP_AWS_DEV_CANARY_EXPECTED_ACCOUNT_ID='<12-digit account id>'
export STP_AWS_DEV_CANARY_PROFILE='<profile>'
export STP_AWS_DEV_CANARY_OWNER="local-dev-$(date -u +%s)"
export STP_AWS_DEV_CANARY_STATE_FILE="$(pwd)/.stacktape-dev-canary-${STP_AWS_DEV_CANARY_OWNER}.json"
pnpm test:aws --aws-scenario=dev-mode-local-loop
```

`STP_AWS_DEV_CANARY_SCENARIOS` selects a comma-separated subset; `first-run-agent` must come first. If cleanup does not
finish, the canary prints one exact `--cleanup-only` command.

## HTTP API container continuity

The container canary also supports a minimal Node service behind an HTTP API → VPC link → Cloud Map, without a load
balancer, application health check, code-swap runtime or application shutdown sleep. It logs the AWS-side times at which
it listens and handles SIGTERM. It disables the HTTP server's idle keep-alive timeout to isolate retirement from backend
idle-socket races; the SIGTERM handler still closes the server immediately. With an authenticated source CLI, set the
container canary's guarded account/profile, owner and absolute state/report paths described in
`container-fast-deploy-canary.ts`, plus:

```sh
export STP_AWS_CONTAINER_CANARY_HTTP_API_ONLY=1
export STP_AWS_CONTAINER_CANARY_MEASUREMENTS=10
pnpm --filter @stacktape/cli run test:real-aws-container-canary
```

The runner warms the public connection before each measurement. Traffic continues until the old tasks have stopped and
the new release has answered alone for 15 seconds. The report's per-release evidence files retain each probe,
application clock samples, routing observations and ECS timestamps. Use application response times, CloudWatch
application/access logs and CloudTrail registration/deregistration events for cross-machine correlation; a laptop's
monotonic clock may drift. An HTTP 503 proves a server response, while a client timeout alone does not prove an AWS
failure. Keep the fixture's immediate SIGTERM close: an application sleep would hide a regression in the platform's
retirement delay. Cleanup and `--cleanup-only` follow the same owned-state contract as the other container canary mode.

## Scoped access canary

This deploys `_test-stacks/scoped-access`: one function behind an HTTP API, two DynamoDB tables, two buckets and a
queue. It proves what only real IAM and CloudFormation show:

- `connectTo` grants exactly its targets, and the unconnected table and bucket are denied;
- an update that moves `connectTo` to other targets revokes the removed ones and injects only the matching `STP_*`
  variables;
- a `$Secret()` reference serves the value pinned at deploy time, and the next deploy serves a rotated value;
- a route added by the update answers through the real API, and the default `*.stacktape-app.com` domain serves the
  function.

The canary creates its own tagged Secrets Manager secret, deletes the stack with the CLI and then verifies that the
stack, buckets, tables, queue, functions, roles, repository, API, log groups and secret are gone. The default domain
must stop resolving at its zone's authoritative name servers; a dangling record would point at a deleted API Gateway
domain that anyone could claim. The same account-preflight and connection rules as the alias canary apply. A run takes
about five minutes.

```sh
export STP_AWS_SCOPED_CANARY_DEPLOY=1
export STP_AWS_SCOPED_CANARY_EXPECTED_ACCOUNT_ID='<12-digit account id>'
export STP_AWS_SCOPED_CANARY_PROFILE='<profile>'
export STP_AWS_SCOPED_CANARY_OWNER="local-scoped-$(date -u +%s)"
export STP_AWS_SCOPED_CANARY_STATE_FILE="$(pwd)/.stacktape-scoped-canary-${STP_AWS_SCOPED_CANARY_OWNER}.json"
pnpm test:aws --aws-scenario=lambda-http-api-scoped-access
```

## Static site canary

This deploys `_test-stacks/static-site`: one hosting bucket behind CloudFront, with no build step. The canary writes the
fixture's ignored `site/` directory before each deploy. CloudFront must serve the first page and then a cached copy of
it. After a redeploy with new content, the first request must return the new page. The canary then deletes the stack and
verifies that the stack, distribution, buckets, functions, roles and default domain are gone. It also checks what custom
resources create outside the stack: the two Lambda@Edge functions in `us-east-1`, their roles, their log groups in every
regional edge-cache region, and the `us-east-1` edge deployment bucket. Anything the stack deletion left there fails the
run, after the canary removes it. A run takes about fifteen minutes.

AWS deletes a replicated Lambda@Edge function only after CloudFront has removed its replicas, usually 40 to 60 minutes
after the distribution's deletion, and the product deliberately leaves such a function behind. The canary treats it as
deferred cleanup: it records the function as `pendingEdgeFunctions` in the state file, reports the run as passed with
`cleanupPending` in the report, and prints the exact `--cleanup-only` command. Run that command later with the same
environment; it deletes the pending functions and verifies they are gone, and exits nonzero while AWS still refuses. A
leftover role, log group, bucket or stack resource still fails the run.

```sh
export STP_AWS_STATIC_CANARY_DEPLOY=1
export STP_AWS_STATIC_CANARY_EXPECTED_ACCOUNT_ID='<12-digit account id>'
export STP_AWS_STATIC_CANARY_PROFILE='<profile>'
export STP_AWS_STATIC_CANARY_OWNER="local-static-$(date -u +%s)"
export STP_AWS_STATIC_CANARY_STATE_FILE="$(pwd)/.stacktape-static-canary-${STP_AWS_STATIC_CANARY_OWNER}.json"
pnpm test:aws --aws-scenario=hosting-bucket-cdn-update
```

Both canaries share their guardrails through `source-cli-canary.ts`. Each prints one exact `--cleanup-only` command when
cleanup does not finish.

## Observability fixture (not yet qualified)

`_test-stacks/observability-smoke` is a candidate fixture, not a verified end-to-end runner. Its
[acceptance checklist](../../_test-stacks/observability-smoke/README.md) describes the signal, Console, and cleanup
boundaries that still need a real AWS qualification run. There is no `observability-signal-path` automated scenario. Do
not count a deployment, a matching span substring, or stack deletion alone as that proof.

## Init canary

This drives the browser-facing `stacktape init` API, writes and validates the generated config, deploys it, resolves the
composed resource URL, checks the live response, and removes the exact resources recorded for the run.

The wizard runs signed in the way `stacktape login` or the wizard's own sign-in leaves a machine: the API key is
persisted in a fresh HOME, and the wizard's environment has no `STACKTAPE_API_KEY`. Its target check, deploy and URL
lookup children must therefore find the credentials there. Before deploying, the canary edits the reviewed config and
requires the wizard to refuse the next create and check the target again.

```sh
export STACKTAPE_API_KEY='<development API key>'
export STP_AWS_CANARY_DEPLOY=1
export STP_AWS_CANARY_CONFIRM_DISPOSABLE=this-is-a-disposable-test-account
export STP_AWS_CANARY_EXPECTED_ACCOUNT_ID='<12-digit account id>'
export STP_AWS_CANARY_CREDENTIAL_MODE=profile
export STP_AWS_CANARY_PROFILE='<profile>'
export STP_INIT_CANARY_AWS_ACCOUNT='<connected disposable account name>'
export STP_AWS_CANARY_PROJECT_NAME="v4canary-init-$(date -u +%s)"
export STP_AWS_CANARY_OWNER="local-init-$(date -u +%s)"
export STP_AWS_CANARY_STATE_FILE="$(pwd)/.stacktape-init-canary-${STP_AWS_CANARY_PROJECT_NAME}.json"
export STP_INIT_CANARY_FIXTURE=express-basic
export STP_INIT_CANARY_CODING_AGENT=none
pnpm --filter @stacktape/cli run test:real-aws-init-canary
```

Fixtures are `express-basic`, `express-postgres-migration`, `vite-static`, and `fastapi-basic`. Set the coding agent to
`claude-code` or `codex` only when that mode is the subject of the test.

To test an immutable preview, set `STP_AWS_CANARY_CLI_PATH` to its absolute executable and
`STP_AWS_CANARY_EXPECTED_CLI_VERSION` to the exact version. The init process and deploy child then use the same binary.

If the run stops before cleanup, restore the same account, project, owner, fixture and state-file variables, then run:

```sh
pnpm --filter @stacktape/cli run test:real-aws-init-canary -- --cleanup-only
```

Cleanup verifies the recorded account, stack identity, owner and creation time before deleting anything. Investigate a
refusal; do not edit the state file to bypass it.

## AppSync endpoint canary

This synthesizes the authored Lambda/AppSync family through configuration validation, resource resolution and template
finalization, then deploys the resulting family with CloudFormation. The Lambda uses a small inline handler so the
assertion covers endpoint delivery and the generated service role. An unsigned request must receive 401; a signed
request with a variable must return the exact resolver result. Cleanup checks the recorded stack, API, Lambda, roles and
log groups, including exact owned log groups recreated by late service log delivery.

The profile is fixed to `stacktape-e2e` and the region to `eu-west-1`. Verify its account with STS before supplying the
expected ID. Choose a unique project, owner and absolute state path; keep that state for recovery.

```sh
export STP_ENDPOINT_CANARY_DEPLOY=1
export STP_ENDPOINT_CANARY_CONFIRM_DISPOSABLE=this-is-a-disposable-test-account
export STP_ENDPOINT_CANARY_EXPECTED_ACCOUNT_ID='<verified 12-digit account id>'
export STP_ENDPOINT_CANARY_PROJECT="v4endpoint-$(date -u +%s)"
export STP_ENDPOINT_CANARY_OWNER="local-endpoint-$(date -u +%s)"
export STP_ENDPOINT_CANARY_STATE_FILE="$(pwd)/.stacktape/endpoint-${STP_ENDPOINT_CANARY_PROJECT}.json"
mkdir -p .stacktape
pnpm --filter @stacktape/cli run test:real-aws-endpoint
```

If interrupted, use the same variables and run
`pnpm --filter @stacktape/cli run test:real-aws-endpoint -- --cleanup-only`. A refused account or existing-name
preflight grants no cleanup authority. A recovery state mismatch stops deletion.

## Deployed Lambda development canary

`test:real-aws-lambda-dev` runs the real `stacktape dev` (source CLI, API key from `apps/cli/.env.local`) against the
disposable `stacktape-e2e` account with an isolated dev network (`STACKTAPE_DEV_NETWORK_SUFFIX`). The first
`dev --agent` creates the dev network and the dev stack. Deployed arm64 and x86_64 functions must read an initial and an
edited row of local PostgreSQL through the dev box and ping local Redis; a VPC function must read the database and leave
for the internet through the box's public IP. A killed SSM plugin must recover on its own, a second stage must run at
the same time on its own SSM session, and `dev network` must name the session that runs each of the two stages. A copy
of the project in another directory stands for the same developer's second machine: its `dev --agent` of the running
stage must be refused before it deploys anything, `dev network delete` must be refused while the session runs, and
`--takeOver` must move the stage once (the relay's log on the box, read through SSM Run Command, must show one take-over
per relayed database). A warm function's pooled connection to the first machine must be closed by the take-over, and the
first session must stop itself and record a reason that names the second. `dev network` must show the stopped box, and
the next `dev --agent` must start the stopped box. A last session has its box stopped as soon as its SSM session opens;
it must start the box again and its tunnels must open. Cleanup deletes both stages and the network with the CLI and then
verifies with AWS that the stacks, box, its interfaces, leases, functions, log groups, SSM sessions and local containers
are gone. The run writes its timings (first start, wake, query latency, reconnect, recovery from a stop during startup,
deletion) to `STP_AWS_LAMBDA_DEV_REPORT`. It needs Linux and Docker and creates a Console project record named
`v4lambdadev-<id>`, which the CLI cannot delete.

```sh
export STP_AWS_LAMBDA_DEV_DEPLOY=1
export STP_AWS_LAMBDA_DEV_CONFIRM_DISPOSABLE=this-is-a-disposable-test-account
export STP_AWS_LAMBDA_DEV_PROFILE=stacktape-e2e
export STP_AWS_LAMBDA_DEV_EXPECTED_ACCOUNT_ID='<exact disposable account id>'
export STP_AWS_LAMBDA_DEV_OWNER='<unique lowercase run id>'
export STP_AWS_LAMBDA_DEV_STATE_FILE='<absolute fresh state file>'
export STP_AWS_LAMBDA_DEV_REPORT='<absolute report file>'
# Optional: the AWS region (default eu-west-1), so concurrent runs of different tasks do not share one.
export STP_AWS_LAMBDA_DEV_REGION=eu-west-1
# Optional: the dev network suffix (default: the run's id); the run refuses a name that is taken.
export STP_AWS_LAMBDA_DEV_NETWORK_SUFFIX='<lowercase letters or digits>'
pnpm --filter @stacktape/cli run test:real-aws-lambda-dev
```

An interrupted run prints its exact recovery command. Keep the same variables and run
`pnpm --filter @stacktape/cli run test:real-aws-lambda-dev -- --cleanup-only` before starting another run. This is an
explicit release lane; normal test commands cannot opt into it.
