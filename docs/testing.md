# Testing Stacktape changes

Tests are evidence for a behavior, not a quota. Strongly prefer one end-to-end test at the boundary where a complex
feature can fail as its sole behavioral test. An E2E run must leave a verifiable, repeatable evidence artifact with the
source revision, inputs, commands, results, and cleanup where applicable. Choose realistic failure cases; do not test
theoretical, very unlikely bugs when handling them would needlessly complicate the codebase.

Never write unit tests after writing the implementation they cover. If isolation is necessary, first list all realistic
ways the system could fail, then write the tests, then write the implementation. A mocked unit test may help prove a
pure policy or algorithm, but cannot prove behavior that depends on a process boundary, PostgreSQL, a browser, a built
artifact, a provider callback, or AWS.

Before implementation, run `pnpm test:plan -- --since=<git-ref>` or `pnpm test:plan` for current working-tree changes.
Use its output as a starting point, then add any risk that path matching cannot infer. Run `pnpm test:doctor` before a
long lane. A handoff must name the behavior proved, the commands that ran, and any boundary that remains untested.

Use [the Stacktape testing skill](../.agents/skills/stacktape-testing/SKILL.md) to apply this policy during feature
work. It includes a worked example for a security feature spanning the CLI, API and Console.

## When a feature or fix is sufficiently tested

Before calling a change complete, record:

1. **The customer outcome.** State the behavior being changed and the assertion that proves it. For a bug, reproduce the
   failure before the fix when practical and keep a deterministic regression at the failing boundary.
2. **Evidence from the changed code.** Run the applicable lanes below on the final source. For a local API change,
   verify that the browser actually targets that API. A successful login against the deployed API proves only that smoke
   scenario; it cannot qualify a different API revision or project operation.
3. **The relevant failure case.** Exercise denial/isolation for permission changes, retry/idempotency for delivery,
   cancellation/recovery for lifecycle changes, or invalid inputs for validation. Choose cases from the actual risk,
   rather than adding every category to every test.
4. **The durable result and cleanup.** When an action persists data or creates resources, check that result and verify
   owned cleanup after both success and failure. A toast, a successful deployment, or an empty error log is
   insufficient.
5. **The repository gate and remaining limits.** Report the commands, their results, and what each proved. A skipped,
   unavailable, or blocked required lane leaves that boundary unqualified. Complete independent checks, but do not label
   the whole feature accepted until the missing evidence exists.

For example, changing local Console startup requires the assembled support template, a browser request through the local
API, and verified process/tunnel cleanup. Checking injected environment variables alone misses accidentally deployed
databases, queues with no worker, and missing IAM permissions. Inspect an existing support stack before applying a
smaller template: removing legacy data is a migration decision, not routine test cleanup.

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

| Changed behavior                                            | Minimum useful evidence                                                                           | Add when the risk crosses another boundary                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Pure parser, formatter, state machine, policy, or algorithm | E2E consumer scenario when practical; otherwise a test-first unit test of realistic failure cases | Property or fuzz cases only when a real large input space warrants them               |
| Public schema, type boundary, or serialization              | Producer/consumer contract test using the serialized form                                         | Process-level request through the real adapter                                        |
| Naming, config normalization, IAM, or CloudFormation        | Semantic assertions against the resolved template; `cfn-lint` for CloudFormation                  | Disposable AWS scenario when an AWS service must interpret the result                 |
| Package or runtime artifact                                 | Build the real archive/image and execute it in the target Docker runtime                          | Disposable AWS invocation for service-specific runtime semantics                      |
| CLI command or control-plane interaction                    | Run the source-built CLI as a child process and assert exit code, output, and durable result      | Dev API or disposable AWS scenario when the command contacts those systems            |
| Console API routing, authentication, or API/UI contract     | Fastify injection through the real HTTP/tRPC adapter                                              | Full `pnpm dev:console` browser flow against the dev data plane                       |
| Prisma query, constraint, transaction, or migration         | Disposable PostgreSQL with real migrations and real queries                                       | Shared dev migration plus Console flow when existing dev data matters                 |
| Console UI behavior                                         | Browser interaction with user-visible assertions                                                  | Full local API mode for changed contracts; deployed dev mode for callbacks/jobs       |
| OAuth, provider webhook, or background Lambda               | Deploy `console-app-dev` and send a real provider event                                           | Verify retry, idempotency, denial/cancellation, and recorded side effects             |
| EC2 runner, AMI, instance profile, SSM, or boot behavior    | Real dev AMI or runner job with an owned, reproducible result                                     | Run a workload, collect the durable result, stop/terminate the runner, verify cleanup |
| Observability or security detection                         | End-to-end signal through ingestion, storage, API, and UI with a reproducible result              | Real AWS event when its shape or delivery semantics are owned by AWS                  |
| Documentation or cosmetic UI only                           | Relevant build plus browser or rendered inspection                                                | Accessibility and responsive checks when layout or interaction changed                |

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

`pnpm test:packaging-e2e` ends with six CLI-owned acceptances. The first is
`pnpm --filter @stacktape/cli run test:lambda-archives`, the acceptance for ZIPs made by the CLI's own archiver. It
extracts each archive with `unzip` into a new directory and invokes it in the official Lambda Node.js image as an
unprivileged user that owns none of the files: executables, a single file, hidden entries, links, removed files and
quoted paths, through archiver, zip, 7-Zip and a failing native tool. It also seeds local deployment buckets with
permission-broken ZIPs under their pre-format keys. Custom and managed packaging must rebuild them, reuse the rebuilt
objects, and rebuild after a chmod-only change. Split functions with their shared and native layers go through the
deploy command's own packaging and upload code, with local stand-ins for S3, CloudFormation and Docker: they must
replace the old objects, reuse unchanged ones, and rebuild after a mode-only change exactly where the archive changes.
It needs Docker and `unzip`. Pass `--zip-dir` and `--7z-dir` for tools not on `PATH`; a native tool it cannot find is
reported as not qualified.

The second, `pnpm --filter @stacktape/cli run test:asset-replacer`, runs the service helper's Next.js asset replacer as
a stack does. It builds every helper artifact with the release packaging and verifier, then runs the service helper's
ZIP in the official Lambda Node.js 22 image for x86_64, its deployed runtime, as the same unprivileged user, with an
owned host directory as `/tmp`. The helper container shares the network namespace of a fixture container that has no
network, so the SDK the runtime provides reaches only the fixture's S3 and CloudFormation-response endpoints on
loopback. One warm container receives two Creates for one key with different inputs and values, a key with several dots,
an invalid ZIP, ZIPs with escaping links (one with non-ASCII names), a refused download, a refused upload and a Delete.
A second container, whose `/tmp` is a 10 MiB tmpfs, must replace values in a package with 4 MiB of incompressible data.
Each outcome is read from the CloudFormation response, not the invocation status. Uploaded ZIPs are extracted with
`unzip`, inspected and run in the Lambda runtime; the helper's logs must not contain any search or replacement value,
and its `/tmp` must be left as it was. It needs Docker and `unzip`, not AWS. `--helper-lambdas-dir` characterizes
already built helper artifacts instead, and the report marks them as supplied.

The third, `pnpm --filter @stacktape/cli run test:docker-preparation`, packages small projects through the CLI's own
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

The fourth, `pnpm --filter @stacktape/cli run test:layer-upload`, runs three deployments of the split project through
the deploy command's own packaging and upload code into one local bucket. The shared layer is 12 MiB, and a
native-dependency layer changes alone. A deployment must zip and upload only the layers its bucket does not hold yet.
Each ZIP must extract with `unzip` to exactly its layer, and the bucket must store exactly that ZIP. Every layer key the
template uses must stay protected from retention. It needs `unzip`, not Docker or AWS.

The fifth, `pnpm --filter @stacktape/cli run test:fresh-install`, runs the first `package` of a fresh npm checkout with
the compiled release CLI. The CLI installs dependencies and bundles in one process, and Bun caches the project
directory's entries when that process starts; the acceptance fails if the bundler cannot see the `node_modules` the
install just created. The CLI and a one-package registry run in the Lambda Node.js image with no network but loopback,
no Docker, no capabilities and a read-only root filesystem. The project has only a lockfile and no `node_modules`
anywhere above it. The first run must install and build; its ZIP, extracted with `unzip`, must return the dependency's
value in the Lambda runtime. The repeat must skip the install and produce the same files. `report.json` records the
executable, each run's install decision, ZIP checksums and file list, and every registry request. It needs Linux, Docker
and `unzip`, not AWS. `--install` tests an already built release install instead.

The sixth, `pnpm --filter @stacktape/cli run test:external-tools`, resolves pack, nixpacks and the Session Manager
plugin as a customer's first command does: each resolution runs in its own process through the CLI's resolver. A
loopback stand-in serves a tar.gz, a zip bundle and a `.deb` around synthetic executables under a test manifest, and a
proxy on a closed port refuses every other request. Cold first use must download, verify, extract and run the
executable. Warm use, and a preseeded file used by the nixpacks planner and by `pack`, must make no request. A checksum
mismatch must leave no executable, and a refused download must name the URL, the checksum and the path to place the file
offline. A process killed mid-download must leave nothing usable before the retry succeeds, and two concurrent first
uses must download once. It needs Linux or macOS, not Docker, AWS or the internet. The real upstream assets are checked
by `scripts/pin-external-tools.ts` whenever a version changes, and by the release artifact check, which downloads each
one on first use.

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

### Console API and PostgreSQL

The Console API exposes a server factory so HTTP/tRPC adapter tests can use Fastify injection without binding a port.
Use `pnpm --filter @stacktape/console-api-app test` for that lane. The current adapter test covers transport and error
serialization using a small test router, not production authentication or every application route. Add a request through
the relevant real router/context when changing those behaviors. Bun isolates test files so module mocks do not leak
between suites; do not add mutable production call tables merely to work around mock leakage.

Use `pnpm --filter @stacktape/console-api-app test:db` for schema adoption and migration changes. It starts an isolated
PostgreSQL container, creates scratch databases, runs the real migration-adoption path, and verifies container removal
in a `finally` block. The current suite covers migration/adoption only; it does not automatically test application
queries, constraints, or transactions. Add real-query regression coverage for those changes. It never points at the
shared dev database. This is distinct from `pnpm dev:console`, whose purpose is to exercise real Console behavior
against the shared dev data plane.

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

### Shared dev reservation

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

### Browser execution

For a UI-only change, one command starts the current UI, waits for it, runs authenticated Chromium navigation against
the deployed dev API, and stops the UI afterward. It refuses to reuse an existing server:

```sh
pnpm test:console:browser:dev-api
```

For an API or API/UI contract change, keep the full local mode running in one terminal and execute the browser lane in
another:

```sh
pnpm dev:console
pnpm --filter @stacktape/console-ui test:e2e
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
[`../apps/console/e2e/README.md`](../apps/console/e2e/README.md).

For a changed user flow, add or extend a scenario that drives the browser as a customer would. Assert a durable API,
database, provider, or AWS result when the action has one; a toast alone is not proof. Include authorization denial,
organization isolation, cancellation or retry, and stale-state behavior when relevant.

### Live AWS

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
contract are documented in [`../apps/cli/scripts/real-aws/README.md`](../apps/cli/scripts/real-aws/README.md).

## Feature acceptance plans

Use the private [Console E2E guide](../apps/console/e2e/README.md) for reusable fixtures and each lane's coverage.
Inspect the relevant tests and any supplied results for the actual source/artifact revision. Run
`pnpm test:doctor -- --for=console` for Console prerequisites; the default doctor checks workspace tools only.

The older packaging/init canaries below require a genuinely disposable account. The authorization to deploy uniquely
owned test resources in the shared Console hosting account does not make it disposable. Do not lie to the canary's
account acknowledgement; use a separate test account or first qualify an explicitly scoped shared-account runner.

The following sections guide evidence selection for the changed feature. They do not report current automated coverage
or form a checklist to run in every task. A dev deployment only makes code reachable. It does not prove delivery,
ingestion, authorization, or cleanup. Fixture readiness checks local configuration, not whether provider grants work.

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

Keep per-run details in ignored `.stacktape/` task files or CI artifacts, with a concise result in the task handoff or
commit/PR description. Reuse applicable results when their source, artifact and environment still match; do not repeat
live scenarios solely because a historical status document was removed. Missing evidence is not a pass. Retain cleanup
recovery state until deletion is verified. Preserve repeatable tests and fixture/setup instructions in source control.

Do not create a committed evidence diary or a completed acceptance checklist for each task. Update the existing guide
when a reusable procedure changes. Record a concrete production migration, provider configuration or cutover action in
[V4 launch readiness](../apps/console/documents/releases/v4-readiness.md); general test coverage and feature TODOs do
not belong there. The [documentation index](README.md) describes ownership of the other documents.
