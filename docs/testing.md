# Testing Stacktape changes

Tests are evidence for a behavior, not a quota. Choose the cheapest test that crosses the boundary where the change can
fail. A mocked unit test is useful for a pure policy or algorithm. It is not sufficient evidence for behavior that
depends on a process boundary, PostgreSQL, a browser, a built artifact, a provider callback, or AWS.

Before implementation, run `pnpm test:plan -- --since=<git-ref>` or `pnpm test:plan` for current working-tree changes.
Use its output as a starting point, then add any risk that path matching cannot infer. Run `pnpm test:doctor` before a
long lane. A handoff must name the behavior proved, the commands that ran, and any boundary that remains untested.

## Vocabulary

These two commands are easy to confuse:

- **Source-built CLI:** `pnpm dev:cli <command>` builds the current CLI source and then runs that command with
  `STP_DEV_MODE=true`. This automatically selects the dev Stacktape API and dev Cognito pool. The target deployment
  stage is still explicit, for example `--stage dev`.
- **Local workload runtime:** `pnpm dev:cli dev ...` invokes the Stacktape product's `dev` command. It starts selected
  workloads locally and may start emulators or use remote resources.

Never replace `pnpm dev:cli` with an installed `stacktape` binary when testing an unbuilt CLI change. Never infer the
deployment stage from source-CLI dev mode; spell out `--stage`, `--region`, `--projectName`, and the credential mode for
mutating commands.

## Select evidence by failure boundary

| Changed behavior                                            | Minimum useful evidence                                                                                    | Add when the risk crosses another boundary                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Pure parser, formatter, state machine, policy, or algorithm | Focused unit test with representative inputs and failure cases                                             | Property or fuzz cases for a large input space                                        |
| Public schema, type boundary, or serialization              | Producer/consumer contract test using the serialized form                                                  | Process-level request through the real adapter                                        |
| Naming, config normalization, IAM, or CloudFormation        | Semantic assertions against the resolved template; `cfn-lint` for CloudFormation                           | Disposable AWS scenario when an AWS service must interpret the result                 |
| Package or runtime artifact                                 | Build the real archive/image and execute it in the target Docker runtime                                   | Disposable AWS invocation for service-specific runtime semantics                      |
| CLI command or control-plane interaction                    | Run the source-built CLI as a child process and assert exit code, output, and durable result               | Dev API or disposable AWS scenario when the command contacts those systems            |
| Console API routing, authentication, or API/UI contract     | Fastify injection through the real HTTP/tRPC adapter                                                       | Full `pnpm dev:console` browser flow against the dev data plane                       |
| Prisma query, constraint, transaction, or migration         | Disposable PostgreSQL with real migrations and real queries                                                | Shared dev migration plus Console flow when existing dev data matters                 |
| Console UI behavior                                         | Browser interaction with user-visible assertions                                                           | Full local API mode for changed contracts; deployed dev mode for callbacks/jobs       |
| OAuth, provider webhook, or background Lambda               | Deploy `console-app-dev` and send a real provider event                                                    | Verify retry, idempotency, denial/cancellation, and recorded side effects             |
| EC2 runner, AMI, instance profile, SSM, or boot behavior    | Pure policy/template test plus a real dev AMI or runner job                                                | Run a workload, collect the durable result, stop/terminate the runner, verify cleanup |
| Observability or security detection                         | Deterministic policy/normalization tests plus an end-to-end signal through ingestion, storage, API, and UI | Real AWS event when its shape or delivery semantics are owned by AWS                  |
| Documentation or cosmetic UI only                           | Relevant build plus browser or rendered inspection                                                         | Accessibility and responsive checks when layout or interaction changed                |

The minimum column is a floor, not a list of tests to create automatically. Do not add a unit test that merely repeats
the implementation, asserts mock call choreography, scans source text, or proves a language/library feature. Source
inspection is acceptable only as a clearly named policy lint when runtime evidence cannot enforce the rule.

For a bug, first reproduce it at the closest meaningful boundary. Keep the regression test if it is deterministic and
protects a real contract. For generated output, test the canonical input and run its non-mutating `generate:check`; do
not hand-edit or snapshot a large generated file.

## Standard lanes

### Fast local lane

Run focused package tests and type checking while editing. Before handoff, use the affected repository gate:

```sh
pnpm check:public
pnpm check:integrated # private Console is initialized
```

The full gates are not a substitute for the boundary-specific lane above. Conversely, a successful E2E scenario does not
excuse type, architecture, generated-file, or secret checks.

### Packaging and project qualification

Use `pnpm test:packaging-e2e` for archive/image behavior. Use the import, package, and runtime qualification lanes for
customer projects as described in [`project-qualification.md`](project-qualification.md). The package lane intentionally
blocks unreviewed project code on the host. Packaging proves that artifacts can be produced; only the runtime and AWS
lanes prove that they run.

### Console API and PostgreSQL

The Console API exposes a server factory so HTTP/tRPC adapter tests can use Fastify injection without binding a port.
Use `pnpm --filter @stacktape/console-api-app test` for that lane.

Use `pnpm --filter @stacktape/console-api-app test:db` for schema adoption, migration, constraint, transaction, or raw
SQL changes. It starts an isolated PostgreSQL container, creates scratch databases, runs the real migration-adoption
path, and removes the container in a `finally` block. It never points at the shared dev database. This is distinct from
`pnpm dev:console`, whose purpose is to exercise real Console behavior against the shared dev data plane.

After a schema change passes locally, apply its committed migration with `pnpm migrate:console:dev` and test the
affected Console flow. Production migration remains separately authorized.

### Console browser behavior

Choose the smallest valid mode:

- `pnpm dev:console:ui` serves only the UI at `http://localhost:4000` against the already deployed dev API. Use it only
  when the API contract is unchanged.
- `pnpm dev:console` serves the changed API at `http://localhost:3000` and UI at `http://localhost:4000`, using the
  shared dev database, Cognito pool, and AWS services. Use it for every API or API/UI contract change.
- `pnpm deploy:console:dev` updates `console-app-dev`. Use it when GitHub, GitLab, Bitbucket, OAuth, webhooks, queues,
  or background Lambdas must reach the changed code.

Agents may run all three development operations without asking again. They may also let `pnpm dev:console` refresh its
minimal `console-app-devlocal` support stack. Production remains prohibited unless the user explicitly requests it.

For a UI-only change, one command starts the UI, waits for it, runs Chromium against the deployed dev API, and stops the
UI afterward:

```sh
pnpm test:console:browser:dev-api
```

For an API or API/UI contract change, keep the full local mode running in one terminal and execute the browser lane in
another:

```sh
pnpm dev:console
pnpm --filter @stacktape/console-ui test:e2e
```

The committed smoke checks cover the anonymous shell. Authenticated scenarios require `STP_CONSOLE_E2E_USER_EMAIL` and
`STP_CONSOLE_E2E_USER_PASSWORD`; keep those values in a password manager or masked environment, never a repository file
or report. Use the dedicated E2E user and organization, not a personal account. Persistent provider fixtures should use
clearly labelled disposable repositories and a dedicated connected AWS account. Scenario cleanup removes resources
created by the scenario, but it must not delete the reusable identity, organization, connection, or repositories.

The fixture inventory format and readiness check are documented in
[`../apps/console/e2e/README.md`](../apps/console/e2e/README.md).

For a changed user flow, add or extend a scenario that drives the browser as a customer would. Assert a durable API,
database, provider, or AWS result when the action has one; a toast alone is not proof. Include authorization denial,
organization isolation, cancellation or retry, and stale-state behavior when relevant.

### Live AWS

Development AWS operations have standing authorization for this repository: agents may deploy unique disposable stacks,
deploy `console-app-dev`, refresh `console-app-devlocal`, and build test AMIs without asking for each run. This
authorization never includes production.

Every live scenario must enforce these rules in code:

1. Resolve the active AWS account and region before mutation and compare the account with an explicit expected ID.
2. Use a unique project/stage or resource name and ownership tags. Never discover cleanup targets from a broad prefix.
3. Write recovery state before or immediately after creating each resource.
4. Clean up in `finally` after success and failure, then query AWS to verify that the owned resources are gone.
5. If cleanup is interrupted, preserve the state file and print one exact `--cleanup-only` command. Run cleanup before
   starting another scenario.
6. Keep credentials and parameter values out of commands, logs, reports, and Git.

Prefer low-cost Lambda, S3, DynamoDB, SQS, and log-group scenarios. Provision NAT gateways, load balancers, RDS,
OpenSearch, large EC2 instances, or long-running fleets only when that resource is the behavior under test. Keep them
for the shortest practical time and never leave an idle runner. AMI scenarios must deregister obsolete test images and
delete their owned snapshots after verification.

Run existing guarded scenarios through:

```sh
pnpm test:aws -- --aws-scenario=<name>
```

The required disposable-account confirmation, exact account ID, credential selection, unique name, state, and recovery
contract are documented in [`../apps/cli/scripts/real-aws/README.md`](../apps/cli/scripts/real-aws/README.md).

## Feature acceptance plans

### Observability

Send a uniquely identifiable signal through the real ingestion path. Verify its normalized stored form, Console API
response, browser rendering, filters/pagination, and organization isolation. Test malformed, duplicated, late, and
recovery events. Delete the canary stack and any retained signals the scenario owns.

### Security and guardrails

State the threat or unsafe configuration first. Prove a positive detection and a nearby safe case that does not alert.
Verify tenant and project boundaries, redaction, deduplication, severity, remediation text, acknowledgement/ignore, and
recovery. Use a synthesized template for deterministic rules; use disposable AWS only for facts that depend on AWS's
runtime or control plane. Never put a real credential or exploitable public resource in a fixture.

### EC2 runners and AMIs

Test instance selection, IAM, ownership, leasing, timeout, and cleanup as pure policies. Then build or select the dev
AMI, start one owned runner, run a representative CLI workload, verify logs/result/lease release, and terminate it.
Exercise boot failure or cancellation when that behavior changed. The final check must confirm there is no running
instance, volume, test AMI/snapshot, or active lease owned by the scenario.

### Git providers

Use the provider-specific flow in
[`../.agents/skills/console-development/references/git-provider-e2e.md`](../.agents/skills/console-development/references/git-provider-e2e.md).
The reusable fixture inventory records only provider, account/workspace label, repository label, default branch, and
expected webhook/app installation. It never stores provider tokens. Drive install/connect, push, pull/merge request,
retry, disconnect/reconnect, and provider-side removal as applicable. Verify the resulting deployment or recorded
failure, not only the callback page.

## Evidence in the handoff

Report each test as `command — behavior proved`. Separate failures caused by the change from blocked or unavailable
lanes. For every live run, include the account ID, region, generated scenario name, cleanup result, and the recovery
command only if cleanup did not finish. Do not paste large logs or any secret-bearing environment.

If an important boundary was not tested, say exactly what remains and why. Passing unrelated unit tests is not evidence
for an untested boundary.
