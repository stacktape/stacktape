# Test helpers and E2E conventions

Use [the short policy](../testing.md) to choose what to test. This guide lists the helpers that exist, the ones worth
building next, and the conventions for browser and process tests. Commands live in the owning manifests and in the
[Console](console.md), [packaging](../../apps/cli/scripts/packaging-archives/README.md) and [live-AWS](live-aws.md)
procedures.

## Start with one behavior

State what the customer can do, the durable result, and the realistic failure that would break it. Choose the cheapest
real environment that can observe those. Name the test after the promise.

Run real production code between the scenario's entry and its assertion. Substitute only what lies outside the boundary:
an external provider's HTTP response, for example. A browser test with a substituted API is UI coverage; a direct router
call covers authorization and persistence but not HTTP serialization.

Prepare unrelated prerequisites through a data factory or API, and perform the tested action through the real product
path. Assert results independently of setup helpers; a helper that reimplements the algorithm repeats its bugs.

## Helpers that exist

Reuse these before writing new setup code. Rows marked **duplicate** are consolidation candidates
([F6](overhaul.md#foundation-work)).

| Capability                               | Where                                                                                                                                                  | Notes                                                                                                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run a child process                      | [qualification process](../../apps/cli/scripts/qualification/process.ts)                                                                               | Deadlines, output tail and redaction. Every CLI acceptance and the source-CLI smoke use it.                                                                                                           |
|                                          | [workspace child process](../../scripts/workspace/child-process.ts), `run` in [packaging E2E helpers](../../packages/packaging/scripts/e2e-helpers.ts) | Kept: root tooling and package scripts cannot import the CLI, and each is a few lines around `spawn`.                                                                                                 |
| Package a project with the source CLI    | [source-CLI packaging](../../apps/cli/scripts/qualification/source-cli-packaging.ts)                                                                   | MiniStack SDK reads and seeded Secrets Manager/SSM prerequisites; isolated home and guarded CLI child. Prepares pinned Railpack before the guard; needs Docker and dependency-download network.       |
| Invoke an artifact in the Lambda runtime | [CLI Lambda runtime](../../apps/cli/scripts/packaging-archives/lambda-runtime.ts)                                                                      | Extracts ZIPs, runs as the Lambda user with layers and environment, removes containers. Every CLI acceptance uses it.                                                                                 |
|                                          | `invokeInLambdaImage` in [packaging E2E helpers](../../packages/packaging/scripts/e2e-helpers.ts)                                                      | Kept for the package's own scripts, which cannot import the CLI; it runs as root and does not extract ZIPs.                                                                                           |
| Synthesize a config without AWS          | [synthesis fixture](../../apps/cli/tests/characterization/synthesis-fixture.ts)                                                                        | Real synthesis behind a credential-less boundary.                                                                                                                                                     |
| Real projects                            | [Project qualification](../project-qualification.md)                                                                                                   | Pinned corpus and starters; import, package and runtime lanes.                                                                                                                                        |
| MiniStack emulator                       | [MiniStack fixture](../../packages/ministack/src/fixture.ts)                                                                                           | `startMiniStack()`: pinned image, random loopback port, synthetic credentials, per-run account namespaces, verified cleanup. Shared by CLI and Console tests.                                         |
| Offline deploy loop                      | [deploy-loop harness and family table](../../apps/cli/tests/ministack/families.ts)                                                                     | The source CLI deploys, updates, redeploys and deletes each resource family on MiniStack; effects observed through the real SDK. `test:ministack:deploy`.                                             |
| Artifact uploads against MiniStack       | [layer upload acceptance](../../apps/cli/scripts/packaging-archives/layer-upload-ministack-acceptance.ts)                                              | The deploy path's S3 uploads, reuse and retention on the shared fixture.                                                                                                                              |
| Shared UI in a browser                   | [gallery fixture](../../packages/ui-react/e2e/fixtures.ts)                                                                                             | Loopback Vite server per worker, external traffic rejected, fresh context per test.                                                                                                                   |
| Disposable PostgreSQL                    | [database runner](../../apps/console/api/scripts/run-db-integration.ts)                                                                                | Pinned 15.14, real migrations, verified container removal. Private.                                                                                                                                   |
| Console identities and providers         | [incident-agent fixtures](../../apps/console/api/scripts/incident-agent-fixtures.ts)                                                                   | Locally signed tokens, loopback server, AWS/GitHub/model fakes, fixture Git repositories. Private.                                                                                                    |
| Isolated Console application             | [isolated Console fixtures](../../apps/console/ui/e2e/isolated-console-fixtures.ts)                                                                    | Shared UI/API startup, signed sessions and cleanup, consumed by issue and deployment browser journeys. Private.                                                                                       |
| Shared-dev Console sign-in               | [browser fixtures](../../apps/console/ui/e2e/fixtures.ts)                                                                                              | Real dev Cognito login, cached per worker. Needs the reservation.                                                                                                                                     |
| Live AWS scenario                        | [real-AWS scripts](../../apps/cli/scripts/real-aws/README.md)                                                                                          | Account check, owned names, recovery state, verified cleanup.                                                                                                                                         |
| Change-plan compatibility                | [data-safety lane](../../apps/cli/tests/data-safety/README.md)                                                                                         | Baseline template → current synthesis → the product's change plan; committed v3 and v4 baselines.                                                                                                     |
| Console API over HTTP with tenants       | [Console tenant fixtures](../../apps/console/api/scripts/console-tenant-fixtures.ts)                                                                   | Production router, middleware and Prisma on a loopback port; tenant and member factory; HTTP client per credential surface; Secrets Manager and Parameter Store on MiniStack when given one. Private. |
| Init as a CLI process                    | [init harness](../../apps/cli/scripts/init-e2e/harness.ts)                                                                                             | Sandboxed project and HOME, offline package, image run with its task definition. `test:init:e2e`.                                                                                                     |
| Recorded coding agent                    | [Claude Code stand-in](../../apps/cli/scripts/init-e2e/recorded-agent-cli.ts)                                                                          | `claude` on PATH that replays tool calls against the real init MCP server and logs every answer.                                                                                                      |

## Helpers worth building

Build each with its first real consumer, and share it across owners when a second consumer needs the same thing. Put
Console helpers in the private Console; a public helper never depends on it. No universal `test-utils` package, scenario
DSL or page object per click.

| Helper                 | Contract                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Console tenant fixture | Seed an organization, project and restricted identities; start the real UI and API; return a signed-in page and an API client. |
| Temporary project      | Copy reviewed fixture files into a fresh directory; return its root and expected outputs.                                      |
| Provider fixture       | Serve selected realistic responses over loopback, fail on unexpected requests, record deliveries, inject faults.               |
| Job observer           | Wait for one operation ID to reach its terminal state with a deadline; return the last state on timeout.                       |

The tenant fixture should make a Console feature test this short. This is a sketch, not an existing API:

```ts
test('a Developer resolves an issue and the change survives reload', async ({ tenant }) => {
  const issue = await tenant.seed.issue({ status: 'OPEN' });
  const { page, api } = await tenant.browserAs('developer');

  await page.goto(tenant.issueUrl(issue.id));
  await page.getByRole('button', { name: 'Resolve', exact: true }).click();
  await expect.poll(async () => (await api.issue(issue.id)).status).toBe('RESOLVED');
  await page.reload();
  await expect(page.getByText('Resolved', { exact: true })).toBeVisible();
});
```

## Rules every helper follows

- **Isolation.** Each scenario gets its own directory, database or namespaced rows, and identities. Names include run,
  worker and retry. A browser context isolates cookies, not database rows.
- **Cleanup.** Register each process, container and resource right after acquiring it; dispose in reverse order after
  failed setup as well as failed assertions.
- **Offline by default.** Give AWS clients synthetic credentials and owned loopback endpoints; reject other endpoints,
  disable metadata credential discovery, and do not pass the developer's credentials or profile to child processes.
  Provider fixtures reject unexpected requests. A child process that runs the CLI loads
  `apps/cli/scripts/network-guard-preload.ts` (`bun --preload`): environment variables alone do not keep an SDK local,
  because an endpoint set in code overrides them, and the guard fails such a request before transport.
- **One emulator.** MiniStack, through `@stacktape/ministack/fixture`, is the only AWS emulator. Give a scenario its own
  account from `account()` when several share a container; a 12-digit access key ID is how the emulator scopes state.
  Hand-written AWS fakes remain only for services it lacks (Cost Explorer, Budgets, CloudTrail, CloudWatch metrics and
  Logs Insights), for cross-account STS behavior, and for fault injection such as a stack stuck in a failed rollback.
- **Readiness.** Wait for a specific ready signal with a deadline, never a fixed sleep.
- **PostgreSQL.** Migrate once per run or worker, then give scenarios separate databases. Migration tests start from an
  empty or deliberately old schema. Use separate connections and barriers for concurrency tests.
- **Factories.** One factory per real need, such as a project with a restricted member. A factory may write directly to
  the database for setup; it must not replace the service or transaction under test.

Qualify a new helper through its first consumer: expected state observed, a legitimate failure detected, repeated and
concurrent runs independent, cleanup verified after a deliberate failure, and no route to live endpoints.

## Isolated Console application

```sh
pnpm --filter @stacktape/console-api-app test:db --isolated-browser
```

The runner owns a disposable PostgreSQL container. Each journey starts the real Fastify/tRPC API and Vite UI and
installs locally signed Cognito-shaped tokens where Amplify expects them. The issue journey runs two tenants
concurrently: each resolves an issue, checks the database and reloads; the other tenant is denied through the same
server. The deployment journey finds a project and stage and understands a failure with and without logs, including
after reload. Its AWS credential endpoint and CloudWatch responses are synthetic; the Console API remains real. Journey
files run in separate processes because their API environment and module graphs are process-wide. Only PostgreSQL's TLS
options are substituted; Prisma, token verification, authorization and the router are production code. It needs no AWS
credentials or reservation.

The Console's [UI review procedure](../../apps/console/e2e/README.md#agent-ui-review) combines these journeys with
visual and product critique and describes which findings should become repeatable browser assertions.

`STP_ISOLATED_BROWSER_FAIL_AFTER_START=1` forces a failure after startup to check teardown; the run must fail and still
report the container removed.

Local token issuance proves our verification and authorization, not Cognito's hosted login, refresh or federation. Keep
those, provider callbacks, AWS execution and deployed configuration in the shared-dev and live lanes.

## Init model qualification

Routine import tests use scripted provider processes and the real init MCP server. The Codex lane is
`pnpm --filter @stacktape/cli test:init:codex`; it requires no Docker, credentials or external network. The transport
and model-rubric contracts run in the fast `init-agent-rules` lane.

When changing the init prompt, model selection or vendor protocol, qualify the affected provider separately with the
small synthetic corpus in `apps/cli/src/init/eval/model-quality.ts`:

```sh
pnpm --filter @stacktape/cli test:init:model-quality --live --provider codex --model <model-id> --out .stacktape/init-model-quality.json
```

Use `--provider claude-code` for Claude. The installed provider CLI uses its existing sign-in, and each of the two cases
has a 90-second deadline with no retries. The explicit `--live` flag is required; a normal test command cannot spend
provider allowance. The release registry shows a Codex command, but qualification must name the model actually selected
for the candidate and cover each affected provider. No AWS calls or deployment occur.

The rubric requires an accepted, cited contribution beyond the scan, the expected resource and secret-reference wiring,
no invented dependencies, no unverified claims, no secret canary in raw provider output, no vendor shell/patch/web
actions and unchanged repository files. It scores facts and composition, never exact prose. Reports contain metadata,
prompt hashes, scan-only baseline scores and model scores; raw prompts and transcripts are not written. Compare a prior
report with `--compare <previous-report.json>` on the same corpus. Repeat an ambiguous failure explicitly and keep both
reports; do not turn repetition into automatic retries or discard a refusal as a passing scan result.

## Browser tests

Use Playwright Test with Chromium. Reuse the worker's browser, and give each test a fresh context.

- Use a small Vite gallery for shared UI and page-only states, rendering real components and CSS. Keep galleries out of
  production builds. For complete journeys, run the actual app and do not intercept its own API.
- Test what static markup cannot show: keyboard navigation, focus, disabled controls, input events, portals, editor
  diagnostics, persistence after reload. Use screenshot comparisons only where appearance is the contract.
- Locate by role, label or a stable ID. Wait for a specific visible or durable result, not a timeout or `networkidle`.
  Register popup and response listeners before the triggering action.
- Check each tRPC result: HTTP 207 batches can hold failed procedures.
- Start with two workers for isolated suites. Shared-dev suites stay serialized under the reservation.
- Keep offline projects separate from shared-dev projects in Playwright configuration, so a default command cannot use
  real credentials. Write output to a per-run directory.
- No local retries. In CI, at most one retry with `failOnFlakyTests: true`. Fix nondeterminism instead of adding
  retries.
- The runner starts its own server (`reuseExistingServer: false` in CI) and checks it serves the expected build and API.
- Keep traces and screenshots only for synthetic, non-sensitive fixtures.

The shared-UI lane: `pnpm --filter @stacktape/ui-react test:e2e`; `dev:e2e` opens the gallery for inspection. Add
scenarios under [`packages/ui-react/e2e`](../../packages/ui-react/e2e) with its `test` fixture. Check a new case with
`--repeat-each=3 --workers=1`, then with the default two workers.

The Console offline lane: `pnpm test:console:browser:offline` runs
[`playwright.offline.config.ts`](../../apps/console/ui/playwright.offline.config.ts). Its specs render real Console
pages and sign-in screens and answer their own API and Cognito requests; the browser refuses every other non-loopback
request. It needs no credentials or reservation. Signed-in specs run from the Console's other Playwright configurations,
each through its own package script; live, cost-bearing specs are only in `playwright.live*.config.ts`, so a bare
`playwright test` cannot start one.

## Authoring with agents

Explore the scenario with the browser tool already available, then save ordinary Playwright assertions that run without
a model. A recorded click sequence is a start; add independent setup and outcome assertions before calling it a test.
Use a task-owned browser session and close only that session. Playwright's generator can help draft tests, but its
healer may skip a failing test; never accept that as a repair.

## Credentials and failure output

Real Console credentials follow the [private browser procedure](../../apps/console/e2e/README.md#agent-browser-access):
credentials load inside the Playwright worker from SSM, never through Vite or shell arguments; authenticated traces,
screenshots and video are disabled; sessions are cached in worker memory only. Run
`pnpm --filter @stacktape/console-ui test:e2e:privacy` after changing browser settings or tools.

For failures, keep the scenario name, failing assertion and the last bounded process or job state. Log sanitized request
shapes and operation IDs only. Live runs also need the recovery state described in the
[live-AWS procedure](live-aws.md).
