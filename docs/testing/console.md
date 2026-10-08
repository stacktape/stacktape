# Console testing

Read the [test-selection policy](../testing.md) first. Use only the sections needed for the changed behavior. Run
`pnpm test:doctor -- --for=console` before a shared-dev Console lane; it checks the dev AWS account, login and
parameters. For the isolated browser/database lane, use the default `pnpm test:doctor`, which checks workspace tools
only. The [Console development skill](../../.agents/skills/console-development/SKILL.md) owns local startup and
recovery; the private [Console E2E guide](../../apps/console/e2e/README.md) owns test identities, fixture setup and
scenario commands. The [isolated Console application](e2e.md#isolated-console-application) runs browser/API/database
journeys without credentials; the shared-dev commands below remain the procedure for hosted identity and external
integrations.

## Console API and PostgreSQL

The Console API exposes a server factory so HTTP/tRPC adapter tests can use Fastify injection without binding a port.
Use `pnpm --filter @stacktape/console-api-app test` for that lane. The current adapter test covers transport and error
serialization using a small test router, not production authentication or every application route. Add a request through
the relevant real router/context when changing those behaviors. Bun isolates test files so module mocks do not leak
between suites; do not add mutable production call tables merely to work around mock leakage.

Use `pnpm --filter @stacktape/console-api-app test:db` for schema adoption and migration changes. It starts an isolated
PostgreSQL container, creates scratch databases, runs the real migration-adoption path, and verifies container removal
in a `finally` block. The default selection covers migration/adoption only. Feature suites are available explicitly:

```sh
pnpm --filter @stacktape/console-api-app test:db --issues
pnpm --filter @stacktape/console-api-app test:db --incidents
pnpm --filter @stacktape/console-api-app test:db --incident-journey
pnpm --filter @stacktape/console-api-app test:db --security
pnpm --filter @stacktape/console-api-app test:db --insights
pnpm --filter @stacktape/console-api-app test:db --gitlab
pnpm --filter @stacktape/console-api-app test:db --runner
pnpm --filter @stacktape/console-api-app test:db --git-deploy
pnpm --filter @stacktape/console-api-app test:db --incident-agent
pnpm --filter @stacktape/console-api-app test:db --sign-up
pnpm --filter @stacktape/console-api-app test:db --console-access
pnpm --filter @stacktape/console-api-app test:db --cli-console
```

Pass the flag directly: an extra `--` is forwarded to this script and rejected. The `--incident-agent` suite also spawns
the source CLI for `stacktape ai:connect`, so the runner first builds the CLI dev artifacts
(`turbo run build:dev-artifacts --filter=@stacktape/cli`, cached after the first run). Choose the suite whose assertions
cover the change, extending it when necessary. These suites use the disposable database, not shared dev. The runner
currently defaults to a pinned PostgreSQL 15.14 image matching Console's configured RDS major version. Override it only
to qualify a deliberate database upgrade. `pnpm dev:console` instead exercises the real shared dev data plane.

The `--cli-console` suite runs source CLI processes against the production HTTP router and disposable PostgreSQL. It
covers deployment reporting and Console read responses, endpoint-scoped login/logout, token exchange, organization and
project commands, and isolated AWS profiles/defaults. AWS calls use a loopback wire fixture; external network requests
are rejected. It needs Docker and builds the CLI dev artifacts before testing.

The `--incident-journey` suite extends issue and incident coverage through the production HTTP router, signed loopback
webhook delivery and authenticated incident actions. It also invokes the built uptime prober in the official Node.js 22
Lambda image and checks the monitoring sweeper through its Lambda proxy. Build the helpers first with
`pnpm --filter @stacktape/cli build:dev-artifacts`; the lane needs `openssl`, `unzip`, Docker and the local
`public.ecr.aws/lambda/nodejs:22` image. All fixtures use isolated databases and loopback endpoints.

`--git-deploy` runs authenticated provider ingress, durable webhook/operation workers, runner dispatch and completion
against loopback transports, with real API middleware and disposable PostgreSQL. It uses a ready runner fixture; EC2
provisioning and AMI qualification remain separate. Dispatched deployment, Actions and cancellation scripts execute in a
network-disabled `node:24-bookworm` container with controlled external tools and a systemd stand-in. A local file relay
forwards only the suite's AWS/API HTTP requests, including real CLI and runner completion callbacks, across Docker
Desktop and WSL.

The isolated Console browser lane uses the same disposable database runner:

```sh
pnpm --filter @stacktape/console-api-app test:db --isolated-browser
```

It starts and stops the real local UI and API itself, so it needs neither dev credentials nor a shared-dev reservation.

After a schema change passes locally, apply its committed migration with `pnpm migrate:console:dev` and test the
affected Console flow. Production migration remains separately authorized.

## Console browser behavior

Choose the smallest valid mode:

- Use the [isolated browser/API/PostgreSQL fixture](e2e.md#isolated-console-application) when it covers the changed
  behavior. It needs no shared-dev credentials or reservation.
- `pnpm dev:console:ui` serves only the UI at `http://localhost:4000` against the already deployed dev API. Use it only
  when the API contract is unchanged.
- `pnpm dev:console` serves the changed API at `http://localhost:3000` and UI at `http://localhost:4000`, using the
  shared dev database, Cognito pool, and AWS services. Use it when shared-dev testing needs changed API code or a
  changed API/UI contract.
- `pnpm deploy:console:dev` updates `console-app-dev`. Use it when GitHub, GitLab, Bitbucket, OAuth, webhooks, queues,
  or background Lambdas must reach the changed code.

Agents may run these development operations without asking again. They may also let `pnpm dev:console` refresh its
minimal `console-app-devlocal` support stack. Production remains prohibited unless the user explicitly requests it.

## Shared dev reservation

`stacktape-dev` (AWS account `977946299200`) contains both production and dev. It is not disposable. Reuse
`console-app-dev` and the existing dev Stacktape organization for ordinary development. Do not create a full Console
stack per agent. Separate test users, organizations and projects do not require another Console deployment.

Before changing shared dev code/data or relying on its deployed version for an acceptance test, reserve it:

```sh
pnpm console:dev:reservation acquire "task-label"
export STP_CONSOLE_DEV_RESERVATION=<the-successfully-acquired-id>
pnpm deploy:console:dev # or pnpm dev:console / pnpm migrate:console:dev
# Run the applicable source CLI, browser, provider or background-job tests.
# Stop local dev processes, finish AWS operations and clean up owned test resources.
pnpm console:dev:reservation release
```

The ID is a non-secret coordination handle. Keep it in the task's command environment, not a shared `.env` file. Another
task must acquire its own reservation, never reuse the ID shown by `status`. The second acquisition fails with the
current owner's task label and start time, including across PCs. Work on offline tests while dev is busy.

The root deploy/migration commands, full local mode and source-run dev Console package scripts check the reservation
before starting. It remains held through testing, not only deployment. UI-only development can continue without a
reservation when changing backend/data does not matter to that work. Reserve dev for acceptance evidence that requires a
stable deployed version. Raw CLI/AWS commands and installed binaries bypass these repository guards; do not use them to
evade coordination. This is cooperative coordination, not an IAM security boundary.

Reservations deliberately do not expire or release on process exit: CloudFormation, migrations and remote jobs can
outlive an agent. After a crash, run `pnpm console:dev:reservation status`, contact the named task/owner, and confirm
its local processes and remote operations have stopped. Only then release that exact ID. Never steal an old-looking
reservation or delete the table. Record the reservation ID and relevant source revisions with live-test evidence.

One persistent, deletion-protected, on-demand DynamoDB table, `stacktape-console-dev-coordination`, holds the
reservation in `eu-west-1`. It is independent of Console deployment and has no TTL. Initial setup is
`pnpm console:dev:reservation setup`. Conditional creation/deletion prevent concurrent acquisition and stale-owner
release. To qualify those AWS semantics without touching the real reservation or any Console stack:

```sh
node scripts/workspace/qualify-console-dev-reservation.ts --live
```

This creates and removes one uniquely named test row. It is not part of normal tests.

## Browser execution

### Localhost login

Both local modes serve the UI at `http://localhost:4000` and use the real **dev Cognito pool**. For manual testing, open
that URL and use the normal dev login. Console browser login and the source CLI's login are separate; the private guide
covers
[restoring the development CLI login](../../apps/console/e2e/README.md#restoring-the-agents-development-cli-login).

For automation, reuse the existing Developer or separately scoped Admin fixture described in
[agent browser access](../../apps/console/e2e/README.md#agent-browser-access). The current
[browser fixtures](../../apps/console/ui/e2e/fixtures.ts) load credentials inside the Playwright worker and authenticate
through the real form. Feature tests use `async ({ page, signIn })` and `await signIn()` (Developer), or
`await signIn('admin')`. Each worker reuses a separate in-memory session for each identity and verified UI/API/auth
target, for up to five minutes. Each test still has a fresh browser context; changed cookies, selected organizations and
other test state never update the cached seed. Use the fixture matching the intended role; do not ask the owner to
repeat login or create another identity before checking these fixtures.

Login, logout, revocation and session-expiry scenarios must use the fresh
[`signInBrowserUser(page, identity)`](../../apps/console/ui/e2e/sign-in.ts) helper instead of cached sessions. A failed
application request does not trigger a hidden login retry. Cached state is discarded when the worker ends and is never
saved to disk. Run `pnpm --filter @stacktape/console-ui test:e2e:sessions` and `test:e2e:privacy` after changing these
helpers; both qualifiers are offline.

There is no shared-dev authentication bypass. Synthetic identities belong to the planned isolated harness, not the live
dev API. Shared-dev tests remain serialized under a reservation; session reuse does not isolate server-side data.
Console login also does not authenticate GitHub/GitLab/Bitbucket provider sessions; follow the private guide for those
callbacks and approvals.

For a UI-only change, one command starts the current UI, waits for it, runs authenticated Chromium navigation against
the deployed dev API, and stops the UI afterward. It refuses to reuse an existing server:

```sh
STP_CONSOLE_E2E_CREDENTIAL_SOURCE=ssm pnpm test:console:browser:dev-api
```

For shared-dev testing of an API or API/UI contract change, keep full local mode running in one terminal and execute the
browser lane in another:

```sh
pnpm dev:console
STP_CONSOLE_E2E_CREDENTIAL_SOURCE=ssm pnpm --filter @stacktape/console-ui test:e2e
```

Use `pnpm test:console:browser:smoke` for the separate anonymous shell check. It is not a substitute for authenticated
coverage. Both browser modes verify the running UI's API target before entering credentials; a local-API test cannot
silently use the deployed dev API. The authenticated lane currently covers login and projects navigation, not complete
feature acceptance. Missing credentials fail the lane instead of skipping it. Authenticated traces, screenshots, and
videos are disabled to avoid storing credentials, tokens, or private account data.

Authenticated automation uses a dedicated email/password user in the dev Cognito pool. Invite it to the existing dev
Stacktape organization with Developer access to the intended test projects. For interactive development, the owner's
normal dev Google login is also supported; it is not the unattended browser test's credential source. Restricted-user
and cross-organization tests need their own fixtures, not an Owner login. Destructive disconnect/revoke/delete tests
must not target existing shared connections or the shared organization.

Prefer `STP_CONSOLE_E2E_CREDENTIAL_SOURCE=ssm`. The Playwright worker verifies the AWS account and reads only
`/stacktape/testing/console-dev/browser-user` as SecureString JSON with `email` and `password`. Credentials stay in that
worker, never the Vite environment. Alternatively inject `STP_CONSOLE_E2E_USER_EMAIL` and
`STP_CONSOLE_E2E_USER_PASSWORD` from a password manager; never put values in Git, shell arguments or reports. Missing
credentials fail closed. Setup, project access and scenario-specific fixture ownership are documented below.

The fixture inventory format and readiness check are documented in
[`../../apps/console/e2e/README.md`](../../apps/console/e2e/README.md).

For a changed user flow, add or extend a scenario that drives the browser as a customer would. Assert a durable API,
database, provider, or AWS result when the action has one; a toast alone is not proof. Include authorization denial,
organization isolation, cancellation or retry, and stale-state behavior when relevant.

## Prove the changed revision

For a changed CLI/API contract, run the source CLI as a process against the intended API revision. `pnpm dev:cli`
defaults to deployed dev even while a local API is running. Set `STP_CUSTOM_TRPC_API_ENDPOINT=http://localhost:3000` on
that CLI process to use the changed local API, then verify the actual target. Deployed callbacks and background workers
need their changed dev code and a real event; local API success does not qualify them.

Assert the operation result: tRPC HTTP 207 can contain a failed procedure. Read stored changes through the real
API/database or reload, and exercise access with the intended restricted identity. Use
[runtime acceptance and diagnosis](runtime-acceptance.md) when tracing runtime configuration, callback routing, worker
completion or cleanup failures.

Avoid concurrent generators writing the same materializations. Finish local startup before another generating command,
and preferably stop local mode before the repository gate.
