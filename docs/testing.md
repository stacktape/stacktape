# Testing Stacktape changes

Read this once when choosing tests. Open linked procedures only for the work at hand. The
[testing strategy](testing/strategy.md) owns suite design and migration; the [E2E guide](testing/e2e.md) owns reusable
fixtures, browser tooling and performance.

## Choose by what can break

Prefer a repeatable scenario through real cooperating code that proves the customer outcome. For a complex feature, one
well-chosen E2E scenario can be its only behavioral test; add tests for important failures it cannot exercise. E2E does
not always mean a browser or an AWS deployment: a CLI producing an artifact that runs correctly is also a complete
journey.

Use focused tests for self-contained rules with meaningful input variations, such as naming, pricing, parsing and
redaction. For isolated changes, describe realistic failures and write the failing cases before changing the
implementation. For a bug, reproduce the failure before fixing it when practical. Do not add a test for every function
or duplicate the same assertion at every layer. An artificial input can protect a real compatibility rule; check what a
test detects before deleting it.

| What changed                                                           | Test at this boundary                                                                                                                                                                                    |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Naming, pricing, parsing, redaction or another pure contract           | Table-driven inputs and independent expected results. Preserve replacement-sensitive names and hashes.                                                                                                   |
| Types, schemas, generated data or public exports                       | Compile a real consumer; exercise serialization/validation where it exists; run the owner's `generate:check`. Type-only changes do not need a deployment.                                                |
| Config inference, authoring or synthesis                               | Representative project/config through the real pipeline; assert meaningful resources, references and permissions. Validate CloudFormation with `cfn-lint`.                                               |
| CLI command or local process                                           | Spawn the current CLI; verify exit status and the resulting files, output or operation. Include cancellation when relevant.                                                                              |
| Packaging, helper Lambda or installer                                  | Build the actual artifact and execute it in its target runtime. [Packaging procedures](../apps/cli/scripts/packaging-archives/README.md).                                                                |
| API, database or background workflow                                   | Real router/services and disposable PostgreSQL; observe committed state and relevant denial, transaction or retry behavior. [Available Console lanes](testing/console.md).                               |
| Browser interaction                                                    | Playwright against the actual component/page or application. Use the real API when the change crosses it; verify persistence after reload. [Browser fixtures](testing/e2e.md#browser-tests).             |
| AWS SDK interaction                                                    | Real SDK against pinned MiniStack for the specific supported operations; assert effects, not successful responses alone. [S3 lane](../apps/cli/scripts/packaging-archives/README.md#ministack-s3-pilot). |
| AWS permissions, deployment lifecycle, networking or provider delivery | A guarded scenario against the real service. Emulation does not establish these contracts. [Live AWS](testing/live-aws.md).                                                                              |
| Documentation or presentation                                          | Validate links/build output; inspect changed interactions or layout in a browser when needed.                                                                                                            |

Tests may cross packages; keep the scenario with the application or capability that owns the outcome. A browser test
with a mocked API proves browser behavior, not the API or database. Keep external substitutes at explicit boundaries; do
not mock away the behavior under test. Avoid mock-call choreography, source-string assertions about runtime behavior,
and snapshots that merely repeat the implementation.

## Run efficiently

- Run `pnpm test:plan`; inspect what its suggested commands actually cover. It is a path-based hint, not an exhaustive
  test list. Run `pnpm test:doctor` before a long lane (`-- --for=console` for shared-dev Console work).
- Extend an existing scenario and its fixtures before inventing a runner. Select the changed behavior and its important
  failure case. Use [the workspace matrix](testing/strategy.md#coverage-by-owner) for application-specific gaps.
- Run `pnpm check:public`, or `pnpm check:integrated` with Console initialized, before handoff. These gates do not
  include every browser, database, Docker or live test; run the relevant additional lane.
- Reuse valid results while relevant code, artifacts and environment match. Ordinary test output is sufficient; no
  separate evidence report is required. Report what you tested and important behavior you could not verify.

## Shared dev reservation

An isolated full Console browser/API harness is a [planned improvement](testing/e2e.md#isolated-console-application).
Today, API/UI journeys use `pnpm dev:console`; UI-only work can use `pnpm dev:console:ui` when deployed dev supports its
unchanged contract. The source CLI defaults to deployed dev even when a local API is running; select
[the intended API explicitly](testing/console.md#prove-the-changed-revision).

[Localhost login](testing/console.md#localhost-login) uses the existing dev test identities and SSM-backed Playwright
helper. The current shared-dev browser tests authenticate through the real sign-in form.

Follow the [reservation procedure](testing/console.md#shared-dev-reservation) before shared-dev mutation or tests that
need a stable dev revision. The hosting account also contains production and is not disposable.

## Live AWS

Normal tests must fail closed against live AWS. Development Console deployments, `devlocal` refreshes, test AMI builds
and explicitly named disposable stacks are already authorized. Follow the [live procedure](testing/live-aws.md) for
account verification, ownership, cost and cleanup, including recovery after interruption. Production deployment,
migration, publishing and credential rotation require explicit authorization. Never record secret values.
