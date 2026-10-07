# Testing strategy

The [short policy](../testing.md) covers daily test selection. This document describes the coverage we want for each
part of the product and why. The [overhaul plan](overhaul.md) orders the work, and [the E2E guide](e2e.md) covers
helpers and conventions.

## End-to-end first

Default to a scenario that drives the product the way a customer does and observes the outcome they care about:

- **CLI and packaging:** the current CLI process builds an artifact, and the artifact runs in its target runtime.
- **Init:** a real repository goes through init, and the written config synthesizes, packages and runs.
- **Console:** a browser action goes through the real HTTP API to PostgreSQL and survives a reload.
- **CLI and Console together:** a source CLI process reaches the real API, and the result appears in the Console.
- **AWS lifecycle:** a small guarded live scenario deploys, updates and deletes.

Most defects fixed in recent months were found this way: building the project corpus and starters, and live smoke runs.
Tests built around imagined inputs found few of them. Before writing tests for an area, read its fix history; those bugs
are the first failures to cover.

Add focused tests when a rule has many meaningful inputs or a compatibility promise: naming and logical IDs, pricing,
parsing, redaction, schema validation. Do not test every function, and do not repeat one assertion at every layer.

Do not turn E2E into one long test that signs in, provisions an account and deploys for every assertion. Each scenario
has its own starting state and one coherent outcome, including the failure that matters. Setup may seed data through
APIs or fixtures; the tested action uses the real product path.

## Three environments

| Environment                  | Use for                                                                                                            | Run with                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Deterministic, in process    | Pure rules, type consumers, schema generation, serialization, synthesis.                                           | Existing Bun or Node runners.                   |
| Local processes and services | CLI processes, built artifacts in Docker runtimes, browsers, PostgreSQL, selected AWS SDK calls against MiniStack. | Owned containers and processes, no credentials. |
| Externally owned behavior    | IAM, deployment and rollback semantics, networking, event delivery, provider installations, runner infrastructure. | Small guarded live scenarios.                   |

An emulator or fake proves our code's handling, not the external service's behavior. MiniStack can verify our S3 upload
workflow; it cannot establish CloudFormation replacement, IAM or networking.
[AWS testing guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/serverless-application-testing/best-practices.html),
[MiniStack limitations](https://ministack.org/docs/limitations).

## Testing through the product architecture

Synthesis scenarios enter through command composition or supply the same explicit contexts: the active normalization
candidate, the stack and deployment context, built-in directive capabilities and the packaging source. Import the
synthesis workflow separately from its resource accumulator. Exercise repeated service initialization, failure and retry
and cancellation through real services; do not restore global initialization flags. Console proxy scenarios can give a
real Lambda SDK client a loopback endpoint and synthetic credentials while keeping Prisma behavior and the wire
protocol.

Favor explicit dependencies and controllable process or service boundaries. Do not add abstractions only to make mocking
easier.

## Coverage by owner

This is target coverage, not one suite per row. A journey test can cover several rows.

| Owner                                         | Primary protection                                                                                                             | Add only when relevant                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `packages/config`, `packages/cloudformation`  | Valid and invalid public type consumers; generation checks; runtime schema accepts and rejects representative input.           | CLI synthesis with `cfn-lint`; live AWS for what validation cannot establish.        |
| `packages/config-authoring`                   | YAML and TypeScript input through loading and synthesis; equivalent results; useful errors.                                    | An installed consumer for published declarations.                                    |
| `packages/config-inference`                   | Small repositories through probe, facts, verification and composition; uncertain evidence, monorepos, existing infrastructure. | The init journey and the real-project corpus. Keep the focused trust-boundary tests. |
| `packages/naming`                             | Exact logical IDs, hashes and physical names; length and collision boundaries.                                                 | Use in templates; the change-plan compatibility check.                               |
| `packages/pricing`                            | Pinned catalog through parsing and calculation: units, missing prices, regions.                                                | A controlled catalog refresh check.                                                  |
| `packages/stack-info`, `packages/console-api` | Real producer output accepted by the consumer; redaction and protocol versions.                                                | The CLI-to-Console journey.                                                          |
| `packages/analytics`                          | Event construction, opt-out, redaction; real adapter against a local collector.                                                | One consumer path when transport changes. Never send test traffic to production.     |
| `packages/design-tokens`, `packages/ui-react` | Generated CSS and TypeScript agree; browser interaction in the gallery.                                                        | A consumer journey for routing or styling assumptions.                               |
| `packages/packaging`                          | Real fixture projects built and executed in the target runtime, and the project corpus.                                        | Native architecture, Windows build host, live service limits.                        |
| `apps/cli` commands and init                  | The CLI as a child process with isolated files and state; init writes a config the CLI can synthesize and package.             | A PTY for prompts and signals; the Console API; live lifecycle.                      |
| CLI helper Lambdas                            | The built ZIP invoked in the Lambda runtime with real event shapes.                                                            | Deployed IAM, payload configuration, custom-resource lifecycle.                      |
| CLI release, installers, MCP                  | Install the produced package or binary; invoke commands and the MCP protocol as clients do.                                    | Supported OS, libc and architecture; upgrade and checksums.                          |
| `apps/init-ui`                                | The CLI starts the wizard; a browser changes decisions and writes a usable config.                                             | Model quality separately.                                                            |
| `apps/console/api`                            | Real services and routers against migrated PostgreSQL: scoping, authorization, transactions, deduplication, retries.           | Real HTTP; the worker path; small Cognito, provider and AWS live checks.             |
| `apps/console/ui`                             | Browser → local API → isolated database for important flows; a gallery for UI-only states.                                     | Hosted identity, provider callbacks, deployed configuration in shared dev.           |
| `apps/console/bitbucket-forge`                | Built assets under the real resource path, through the bridge client with a host fixture.                                      | The installed Forge app and delivered events.                                        |
| `apps/docs`, `apps/website`                   | Build; routes, links, code examples and content contracts.                                                                     | Browser checks for search, navigation and interactive elements.                      |
| `apps/vscode-extension`                       | The compiled language server over JSON-RPC.                                                                                    | Extension-host activation, CodeLens and commands with `@vscode/test-electron`.       |
| Workspace and release tooling                 | Subprocess, workspace, generated-output and artifact contracts.                                                                | Architecture and privacy lints stay named as policy checks, not feature coverage.    |

## Workloads and packaging

Customers use many languages, packagers and deployment shapes. The
[artifact procedures](../../apps/cli/scripts/packaging-archives/README.md) and
[project qualification](../project-qualification.md) own the commands.

- **The corpus and starters are the main regression suite.** Run them for packaging and init changes, track the pass
  rate, and turn each product bug they find into a small deterministic fixture.
- **Execute artifacts in the promised runtime.** A Lambda artifact runs in the Lambda runtime image; a generic language
  image proves dependencies, not the Lambda contract. A container image runs its entrypoint and answers a request. A
  generated Dockerfile or Railpack plan alone proves nothing.
- **One real build per distinct adapter** for SSR frameworks. A shared wrapper test cannot qualify upstream output.
- **Windows is a build host.** Developers package on Windows. Build there and execute the result on Linux.
- **Choose combinations by the failure they expose**, not every language × version × manager × architecture. Native
  dependencies need the relevant architecture and libc. An emulated arm64 build does not replace native execution before
  a release.
- **Cache transitions.** For cache-sensitive paths: fresh build → unchanged input → changed source or dependency →
  removed file. Assert which artifacts change or upload. Move identical input to another directory to catch
  host-path-dependent hashes.

## Data safety on update and upgrade

An update must not delete or replace a stateful resource unless the user changed something that requires it. This
includes upgrading a stack deployed with v3. Check it offline: synthesize the current template for a config, compute the
product's own change plan against a baseline template, and assert that databases, buckets, tables, file systems, user
pools, streams and queues are neither destroyed nor replaced. Keep baselines for representative v3 configurations. A
live deployment is not required for this check.

## Model-assisted features

Routine tests drive the real parser, tool dispatcher, file and permission boundaries and persistence with recorded
provider responses, including malformed output, refusal, timeout, cancellation and retry. They never call a live model.

Evaluate model quality separately, when the model or prompt changes, against a small sanitized corpus with expected
facts, forbidden actions and a rubric. Compare with the previous version and repeat ambiguous cases. Do not assert exact
prose or let a model grade its own safety-critical claims. For investigations, check claims against the recorded reads.

## Console: isolated services and shared dev

The isolated environment (real API, PostgreSQL and UI, locally signed identities) is the default for Console
regressions: authorization, transactions, retries and browser flows run in parallel without credentials. Shared dev
remains for hosted Cognito login, RDS configuration, provider installations, callbacks, background workers and deployed
configuration. Do not create a Console deployment per agent or weaken the reservation guard.

For asynchronous flows, invoke the real consumer with a realistic event and assert the durable result; qualify the
actual transport in shared dev or live.

## Where tests run

- **Every PR (public CI):** the public gate, shared UI in Chromium, and `cfn-lint` on synthesized templates. Integrated
  CI adds migrations and the browser privacy check.
- **When relevant code changes:** `pnpm test:plan` selects heavy lanes (packaging, corpus, database feature suites,
  isolated Console browser, MiniStack) and the agent making the change runs them.
- **Before each release:** every heavy lane, the corpus and the live canaries run on the release candidate. This catches
  lanes that broke between releases.

There is no nightly job. Add a heavy lane to CI only when it is fast and stable enough to add signal. Measure before
changing runners: startup, execution and first-attempt failures. Treat retries as diagnosis, not a way to get green.

Build each artifact once per revision and reuse it within a run. Cache only when all inputs are tracked: revisions,
fixtures, lockfiles, tool and image versions and relevant environment. Never cache a live result.

## Tool choices

- **Playwright Test** is the browser runner for public UI and Console. Console pins `1.62.1`.
- **Playwright CLI** or `agent-browser` help agents explore; neither replaces saved assertions.
- **No** Vitest Browser Mode, Cypress, model-driven execution or non-rendering browsers for regression tests: another
  runner adds cost without a demonstrated gain.
- **Testcontainers** only if it replaces repeated container code; qualify WSL, loopback binding and cleanup first.
- **Mutation and property-based testing** selectively: a deliberate fault check for consequential behavior, fast-check
  for a clear invariant such as round-trips or bounded names.

## Keeping or replacing existing tests

| Decision             | When                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| Keep                 | It catches a distinct, meaningful failure cheaply: identity, schema compatibility, calculations, redaction. |
| Improve or merge     | It is useful but duplicates another scenario, is expensive to set up, or mocks the dependency that matters. |
| Replace, then remove | It checks static markup for interaction, source strings for runtime behavior, or internal call order.       |
| Remove               | Its behavior is obsolete, enforced by types or lint, or fully covered by a clearer test.                    |

Establish the replacement before deleting unique protection. For consequential behavior, break it in a scratch copy and
confirm the new test fails for that reason.
