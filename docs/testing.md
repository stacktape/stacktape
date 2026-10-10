# Testing Stacktape changes

Read this once when choosing tests, then open only the linked procedures you need. The [strategy](testing/strategy.md)
explains target coverage, the [E2E guide](testing/e2e.md) lists helpers and conventions, and the
[overhaul plan](testing/overhaul.md) coordinates the repository-wide testing work.

## Test end to end first

Prove the change with a repeatable scenario that drives the product the way a customer does and observes the outcome
they care about. For most features, one well-chosen end-to-end scenario is the main test. E2E does not always mean a
browser or an AWS deployment: a CLI building an artifact that runs correctly is a complete journey.

Most recently fixed defects were found by building real projects and running live scenarios, not by focused tests.
Before testing an area, read its fix history (`git log -i --grep=fix -- <paths>`) and cover those failures first. For a
bug, reproduce it with a failing test before fixing it when practical.

Add focused tests for rules with many meaningful inputs or a compatibility promise: naming, pricing, parsing, redaction.
Do not add a test for every function or repeat one assertion at every layer. Check what an existing test catches before
deleting it.

| What changed                                                           | Test at this boundary                                                                                                                                                                         |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Naming, pricing, parsing, redaction or another pure rule               | Table-driven inputs with independently known results. Preserve replacement-sensitive names and hashes.                                                                                        |
| Types, schemas, generated data or public exports                       | Compile a real consumer; exercise validation; run the owner's `generate:check`. Type-only changes need no deployment.                                                                         |
| Config inference, authoring or synthesis                               | A representative project or config through the real pipeline; assert resources, references and permissions; `cfn-lint`. Check that updates do not destroy or replace stateful resources.      |
| CLI command or local process                                           | Spawn the current CLI; verify exit status and the resulting files, output or operation. Include cancellation when relevant.                                                                   |
| Packaging, helper Lambda or installer                                  | Build the actual artifact and execute it in its target runtime; run the affected corpus projects. [Packaging procedures](../apps/cli/scripts/packaging-archives/README.md).                   |
| API, database or background workflow                                   | Real router and services with disposable PostgreSQL; observe committed state, denial, transactions and retries. [Console lanes](testing/console.md).                                          |
| Browser interaction                                                    | Playwright against the real component or application. Use the real API when the change crosses it; verify persistence after reload. [Browser tests](testing/e2e.md#browser-tests).            |
| AWS SDK interaction                                                    | The real SDK against pinned MiniStack for the operations used; assert effects, not just successful responses. [S3 lane](../apps/cli/scripts/packaging-archives/README.md#ministack-s3-pilot). |
| AWS permissions, deployment lifecycle, networking or provider delivery | A guarded scenario against the real service; emulation cannot establish these. [Live AWS](testing/live-aws.md).                                                                               |
| Documentation or presentation                                          | Validate links and build output; inspect changed interactions or layout in a browser when needed.                                                                                             |

Tests may cross packages; put the scenario with the application or capability that owns the outcome. A browser test with
a substituted API proves browser behavior, not the API. Substitute only external dependencies, at explicit boundaries.
Avoid mock-call choreography, source-string assertions about runtime behavior, and snapshots that repeat the
implementation.

## Run efficiently

- Run `pnpm test:plan` (or `-- --since=<ref>`) and run the lanes it suggests. It matches paths; check what each lane
  covers. Run `pnpm test:doctor` before a long lane (`-- --for=console` for shared-dev Console work).
- Heavy lanes (packaging, corpus, Console database and browser, MiniStack) are not in per-PR CI. When `test:plan`
  selects one for your change, you run it. All of them run before each release.
- Extend an existing scenario and its helpers before writing new setup code.
  [Existing helpers](testing/e2e.md#helpers-that-exist).
- Run `pnpm check:public`, or `pnpm check:integrated` with Console initialized, before handoff.
- Reuse earlier results while code, artifacts and environment are unchanged. Report what you tested and what you could
  not verify; no separate evidence report is needed.

## Console

The [isolated Console application](testing/e2e.md#isolated-console-application) runs the real UI, API and disposable
PostgreSQL with no credentials; prefer it when it covers the change. Page behavior that synthetic API responses can
drive runs in the [offline browser lane](testing/e2e.md#browser-tests). Other API and UI journeys use
`pnpm dev:console`; UI-only work can use `pnpm dev:console:ui` when deployed dev supports its unchanged contract. The
source CLI defaults to deployed dev even when a local API is running; select
[the intended API explicitly](testing/console.md#prove-the-changed-revision).

[Localhost login](testing/console.md#localhost-login) uses the existing dev test identities and the SSM-backed
Playwright helper.

### Shared dev reservation

Follow the [reservation procedure](testing/console.md#shared-dev-reservation) before mutating shared dev or running
tests that need a stable dev revision. The hosting account also contains production and is not disposable.

## Live AWS

Normal tests must fail closed against live AWS. Development Console deployments, `devlocal` refreshes, test AMI builds
and explicitly named disposable stacks are already authorized. Follow the [live procedure](testing/live-aws.md) for
account verification, ownership, cost and cleanup, including recovery after interruption. Production deployment,
migration, publishing and credential rotation require explicit authorization. Never record secret values.
