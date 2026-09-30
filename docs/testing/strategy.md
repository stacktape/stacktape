# Stacktape testing strategy

Use [the short policy](../testing.md) for daily test selection. This document owns the target suite and the order in
which to improve it. [E2E implementation](e2e.md) describes fixtures and tooling. Recommendations below are a migration
plan, not a claim that the proposed runners or CI jobs already exist.

For a coordinated repository-wide rewrite, use the [initiative plan](initiative.md) and [behavior slices](slices.md).
They define bounded assignments, integration and independent review; ordinary changes need only the relevant
policy/procedure.

Configuration and synthesis scenarios should enter through command composition or provide the same explicit contexts:
the active normalization candidate, immutable stack/deployment context, built-in directive capabilities and artifact
packaging source. Import the synthesis workflow separately from its resource accumulator. Exercise repeated instances,
initialization failure/retry and cancellation through real services where those affect the outcome; do not restore a
class-name initialization flag on global CLI state. Console proxy scenarios can supply a real Lambda SDK client with a
loopback endpoint and synthetic credentials while retaining Prisma delegate behavior and the wire protocol.

## The intended balance

Optimize for useful failures caught per minute of development and maintenance. Prefer broad tests through real
cooperating modules, with a small number of complete customer journeys. Keep focused tests where they cheaply cover
important variations. There is no target unit/integration/E2E percentage and no repository-wide coverage quota.

Three kinds of behavior need different environments:

1. **Deterministic contracts:** pure rules, type consumers, schema generation, serialization, configuration synthesis.
   Run these directly with the existing Bun or Node runner.
2. **Local application behavior:** actual processes, browser interactions, database transactions, built archives and SDK
   calls. Run real application code against isolated PostgreSQL, local runtimes and selected emulator operations.
3. **Externally owned behavior:** AWS authorization and deployment semantics, real event delivery, provider installation
   and permissions, runtime infrastructure. Keep small guarded live scenarios for these promises.

These environments complement each other. A local request/response fake can reproduce a timeout reliably; it cannot
establish a provider's permissions. MiniStack can verify our S3 upload workflow; a successful local stack update cannot
establish CloudFormation replacement or rollback behavior. AWS itself recommends testing at natural subsystem boundaries
and supplementing selective emulation with cloud tests.
[AWS testing guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/serverless-application-testing/best-practices.html).

Do not turn E2E preference into one enormous test that signs in, provisions an account and deploys infrastructure for
every assertion. Give each scenario an independent starting state and one coherent outcome, including the failure or
retry that matters. Setup can seed prerequisites through supported APIs or fixture data; the action being tested must
use the real product path.

## What the current suite tells us

The repository has useful tests worth preserving. The naming compatibility cases protect resource identity. Synthesis
contracts traverse real configuration. Packaging tests build and execute artifacts. The extension smoke talks to a
compiled language server over JSON-RPC. Console has real PostgreSQL suites and incident-run fixtures that verify locally
signed tokens through the real authorization middleware. The incident-agent runtime lane already starts the production
HTTP router for its runner client; reuse that bootstrap for a general browser/API fixture.

The main shortcomings are coverage and composition, not the choice of assertion library:

- Root `test` delegates to package scripts. Many meaningful Docker, browser and feature database scenarios are separate
  commands. Public CI runs the public gate and `cfn-lint`; private CI adds migration adoption and browser privacy
  qualification. Neither is a general customer-journey suite.
- CLI `test:src` already discovers source tests that some later scripts name again, including MCP documentation,
  directives and Docker-secret tests. There are also cross-package invocations such as the authoring suite. Remove
  duplicate execution after checking runner options and isolation, rather than deleting the underlying coverage.
- Console browser projects share a single-worker configuration. Many feature scenarios repeatedly sign in or depend on
  manually prepared deployed stacks. Useful component/page scenarios exist, but are not the same as complete API flows.
- Console's default `test:db` runs migration adoption. Feature database suites require flags. Its default image is
  `postgres:16`, while the configured RDS version is `15.14`; align the tested major version before relying on it as
  production-database compatibility coverage.
- Several shared UI tests render static HTML. They can protect markup contracts, but cannot prove keyboard interaction,
  focus, event handling or portal behavior. The init wizard lacks a browser journey, and the website has no test script.
- The Console HTTP adapter test uses a small test router. It does not establish the production routers' authentication
  or database behavior. Conversely, direct `createCaller` integration tests do not exercise HTTP serialization.
- Some incident-agent runtime cases continue a shared run created by an earlier test. Keep the useful workflow, but
  represent it as one scenario with steps, or give independently selected tests their own starting state.

These observations identify where to look first. File counts, `mock.module` usage and source reads are review hints, not
a verdict on an individual test. A filesystem test may legitimately inspect a generated artifact; a policy lint may
legitimately inspect source. Read its assertions and name the real failure it catches.

## Console: isolated services or shared dev?

Use both, with isolated services as the eventual default for application regressions. Shared dev is valuable for
external compatibility and remains the current full-application environment while the isolated harness is built.

| Consideration    | Isolated local/CI services                                                                                                   | Shared dev with local UI/API or deployed dev code                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| What it proves   | Our actual HTTP, authorization, business logic, SQL and browser behavior against controlled dependencies.                    | Integration with real Cognito, RDS configuration, AWS permissions, provider installations and delivered events.                    |
| Repeatability    | Fresh data, known identities and controlled errors; independent workers can run concurrently.                                | Persistent data and external services can drift; mutations and revision-sensitive checks need the reservation.                     |
| Feedback cost    | Startup, migrations and builds can be amortized within a run. No AWS credentials or tunnel for routine cases.                | Account/login checks, SSM tunnel and fixture readiness add setup; deployment is needed for changed callbacks/workers.              |
| Engineering cost | Requires a narrow startup/configuration seam, identity fixture and maintained provider contracts. Poor fakes can hide drift. | Reuses the existing application environment, but scenarios still need owned data, cleanup and stable deployed revisions.           |
| Blind spots      | Local PostgreSQL is not RDS networking/TLS; local token issuance is not hosted login; emulated delivery is not AWS delivery. | A local API can coexist with older deployed workers. One happy path is weak coverage of races, denied access and service failures. |
| Best use         | Routine PR regressions, authorization matrices, transactions, retries, parallel UI/API journeys and agent development.       | Changed external contracts, selected complete customer journeys, migration adoption in dev and scheduled drift checks.             |

Do not build a replica of the entire AWS deployment to get isolation. Start with the actual Console HTTP server,
PostgreSQL and locally issued credentials verified by the production authentication code. Add a provider fixture or
MiniStack service only when a scenario needs it. For async flows, invoke the real consumer with a realistic event;
assert durable effects and qualify actual transport separately. Keep real Cognito/provider/AWS checks small and
explicit.

There is upfront work in providing synthetic UI sessions and isolating database configuration at startup. That
investment is worthwhile for repeated feature testing and parallel agents; it would not be justified merely to replace
one infrequent provider check. Extend the existing database/token fixtures before introducing another runtime framework.
Do not create a full shared-dev Console deployment per agent or weaken the current reservation guard.

Move a feature's routine checks to isolation after its first browser → HTTP → database scenario proves persistence,
denied cross-tenant access, independent concurrent runs and cleanup after failure. Keep a corresponding external check
where the feature depends on externally owned behavior. Measure both environments' startup and execution separately;
shared-dev latency has not been benchmarked as part of this strategy, so no numerical speedup is assumed.

## Coverage by owner

This is the target coverage, not a demand to create one suite per row. A consumer journey may cover several owners. Keep
public runners independent of the private Console.

| Owner                                         | Primary protection                                                                                                                          | Additional boundary only when relevant                                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/config`, `packages/cloudformation`  | Compile positive and negative public type consumers; deterministic generation checks; runtime schema accepts/rejects representative inputs. | Real CLI synthesis and `cfn-lint`; live AWS for interpretation that validation cannot establish.                                                                    |
| `packages/config-authoring`                   | YAML/TypeScript authored input through loading, transformation and synthesis; assert semantic equivalence and useful invalid-input errors.  | Published declarations/import paths tested by a real installed consumer.                                                                                            |
| `packages/config-inference`                   | Small repositories through probe → facts → verification → composition; include uncertain evidence, monorepos and existing infrastructure.   | CLI/wizard import journey; a curated real-project corpus for ecosystem compatibility. Preserve focused trust-boundary tests.                                        |
| `packages/naming`                             | Exact stable logical IDs, hashes and physical names; boundary-length and collision behavior where promised.                                 | Verify their use in representative templates. Do not replace subsecond identity checks with deployments.                                                            |
| `packages/pricing`                            | Pinned catalog input through parsing and cost calculation, including units, absent prices and region differences.                           | Controlled upstream refresh/format compatibility check; no live pricing API on ordinary test runs.                                                                  |
| `packages/stack-info`, `packages/console-api` | Real serialized producer output accepted by the consumer; compile public consumers; preserve redaction and protocol versions.               | CLI/API wire journey and installed-package checks. Source export lint cannot prove runtime authorization.                                                           |
| `packages/analytics`                          | Event construction, opt-out and redaction; real adapter against a local collector.                                                          | One browser/server consumer path when initialization or transport changes. Never emit test traffic to production analytics.                                         |
| `packages/design-tokens`                      | Generated CSS and TypeScript agree; real consumer build.                                                                                    | Targeted visual checks in consumers for deliberate theme/layout changes; avoid tests freezing every decorative value.                                               |
| `packages/ui-react`                           | Browser interaction in a small real-component gallery: keyboard, focus, disabled/loading controls, dialogs/portals, editor behavior.        | A consumer journey for routing, styling or integration assumptions; retain focused document/scene algorithms where valuable.                                        |
| `packages/packaging`                          | Real fixture projects → built artifact → execution in the promised runtime; shared/native layers and relevant rebuilds.                     | Curated framework/dependency matrix, native architecture and live service limits. Preserve archive permission/path protections.                                     |
| `apps/cli` commands and init                  | Child-process CLI with isolated files/state, real parsing and exit behavior; init writes a configuration the CLI can load and synthesize.   | CLI → Console HTTP contract; PTY for prompts/signals; live lifecycle when AWS decides the outcome.                                                                  |
| CLI helper Lambdas                            | Build the deployed ZIP/layers and invoke it in the appropriate Lambda runtime with actual event shapes.                                     | Deployed IAM, API Gateway payload configuration, delivery and custom-resource lifecycle.                                                                            |
| CLI release/installers/MCP                    | Install the produced package/binary; invoke commands and the MCP protocol as clients do.                                                    | Supported OS/libc/architecture and upgrade/checksum paths. An imported handler does not prove the shipped executable.                                               |
| `apps/init-ui`                                | CLI starts the embedded wizard; browser changes decisions, handles an invalid/uncertain case and writes a usable config.                    | Agent/model inference quality separately; a live deployment only when provisioning is the changed promise.                                                          |
| `apps/console/api`                            | Real services/router + migrated PostgreSQL; scoped queries, authorization, transactions, deduplication and retry effects.                   | Real HTTP for wire behavior; worker/queue path for asynchronous changes; small Cognito/provider/AWS live checks.                                                    |
| `apps/console/ui`                             | Browser → real local API → isolated database for important flows; browser-only fixtures for UI states independent of backend behavior.      | Real identity/provider callback and deployed configuration. Shared dev remains the current full-application environment until isolation is implemented.             |
| `apps/console/bitbucket-forge`                | Built assets served under the real resource-path shape, interacting through the actual bridge client with a host fixture.                   | Installed Forge app, workspace permissions, pairing and delivered events.                                                                                           |
| `apps/docs`                                   | Build and validate generated routes, links, code/type examples and content contracts.                                                       | Browser exercises search, navigation and interactive examples; no unit test for every prose page.                                                                   |
| `apps/website`                                | Built-site route/link check and a few browser journeys for navigation and meaningful conversion controls.                                   | Targeted responsive/visual checks; external destinations or forms at their explicit boundary.                                                                       |
| `apps/vscode-extension`                       | Keep compiled LSP process tests for diagnostics, completion and references.                                                                 | Add extension-host activation, CodeLens/command and schema selection checks using `@vscode/test-electron`; avoid desktop clicks for ordinary language-server cases. |
| Workspace/build/release tooling               | Exercise subprocess, workspace, generated-output and artifact contracts.                                                                    | Keep architectural/privacy policy lints clearly named; do not count them as customer-feature coverage.                                                              |

VS Code's supported extension-host tooling supplies the environment the language-server smoke cannot cover.
[Extension testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension).

## Customer workload and artifact coverage

The workspace matrix is only half of Stacktape's surface: customers also rely on different languages, packagers and
deployment shapes. Keep their fixtures in the existing packaging and
[project qualification](../project-qualification.md) lanes. The
[artifact procedures](../../apps/cli/scripts/packaging-archives/README.md) own commands and detailed cases.

| Workload or packaging path                                           | Representative scenario and meaningful assertions                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node/TypeScript Lambda, single and split                             | Build and invoke the artifact with its layers in the promised Lambda runtime. Cover ESM/CJS resolution, dynamic imports/assets, native dependencies, runtime-provided SDK policy and useful source maps where those paths change.                                                                                                                                             |
| Lambda language buildpacks (Python, Go, Java, .NET, Ruby, Rust)      | Build a small real project for each supported Lambda path. Exercise language-specific dependency resolution and workspace roots: Python lockfiles/native wheels, Go workspaces, Maven/Gradle modules, .NET references, Ruby gems and Rust through cargo-lambda. Execute the output and observe a dependency/resource value.                                                   |
| Custom Lambda artifacts and helper ZIPs                              | Extract the shipped ZIP and invoke its actual entrypoint as the runtime user. Preserve permissions, links/path containment, sizes, event shapes and custom-resource responses. A successful host-language import is weaker than a Lambda invocation.                                                                                                                          |
| Container images: `js-bundle`, Railpack `buildpack` and `dockerfile` | Build the actual image; run its configured entrypoint, observe a response/job result, and stop it. Cover context selection, architecture, native ABI and secret/cache behavior where relevant. For `buildpack`, cover the languages customers use, including PHP with Composer, which has no Lambda path. Generated Dockerfile text or a Railpack plan alone is insufficient. |
| Static hosting                                                       | Build the real site, serve the output, check deep links and referenced assets. A small live scenario owns object metadata, CloudFront routing/cache invalidation and HTTPS behavior.                                                                                                                                                                                          |
| Next.js and SSR frameworks                                           | Exercise each distinct adapter: Next.js/OpenNext, Astro, SvelteKit, Nuxt, SolidStart and TanStack. Build then invoke the server artifact; check a dynamic route, assets and relevant cookies/redirects/images/base paths. Shared wrapper tests cannot establish every upstream adapter's compatibility.                                                                       |
| Services, workers and batch jobs                                     | Reuse artifact tests for application execution; use local dependencies for database/queue effects. Keep selected live ALB health, ECS/Batch startup, secret injection, networking and termination checks for infrastructure behavior.                                                                                                                                         |

Select combinations by the failure they expose instead of running every language × version × manager × architecture. An
ordinary packaging change runs affected cases plus representative shared paths; broader CI/release qualification covers
every supported packaging family. Exercise default and boundary runtime versions when runtime support changes. Native
dependencies need the relevant architecture/libc combinations. An emulated arm64 build is useful feedback but does not
replace execution on a supported native platform before release.

For cache-sensitive paths, keep a small transition sequence: fresh build → unchanged input → changed source/dependency
or asset → removed file or permission-only change where relevant. Assert output behavior and which artifacts actually
change or upload. Include moving identical input to another directory to catch host-path-dependent hashes. Avoid
repeating every transition for every framework when the same shared code owns it.

Existing Docker smoke covers several language projects, and the web runtime lane covers Astro and SvelteKit. Some
language smoke cases execute in generic language images; that proves packaging/dependency behavior, not the Lambda
event/runtime contract. Extend coverage where that distinction matters. Keep pinned real-project builds for ecosystem
compatibility separate from small deterministic fixtures; upstream installations and image pulls need explicit setup,
version pins and caching. Follow the qualification procedure before executing downloaded project code.

## Cross-module journeys to own explicitly

Put the test at the nearest composition root and reuse lower-level fixtures. These are separate scenarios, not one long
prerequisite chain:

- **Import to runnable application:** temporary repository → current CLI → wizard decisions → persisted config →
  synthesis/package → representative runtime response. Use a deterministic agent/provider fixture for routine runs;
  model quality is a separate evaluation.
- **Configuration to deployment lifecycle:** authored config → public types/schema → resolver → template and package →
  create → meaningful update → unchanged update → delete. The local portions are broad regression coverage; a small
  real-AWS scenario owns actual lifecycle semantics. Add failed-update/rollback coverage when that path changes.
- **CLI to Console:** source CLI process → public serialized contract → actual HTTP router/auth → database → Console
  rendering. Verify project/stage/account routing and a restricted identity. UI tests need not redeploy a stack just to
  prepare an operation row.
- **Provider to workload:** authenticated webhook → durable event → queue/dispatcher → runner → terminal result and
  provider status. Locally drive real ingress/consumer code with controlled transport failures; live acceptance owns
  provider permission, AWS delivery and runner behavior. Observe the same operation ID through completion.
- **Operational signal to customer action:** actual ingestion → redacted stored issue/incident/finding → scoped API →
  browser action → persisted result. Repeated delivery must have the promised effect. A scheduled live canary separately
  checks the AWS detector and delivery path.

Authorization spans anonymous, API-key, AWS-identity, Console-session and, where present, run-token surfaces. Test
missing/invalid credentials, wrong project or organization, and role differences at the real middleware/data boundary.
Use separate identities, not a permanently privileged test user. Avoid multiplying every browser flow by every role:
prove the authorization matrix at the API boundary and representative denied/allowed UI behavior in the browser.

## Model-assisted features

Separate deterministic orchestration from model quality. Routine tests should drive the real parser, tool dispatcher,
file/permission boundaries and persistence with recorded synthetic provider responses. Include malformed output,
refusal, timeout, cancellation and retry where those affect the product. Do not pay for a live model merely to test a
JSON parser or an authorization decision.

For init inference and incident assessment, maintain a small, sanitized evaluation corpus of representative customer
cases. Define expected facts, unsafe actions that must never be accepted, and a rubric for useful output. Run the real
candidate model/prompt against that corpus when changing model behavior, comparing it with the previous version. Keep
model/version, cost and nondeterminism visible; repeat ambiguous cases rather than treating one fluent answer as a pass.
Do not assert exact prose or let a model grade whether its own safety-critical claim is true. For investigative output,
check selected claims against actual recorded reads; the existence of a citation is insufficient.

Keep ordinary regression tests independent of provider availability. An explicit model evaluation qualifies model
changes; deployed runtime/credential tests separately qualify the runner and funding path. Existing local incident-run
fixtures already demonstrate running genuine tooling against loopback providers, so reuse those before introducing an
evaluation framework.

## Fixtures are the main investment

Implement the narrow helpers in [the E2E guide](e2e.md#helper-design) before expanding the suite. The first deliverable
should make one useful scenario short: start services, create isolated data/identities, perform the action, observe its
result, clean up. Keep domain setup explicit and assertions visible in the test.

Reuse these current building blocks:

- CLI qualification's project/process handling and packaging's Lambda runtime helpers.
- Console's disposable-PostgreSQL runner and incident-agent database/token/loopback fixtures.
- Console's browser target verification and privacy qualification.
- The pinned MiniStack S3 acceptance runner.

Extract capabilities within their current owner first. Do not create a universal `test-utils` package, generic scenario
DSL or a page-object method for every click. Share across owners when a second real consumer demonstrates the same
contract. A public helper must never depend on private Console source.

**PostgreSQL:** migrate once per run/worker, then give independent scenarios isolated databases or namespaced data.
Match the production major version and extensions. Keep migration/adoption tests on an empty or deliberately old schema;
cloning a current schema would bypass the migration being tested. Transaction rollback is unsuitable when the
application uses separate HTTP/worker connections.

Testcontainers is a candidate for replacing repeated container lifecycle code, not a reason to replace a working runner.
Its PostgreSQL support includes snapshot/restore, but connections must close before resetting a database and parallel
tests must not restore the same database. Qualify Docker Desktop/WSL, loopback binding and interruption cleanup before
adoption. Do not enable persistent shared containers in CI.
[PostgreSQL support](https://node.testcontainers.org/modules/postgresql/),
[container reuse](https://node.testcontainers.org/features/containers/).

**AWS emulation:** MiniStack is the selected starting point for SDK/application integration. Pin the image and qualify
only the operations the test needs. Keep deliberate HTTP faults as small local fixtures where an emulator cannot
reproduce them reliably. MiniStack's documented gaps include signature validation, networking and configured
integrations that do not dispatch effects; its service list is not our coverage map.
[Limitations](https://ministack.org/docs/limitations).

## Tool choices

Keep existing Bun and Node tests where they fit the runtime. Keep **Playwright Test** for repeatable browser suites;
agent exploration and test execution are separate concerns.

| Tool                                                                                    | Decision for Stacktape                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Playwright Test](https://playwright.dev/docs/browser-contexts)                         | Default browser runner: fixtures, assertions, contexts, API requests, retries and sharding already fit our stack. Use it for public UI as well as Console.                                              |
| [Playwright CLI](https://playwright.dev/docs/getting-started-cli)                       | Preferred starting point for agent exploration/code generation in a Playwright project. It exposes concise commands and keeps snapshots in files. Use task-owned sessions.                              |
| [agent-browser](https://github.com/vercel-labs/agent-browser)                           | Useful optional exploration tool with compact snapshots and a native command/daemon interface. Evaluate authoring convenience on real flows; it does not replace our assertions, fixtures or CI runner. |
| [Playwright MCP](https://playwright.dev/docs/getting-started-mcp)                       | Use when the active agent environment benefits from its persistent browser integration. No need to install it alongside a working browser tool for every task.                                          |
| [Playwright planner/generator/healer](https://playwright.dev/docs/test-agents)          | Optional assistance during authoring. Review the generated test. Never let a healer skip a broken feature, weaken an assertion or approve a changed baseline to obtain green CI.                        |
| [Vitest Browser Mode](https://vitest.dev/guide/browser/component-testing)               | Credible browser-component alternative, but adding another runner is not currently justified. Start with a small Vite gallery and the existing Playwright runner.                                       |
| [Cypress](https://docs.cypress.io/app/references/trade-offs)                            | No migration: an additional framework brings no demonstrated gain here, and its multi-browser constraints complicate our identity/provider scenarios.                                                   |
| [Stagehand / model-driven browser execution](https://github.com/browserbase/stagehand)  | Useful for exploratory automation on changing external pages. Keep model decisions out of ordinary regression execution; own-product locators and assertions can be deterministic.                      |
| [Lightpanda / non-rendering browser substitutes](https://lightpanda.io/docs/quickstart) | Do not use as proof of our UI's layout, focus or rendering in supported browsers. Faster extraction is a different requirement.                                                                         |

Use the capabilities of the installed version. Console currently pins Playwright `1.62.1`; current upstream component
examples describe a newer gallery/mount API. Plain Playwright navigation to a Vite fixture page works without adopting
an experimental component package or upgrading the suite. Agent CLI packages can also depend on a different Playwright
version; keep their installation separate from the test runner.
[Component testing](https://playwright.dev/docs/test-components).

## Fast feedback and CI

Optimize for fast focused checks while editing and broader coverage before merge. Improve setup and selection before
changing frameworks. Useful initial local targets are under 10 seconds for a focused contract/service scenario and under
a minute for an already-built local customer journey; validate them per lane. Track cold setup separately. Do not impose
one time limit on all PR checks or weaken assertions to meet these targets. Measure CI first, then shorten its critical
path through reuse and independent jobs.

| When                                    | Target work                                                                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| During editing                          | Selected scenario; reuse the built app/container within the owned run, reset mutable state.                                                                                                                   |
| Public PR                               | Full cheap contract/static/type/generated checks and a stable core of public customer journeys; affected broader browser, runtime and project-corpus jobs. No Console checkout or credentials.                |
| Private/integrated PR                   | Pin both repository revisions; add real feature database suites and a stable core of isolated Console browser/API journeys as they become available, plus affected broader cases. Keep privacy qualification. |
| Relevant infrastructure/provider change | Explicit guarded live scenario for the affected AWS/provider promise before declaring it verified. Scheduled tests do not substitute for testing the change.                                                  |
| Scheduled/main                          | Broader project/framework corpus, cross-browser checks, controlled provider/cloud canaries and drift checks.                                                                                                  |
| Release                                 | Validate the actual candidate artifacts on supported OS/libc/architectures, installers and runtime acceptance. Preserve current release checks until replacement coverage exists.                             |

Until those jobs are implemented, existing root gates remain required. Do not silently remove full checks while only the
selection logic has changed.

Use the package dependency graph **and explicit cross-module journey ownership** for selection. Changes to a public
schema, shared UI, generator, fixture or auth helper must select their consumers. Changed-test-file selection alone is
insufficient. Unknown paths and changes to the selector itself require the broader suite. Verify selection against full
runs before making it a gate. `test:plan` currently matches paths; it is not this future selection system.

Build each artifact once per input revision and reuse it across tests. Parallelize independent jobs within CPU/memory
limits; do not run multiple generators against the same files. Start with two isolated browser/database workers and
increase only after measuring. Shard only when the remaining runtime justifies another environment startup. Keep
shared-dev writes serialized under the reservation.

Cache deterministic builds and tests only when their complete inputs are tracked: public/private revisions, fixtures,
lockfiles, generated inputs, tool/runtime/image versions and relevant non-secret environment selectors. Do not cache a
live test result as if its remote state were immutable. Remote caching is currently disabled; configure trust and input
correctness before enabling it. Turbo documents both file and environment dependencies.
[Caching](https://turborepo.dev/docs/crafting-your-repository/caching),
[environment inputs](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables).

Watch runtime, flaky-first-attempt failures, setup cost, missed regressions and maintenance churn. Treat retries as
diagnosis, not a way to hide instability. Avoid quotas for test count, coverage percentage or mutation score.

## Replacing the existing tests

Migrate by feature, preserving a working suite throughout. Do not delete all unit tests or migrate every test to a
browser. For each candidate, decide:

| Decision             | Reason                                                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep                 | It catches a meaningful, distinct failure at low cost: naming stability, schema compatibility, calculations, redaction or a proven regression.                    |
| Improve/merge        | It asserts useful behavior but duplicates another scenario, has expensive setup, or mocks the very dependency whose behavior matters.                             |
| Replace, then remove | It only checks static UI markup for interactive behavior, inspects source strings for runtime promises, or validates internal call sequences instead of outcomes. |
| Remove               | Its asserted behavior is obsolete, supplied by the type/build/lint gate, or fully covered by a clearer existing test with no lost failure case.                   |

Establish the replacement before deleting unique protection. For risky replacements, check a known historical bug or
introduce a small local mutation such as removing an authorization check, dropping a transaction or ignoring a changed
layer; the proposed test should fail. Do this in an isolated checkout/copy and restore it. Do not require a mutation
campaign for every simple test. Stryker automates mutation analysis, but start with a small pure module and a compatible
runner before considering repository-wide tooling. Property-based tests are similarly selective: use them for a clear
invariant such as serialization round-trips, bounded names or redaction, with replayable failures.
[Mutation testing](https://stryker-mutator.io/docs/), [fast-check](https://fast-check.dev/docs/introduction/).

Implementation order:

1. **Make current coverage discoverable.** Map commands to actual scenarios; remove duplicate CLI execution; expose
   existing feature DB/browser/artifact lanes in appropriate CI jobs. Align the PostgreSQL major version. Keep startup,
   execution and cleanup timings available from normal runner output.
2. **Build one isolated Console journey.** Reuse the current signed-token/PostgreSQL and real HTTP fixtures; add the
   browser. Prove persistence and wrong-project/organization denial without dev credentials. This is the prerequisite
   for parallel Console regression tests, not a new shared-dev deployment model.
3. **Cover public interactive products.** Add the init CLI/wizard journey, shared UI keyboard/focus scenarios, and built
   docs/website smoke flows. Add the extension-host scenario beside the existing LSP smoke.
4. **Consolidate integration fixtures.** Generalize the demonstrated database, process, identity and MiniStack needs;
   migrate the most heavily mocked business workflows first. Keep a small real provider/cloud compatibility suite.
5. **Retire redundant tests and tune CI.** Remove superseded checks feature by feature; validate consumer selection,
   parallelism and caching against full runs. Preserve release artifact and production-semantic coverage.

A stage is useful when a new feature can reuse its runner with a short scenario and an independent fixture, the tests
fail for the intended defect, and reruns leave clean state. There is no value in a large framework whose first useful
customer test still needs extensive setup code.
