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

| Capability                               | Where                                                                                                                                                  | Notes                                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Run a child process                      | [qualification process](../../apps/cli/scripts/qualification/process.ts)                                                                               | Deadlines, output tail and redaction. The most complete of three.                                                       |
|                                          | [workspace child process](../../scripts/workspace/child-process.ts), `run` in [packaging E2E helpers](../../packages/packaging/scripts/e2e-helpers.ts) | **Duplicate.**                                                                                                          |
| Invoke an artifact in the Lambda runtime | [CLI Lambda runtime](../../apps/cli/scripts/packaging-archives/lambda-runtime.ts)                                                                      | Extracts ZIPs, runs as the Lambda user, removes containers.                                                             |
|                                          | `invokeInLambdaImage` in [packaging E2E helpers](../../packages/packaging/scripts/e2e-helpers.ts)                                                      | **Duplicate.**                                                                                                          |
| Synthesize a config without AWS          | [synthesis fixture](../../apps/cli/tests/characterization/synthesis-fixture.ts)                                                                        | Real synthesis behind a credential-less boundary.                                                                       |
| Real projects                            | [Project qualification](../project-qualification.md)                                                                                                   | Pinned corpus and starters; import, package and runtime lanes.                                                          |
| AWS SDK against MiniStack                | [layer upload acceptance](../../apps/cli/scripts/packaging-archives/layer-upload-ministack-acceptance.ts)                                              | Pinned image, loopback endpoint, synthetic credentials. S3 only so far.                                                 |
| Shared UI in a browser                   | [gallery fixture](../../packages/ui-react/e2e/fixtures.ts)                                                                                             | Loopback Vite server per worker, external traffic rejected, fresh context per test.                                     |
| Disposable PostgreSQL                    | [database runner](../../apps/console/api/scripts/run-db-integration.ts)                                                                                | Pinned 15.14, real migrations, verified container removal. Private.                                                     |
| Console identities and providers         | [incident-agent fixtures](../../apps/console/api/scripts/incident-agent-fixtures.ts)                                                                   | Locally signed tokens, loopback server, AWS/GitHub/model fakes, fixture Git repositories. Private.                      |
| Isolated Console application             | [isolated Console test](../../apps/console/ui/e2e/isolated-console.test.ts)                                                                            | UI, API and database for two tenants. Its startup and session code is still inline ([F5](overhaul.md#foundation-work)). |
| Shared-dev Console sign-in               | [browser fixtures](../../apps/console/ui/e2e/fixtures.ts)                                                                                              | Real dev Cognito login, cached per worker. Needs the reservation.                                                       |
| Live AWS scenario                        | [real-AWS scripts](../../apps/cli/scripts/real-aws/README.md)                                                                                          | Account check, owned names, recovery state, verified cleanup.                                                           |

## Helpers worth building

Build each with its first real consumer, and share it across owners when a second consumer needs the same thing. Put
Console helpers in the private Console; a public helper never depends on it. No universal `test-utils` package, scenario
DSL or page object per click.

| Helper                    | Contract                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Console tenant fixture    | Seed an organization, project and restricted identities; start the real UI and API; return a signed-in page and an API client.        |
| Change-plan compatibility | Given a baseline template, synthesize the current one, compute the product's change plan, and report destroyed or replaced resources. |
| Temporary project         | Copy reviewed fixture files into a fresh directory; return its root and expected outputs.                                             |
| Provider fixture          | Serve selected realistic responses over loopback, fail on unexpected requests, record deliveries, inject faults.                      |
| Job observer              | Wait for one operation ID to reach its terminal state with a deadline; return the last state on timeout.                              |

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
  Provider fixtures reject unexpected requests.
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

The runner owns a disposable PostgreSQL container. The test starts the real Fastify/tRPC API and Vite UI, installs
locally signed Cognito-shaped tokens where Amplify expects them, and runs two tenants concurrently. Each resolves an
issue in the browser, checks the database, reloads and checks again; the other tenant is denied through the same server.
Only PostgreSQL's TLS options are substituted; Prisma, token verification, authorization and the router are production
code. It needs no AWS credentials or reservation.

`STP_ISOLATED_BROWSER_FAIL_AFTER_START=1` forces a failure after startup to check teardown; the run must fail and still
report the container removed.

Local token issuance proves our verification and authorization, not Cognito's hosted login, refresh or federation. Keep
those, provider callbacks, AWS execution and deployed configuration in the shared-dev and live lanes.

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
