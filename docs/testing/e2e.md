# Building fast, repeatable E2E tests

Use [the short policy](../testing.md) to choose what to test and [the strategy](strategy.md) for suite ownership. This
guide describes the helper contracts to build and the browser conventions to use. Proposed fixtures below are not
installed APIs. Existing commands remain in the owning app/package manifest and [Console](console.md),
[packaging](../../apps/cli/scripts/packaging-archives/README.md) and [live-AWS](live-aws.md) procedures.

## Start with one behavior

State what the customer can do, the durable result, and the realistic failure that would invalidate the feature. Then
choose the cheapest real environment that can observe those things. A test's name should describe that promise.

Use real production code between the scenario's entry and assertion. Substitute only dependencies outside the boundary
being tested: an external provider's HTTP response, for example. A browser fixture that substitutes an API is useful for
UI interaction, but must be named as UI coverage. A direct router call can cover business authorization and persistence,
but needs a separate HTTP path when headers, batching or serialization change.

Prepare unrelated prerequisites through a data factory or API. Do not create an organization through the UI before every
settings test. Conversely, when organization creation is the feature, seed only its prerequisites and perform creation
through the real UI. Assert the result independently of the setup helper; comparing output to a helper that reimplements
the same algorithm can preserve the same bug twice.

## Helper design

Prefer typed fixtures with explicit lifetime over a new framework. Put Console helpers in the private Console and public
capability helpers beside their runners. Extract across owners only when there are two real consumers.

| Helper            | Contract                                                                                                                         | Lifetime and isolation                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Temporary project | Materialize a small project from reviewed fixture files; return its root and expected observable outputs.                        | Fresh writable directory per scenario; immutable source fixtures can be shared.                                          |
| CLI/process       | Spawn the current executable with argv, cwd and an explicit environment; return exit/output; support readiness and cancellation. | Test-owned child tree and deadline; stop children on failure/signals. Separate PTY cases from ordinary commands.         |
| PostgreSQL        | Start the pinned engine, apply real migrations, provide a real client, allocate isolated data.                                   | Container per run or worker; database per worker/test where needed. Close pools before dropping/restoring.               |
| Identity          | Create the relevant user, memberships and project access; issue test credentials accepted by the real verifier.                  | No shared privileged identity across mutating scenarios. Keep credentials inside the fixture.                            |
| Application       | Start the actual HTTP adapter/router and UI against the owned services; expose URLs and readiness.                               | Worker-scoped only after backend state isolation; refuse an unrelated existing server.                                   |
| AWS emulator      | Start pinned MiniStack and expose loopback endpoints, synthetic credentials and supported resource setup.                        | Own container per run/worker, or proven namespace isolation. Never globally reset an instance other tests share.         |
| Provider fixture  | Serve selected realistic responses/events over loopback; expose controllable faults and observable deliveries.                   | Fail on unexpected operations; preserve protocol parsing and real client behavior. No giant fake of the entire provider. |
| Job observer      | Wait for a specific operation's promised terminal state with a bounded deadline.                                                 | Correlate by ID; return useful last state on timeout. Acceptance of a request is not completion.                         |
| Cleanup           | Track exact owned processes/resources and dispose them in reverse dependency order.                                              | Register immediately after acquisition; cleanup runs on failed setup as well as failed assertions.                       |

Reuse the existing [qualification process helpers](../../apps/cli/scripts/qualification/process.ts),
[Lambda runtime helper](../../apps/cli/scripts/packaging-archives/lambda-runtime.ts),
[database runner](../../apps/console/api/scripts/run-db-integration.ts) and
[incident-agent fixtures](../../apps/console/api/scripts/incident-agent-fixtures.ts) before copying their mechanisms.
The Console links require the private submodule. Do not make public tests depend on their presence.

Keep one domain factory for a real need, such as a project with a restricted member. Avoid a generic builder that makes
it easy to create impossible database states. A factory may use direct Prisma writes for setup; it must not replace the
service or transaction being tested. Use separate connections for concurrency tests and barriers to trigger a race
intentionally, instead of hoping that two arbitrary sleeps overlap.

Resource names and file paths must distinguish run, shard, worker and retry where applicable. A browser context isolates
cookies; it does not isolate database rows. Sharing a read-only baseline is safe; sharing a mutable organization or
restoring one database while another worker uses it is not. Start simple before optimizing fixture creation.

Offline fixtures must enforce their boundary. Give AWS clients explicit synthetic credentials and owned loopback
endpoints; reject other endpoints before sending a request, disable metadata credential discovery, and avoid inheriting
the developer's credentials/profile into child processes. Synthetic credentials alone do not stop network traffic.
Provider fixtures should reject unexpected requests. Keep dependency installation and image pulls as explicit setup,
separate from the scenario's allowed service traffic.

## Isolated Console application

The first isolated browser journey is available through the private Console database runner. It uses a disposable
PostgreSQL container, the real Console UI and Fastify router, and locally signed Cognito-shaped tokens. It does not
replace shared dev for hosted sign-in, callbacks, AWS execution or deployed configuration.

```sh
pnpm --filter @stacktape/console-api-app test:db --isolated-browser
```

The runner owns PostgreSQL and verifies container removal. The test owns a scratch database, API server, Vite process
and browser; it disposes each after success or failure. Two independently seeded tenant journeys run concurrently. Each
resolves an issue through the UI, checks the database, reloads, and checks the persisted state. A second signed identity
is denied through the same HTTP server both before and after its own organization membership check. The local session
fixture writes Amplify's token keys before page startup, and an assertion checks that the UI sends the accepted bearer
token. Only the test startup substitutes PostgreSQL's TLS connection options; Prisma, token verification, authorization
and the production router remain real. The lane has no shared-dev reservation or AWS credential requirement.

Run the command twice to check repeatability. `STP_ISOLATED_BROWSER_FAIL_AFTER_START=1` triggers a deliberate failure
after all services start, for checking teardown; that invocation must fail while still reporting removal of its owned
database container. The fixture currently tests one issue flow. Extend it only for cases that need a
browser/API/database boundary; keep provider and hosted identity qualifications in their existing lanes.

When extending this pilot:

1. Reuse the real migrated PostgreSQL and locally signed-token setup already demonstrated by the incident-agent tests.
   The normal verifier must still check signatures, token use, issuer, audience and expiry. Local issuance qualifies our
   verification and authorization logic, not Cognito's hosted login or federation.
2. Reuse the production-router HTTP bootstrap in
   [incident-agent runtime tests](../../apps/console/api/scripts/incident-agent-runtime.test.ts). Keep the real router
   and token verifier. Do not add an auth bypass, test-only public endpoint, mutable global table of mocked services or
   a second implementation of permission checks.
3. Start the real UI against that API. Seed an organization, project and restricted identities. The UI uses Amplify's
   Cognito token storage, `fetchAuthSession` for bearer headers, and its own stored email for initial UI state. First
   session fixture uses newly issued synthetic ID/access tokens and the configured test pool/client. Verify the actual
   client sends an accepted request after reload without reaching Cognito. Keep storage details inside one helper and
   check it when upgrading Amplify. If a narrow identity adapter is needed, wire it only into the isolated app startup.
   Expiry/refresh and hosted sign-in/sign-out need separate scenarios; Amplify may refresh expired tokens over the
   network. [Amplify session behavior](https://docs.amplify.aws/javascript/frontend/auth/manage-user-sessions/).
4. Keep the issue flow's state change, database read and persistence after browser reload. A second identity from
   another project/organization must be denied through the same server.
5. Run two independent scenarios concurrently and repeat them from clean state. Verify all child processes, containers
   and data are disposed, including after an intentionally failed assertion. Only then expand parallel coverage.

Most Console regressions should eventually use this environment. Keep shared dev for hosted identity, external
callbacks, AWS execution and deployed configuration. A fixture using MiniStack or local JWKS is not a reason to stop
checking the real external integration when it changes.

## Browser tests

Use Playwright Test and real Chromium for the default loop. Reuse the worker's browser but let each test have a fresh
context/page. Playwright already supplies this cheaply; retaining one mutable page across tests sacrifices isolation for
little benefit. Start two workers for isolated suites, then measure. Shared-dev mutation suites remain serialized.
[Browser contexts](https://playwright.dev/docs/browser-contexts),
[worker fixtures](https://playwright.dev/docs/test-fixtures).

Use a small Vite page/gallery for shared UI and page-only cases. Render production components with real CSS, routing
providers where needed, and explicit fixture data. This lets agents inspect exactly the state a test uses. Keep
galleries out of production artifacts. For complete journeys, run the actual app; avoid replacing its entrypoint or
intercepting its own API. Existing Console page fixtures are examples of the first category, not the second.

The public shared-control gallery is available now: `pnpm --filter @stacktape/ui-react test:e2e` runs Chromium against
real components and CSS; `pnpm --filter @stacktape/ui-react dev:e2e` opens the same synthetic gallery for inspection.
Add scenarios under [`packages/ui-react/e2e`](../../packages/ui-react/e2e), importing its `test` fixture. It owns a
loopback Vite server and temporary cache per worker, fresh contexts per test and external-traffic rejection. It does not
need Console or AWS. Use `--repeat-each=3 --workers=1` to check repeatability, then the default two workers to check
independent execution. Public CI runs this lane on Linux and retains synthetic failure artifacts for seven days. The
normal public gate does not require an installed browser.

Test behavior that static markup cannot establish: keyboard navigation, focus after opening/closing, disabled controls,
actual input/change events, portals, editor diagnostics and persistence. Use a small number of screenshot comparisons
only where appearance is the contract. Stabilize fonts, viewport, time and animation; review visual baselines
deliberately. An accessibility scan can supplement keyboard and semantic assertions, not replace them.

Write direct assertions with `getByRole`, `getByLabel` and stable IDs where semantics are ambiguous. Avoid CSS class
chains, positional selectors and selectors copied from an agent's temporary snapshot reference. Wait for the specific
visible or durable result using Playwright assertions or bounded polling. Do not wait for arbitrary time or global
`networkidle` on an application that polls. Register popup/response listeners before the triggering action.
[Playwright best practices](https://playwright.dev/docs/best-practices).

Use API/database setup to avoid replaying unrelated browser steps. Keep one real login journey; other tests can reuse
worker-scoped authenticated state where allowed. For mutating shared environments, identities/data must be independent.
An API client's cookie jar is not automatically a Cognito bearer token: construct the authenticated client explicitly
and check individual tRPC results, including errors inside HTTP 207 batches.
[API setup/assertions](https://playwright.dev/docs/api-testing),
[authentication patterns](https://playwright.dev/docs/auth).

A future fixture should make a feature test look roughly like this. This is an API sketch, not a runnable command or an
existing `test` export:

```ts
// Planned fixture API: tenant owns isolated rows, identities and cleanup.
test('a Developer updates an issue and the change survives reload', async ({ tenant }) => {
  const issue = await tenant.seed.issue({ status: 'OPEN' });
  const { page, api } = await tenant.browserAs('developer');

  await page.goto(tenant.issueUrl(issue.id));
  await page.getByRole('button', { name: 'Resolve', exact: true }).click();
  await expect(page.getByText('Resolved', { exact: true })).toBeVisible();
  await expect.poll(async () => (await api.issue(issue.id)).status).toBe('RESOLVED');
  await page.reload();
  await expect(page.getByText('Resolved', { exact: true })).toBeVisible();
});
```

The helper owns setup and teardown, while the test owns the action and assertions. Authorization denial belongs in a
separate independent scenario using a second identity, not a follow-up test that relies on this one having run.

## Configuration and feedback speed

Separate offline/synthetic projects from shared-dev/live projects so a default browser command cannot accidentally use
real credentials or cloud state. Current Console configuration mixes project types; make that separation before widening
its default selection. Use dedicated output directories per owned run to prevent concurrent sessions overwriting
results.

For a synthetic local browser project, begin with:

- Chromium only, two workers once data is isolated, `forbidOnly` in CI, bounded test and assertion timeouts.
- No local retries. In CI, at most one diagnostic retry and `failOnFlakyTests: true` so first-attempt failures remain
  visible. Fix nondeterminism; do not gradually increase retries.
- A runner-owned server with `reuseExistingServer: false` in CI. For local reuse, first verify that the process belongs
  to this run and serves the expected build/API target. Existing Console target checks are worth retaining.
- Text output for the normal loop. Failure traces/screenshots only for synthetic, non-sensitive fixtures; no blanket
  tracing across credential-bearing projects.

The installed Playwright Test runner supports file/title selection, `--last-failed`, `--repeat-each`, `--shard` and
`--fail-on-flaky-tests`. Select a test directly while editing and repeat a new isolated case without retries before
claiming it stable. `--only-changed` is a convenience, not a dependency-aware proof that shared code changes are
covered. [Runner options](https://playwright.dev/docs/test-cli).

The existing Forge lane is a useful offline starting point:

```sh
pnpm --filter @stacktape/bitbucket-forge-app test:e2e
pnpm --filter @stacktape/bitbucket-forge-app exec playwright test --repeat-each=3 --retries=0
```

For shared-dev Console, use its guarded scripts and [reservation](console.md#shared-dev-reservation). Do not replace
those scripts with raw Playwright calls to evade their checks.

## Efficient authoring with agents

An agent should explore a specific scenario, inspect roles/labels and relevant network results, then save ordinary
TypeScript assertions that run without a model. Reuse the same fixture for exploration and automated execution. A
recorded click sequence is a starting point; add outcome assertions and independent setup before treating it as a test.

Start with the browser tool already available in the agent environment. When adding a tool deliberately, prefer
Playwright CLI for close integration with our runner; `agent-browser` is a useful alternative for compact interactive
inspection. Both can keep a task-owned browser session alive across commands. Read only the relevant portion of a page
snapshot, and batch actions whose intermediate state is already known. Use screenshots for visual questions, not as the
default output of every click. No tool's claimed token reduction establishes faster or better regression tests.

Use a unique session per task. Close that session in cleanup; never use global `close-all`/`kill-all` commands on a
shared machine. Keep tool installation/version separate from the application's Playwright dependency unless
intentionally upgrading both. Consult the [tool comparison](strategy.md#tool-choices) before adding another browser
framework.

Playwright's test agents can help plan or generate scenarios, but the generated code must follow our fixture and privacy
rules. Its documented healer can skip a test when it decides functionality is broken; that behavior is not an acceptable
repair policy here. Require the intended behavior to stay fixed while diagnosing failures.
[Test-agent behavior](https://playwright.dev/docs/test-agents).

## Credentials, failures and cleanup

For normal local tests, runner output and a concise result are sufficient. Do not create a custom report format or a
written plan for every scenario. Use standard failure artifacts when they help reproduce a bug.

Real Console credentials need the existing private browser procedure: SSM-backed worker-only loading, no secrets in
shell arguments or Vite, disabled authenticated traces/screenshots/video, and suppression of credential-bearing failure
snapshots. The current Console `signIn` fixture caches authenticated state in worker memory, separated by identity and
verified target, with fresh test contexts and a five-minute maximum seed age. Keep login/logout and revocation tests on
the fresh-login helper. Auth state files also contain secrets; do not save these Console sessions to disk. Loading
storage state does not make later HTTP traces safe: authenticated requests still carry tokens. Before changing these
settings or upgrading browser tools, run `pnpm --filter @stacktape/console-ui test:e2e:privacy`. A new agent CLI must be
qualified separately before giving it real credential-bearing flows; the runner's privacy test does not automatically
cover another tool. [Private browser procedure](../../apps/console/e2e/README.md#agent-browser-access).

For ordinary integration failures, keep the scenario name, failing assertion and bounded last process/job state. Log
only sanitized provider request shape and stable operation IDs. A retry that never reached the consumer is not a
successful duplicate-delivery test. Poll asynchronous outcomes with a deadline and follow pagination where applicable.

Always dispose owned local fixtures, including after failed setup. Live runs additionally need exact resource recovery
state and verified deletion under the [live-AWS procedure](live-aws.md). Those records exist to recover resources after
an interruption; they are not a general reporting requirement for every E2E test.
