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

This deploys the two-Lambda fixture in `_test-stacks/packaging-smoke`, invokes it, proves an exact redeploy is a no-op,
changes one environment value without changing code/layer identity, and deletes the stack and owned log groups.

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
container start (from the task timestamps), target and Cloud Map health, the first response with the new release, when
the CLI reported the service updated, and when the old tasks drained and stopped. A measurement fails when the CLI
reported a service updated more than a second before it served the new release, or when any probe failed.

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

`test:real-aws-lambda-dev` seeds a tagged Lambda and IAM role in the disposable `stacktape-e2e` account, then drives the
production dev tunnel, environment manager and Lambda log printer against local PostgreSQL. The deployed function must
read the initial row and an edited row through the relay. Dev cleanup must restore its original environment and close
the tunnel. Final cleanup verifies deletion of the function, role, exact log group and database container. It needs
Linux, Docker, the `stacktape-e2e` profile and access to the configured bore relay. It does not require a Console API
key. Each run writes recovery state before attempting resource creation.

```sh
export STP_AWS_LAMBDA_DEV_DEPLOY=1
export STP_AWS_LAMBDA_DEV_CONFIRM_DISPOSABLE=this-is-a-disposable-test-account
export STP_AWS_LAMBDA_DEV_PROFILE=stacktape-e2e
export STP_AWS_LAMBDA_DEV_EXPECTED_ACCOUNT_ID='<exact disposable account id>'
export STP_AWS_LAMBDA_DEV_OWNER='<unique lowercase run id>'
export STP_AWS_LAMBDA_DEV_STATE_FILE='<absolute fresh state file>'
pnpm --filter @stacktape/cli run test:real-aws-lambda-dev
```

An interrupted run prints its exact recovery command. Keep the same variables and run
`pnpm --filter @stacktape/cli run test:real-aws-lambda-dev -- --cleanup-only` before starting another run. This is an
explicit release lane; normal test commands cannot opt into it.
