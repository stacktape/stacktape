# Testing Stacktape changes

Read this once when choosing tests, then open only the linked procedures you need. The [strategy](testing/strategy.md)
explains target coverage, the [E2E guide](testing/e2e.md) lists helpers and conventions, and the
[slice guide](testing/overhaul.md) explains the registry's slices and tiers and how to measure a slice with faults.

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

| What changed                                                           | Test at this boundary                                                                                                                                                                    |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Naming, pricing, parsing, redaction or another pure rule               | Table-driven inputs with independently known results. Preserve replacement-sensitive names and hashes.                                                                                   |
| Types, schemas, generated data or public exports                       | Compile a real consumer; exercise validation; run the owner's `generate:check`. Type-only changes need no deployment.                                                                    |
| Config inference, authoring or synthesis                               | A representative project or config through the real pipeline; assert resources, references and permissions; `cfn-lint`. Check that updates do not destroy or replace stateful resources. |
| CLI command or local process                                           | Spawn the current CLI; verify exit status and the resulting files, output or operation. Include cancellation when relevant.                                                              |
| Packaging, helper Lambda or installer                                  | Build the actual artifact and execute it in its target runtime; run the affected corpus projects. [Packaging procedures](../apps/cli/scripts/packaging-archives/README.md).              |
| API, database or background workflow                                   | Real router and services with disposable PostgreSQL; observe committed state, denial, transactions and retries. [Console lanes](testing/console.md).                                     |
| Browser interaction                                                    | Playwright against the real component or application. Use the real API when the change crosses it; verify persistence after reload. [Browser tests](testing/e2e.md#browser-tests).       |
| AWS SDK interaction                                                    | The real SDK against pinned MiniStack for the operations used; assert effects, not just successful responses. [MiniStack fixture and deploy loop](testing/e2e.md#helpers-that-exist).    |
| AWS permissions, deployment lifecycle, networking or provider delivery | A guarded scenario against the real service; emulation cannot establish these. [Live AWS](testing/live-aws.md).                                                                          |
| Documentation or presentation                                          | Validate links and build output; inspect changed interactions or layout in a browser when needed.                                                                                        |

Tests may cross packages; put the scenario with the application or capability that owns the outcome. A browser test with
a substituted API proves browser behavior, not the API. Substitute only external dependencies, at explicit boundaries.
Avoid mock-call choreography, source-string assertions about runtime behavior, and snapshots that repeat the
implementation.

## Run efficiently

- Run `pnpm test:plan` (or `-- --since=<ref>`, or `-- --paths=<file>` to see who owns one file) and run the relevant
  lanes it suggests. Each command reports owning slice IDs, level, tier and prerequisites. The
  [code registry](../scripts/workspace/test-registry.ts) owns promises, paths, lanes and exact test ownership. Selection
  also follows direct Console suite imports. Missing private lanes are labelled in public clones. Run `pnpm test:doctor`
  before a long lane (`-- --for=console` for shared-dev Console work).
- Public and integrated CI run `pnpm check:static` for instructions, docs, secrets, formatting, lint, workspace rules,
  generation, types, architecture, dead code and duplicates, then `pnpm test:ci` for the registry's fast, offline `pr`
  tests. Public Linux CI also validates synthesized templates with `cfn-lint`. Console rules run when initialized. Full
  suites, application builds, package-install qualification and browsers remain local/release work. `pnpm test:tools`
  checks ownership and rejects missing scripts, database flags and Playwright projects. Add new tests to their slice's
  exact `tests` list, or explicitly classify harness/policy tests as tooling.
- While GitHub Actions is switched off for billing, run `pnpm test:ci` and the repository gate locally instead, and end
  the first line of every commit message with `[skip ci]`.
- Heavy lanes (packaging, corpus, Console database and browser, MiniStack) are not in per-PR CI. When `test:plan`
  selects a `change` lane for your slice, you run it. Candidate qualification also runs those lanes and the registry's
  `release` lanes. Journey tags group pre-release E2E work; slices own everyday selection.
- Extend an existing scenario and its helpers before writing new setup code.
  [Existing helpers](testing/e2e.md#helpers-that-exist).
- Run `pnpm check:public`, or `pnpm check:integrated` with Console initialized, before handoff. Neither fits a
  nine-minute foreground command on a loaded machine; run them in the background or as their individual steps.
- Reuse earlier results while code, artifacts and environment are unchanged. Report what you tested and what you could
  not verify; no separate evidence report is needed.

### Fresh worktrees and heavy lanes

Lanes run package scripts outside Turbo's task graph, so a fresh worktree needs generated sources before most of them
pass:

```sh
pnpm install --frozen-lockfile
pnpm --filter @stacktape/console-api-app generate   # Prisma client; every Console lane, the Console UI typecheck and check:architecture need it
pnpm --filter @stacktape/ui-react build             # check:architecture resolves workspace imports against it
pnpm --filter @stacktape/cli run build:dev-artifacts # helper Lambdas for init-e2e, the Console incident lanes and the source CLI
```

In some agent worktrees the Console is a plain checkout rather than a registered submodule, so `git submodule update`
does nothing there. Before `pnpm test:tools`, compare `git -C apps/console rev-parse HEAD` with
`git ls-tree HEAD apps/console` and check out the pointer by hand when they differ. Running `pnpm` inside the Console
rewrites `apps/console/api/pnpm-lock.yaml`; revert it before committing. The generated
`apps/cli/@generated/llm-docs/lexical-index.json` conflicts on most merges; take `main`'s copy and rerun
`pnpm --filter @stacktape/cli generate`.

Docker-heavy lanes (MiniStack, packaging, corpus, Console database and browser, containers) share one machine with other
agents. Wrap each in `flock -w 3600 /tmp/stacktape-heavy-lane.lock <command>` so only one runs at a time, use unique
container names and random ports, and never prune Docker or stop a container you did not start. Contention is the main
cost: run the fast lanes first and take the lock only for what they miss, batch several runs under one hold, and narrow
a rerun with `bun test --bail -t <pattern>`. A batch interrupted mid-run leaves its MiniStack container behind; remove
only your own.

## Console

The [isolated Console application](testing/e2e.md#isolated-console-application) runs the real UI, API and disposable
PostgreSQL with no credentials; prefer it when it covers the change. Page behavior that synthetic API responses can
drive runs in the [offline browser lane](testing/e2e.md#browser-tests). Other API and UI journeys use
`pnpm dev:console`; UI-only work can use `pnpm dev:console:ui` when deployed dev supports its unchanged contract. The
source CLI defaults to deployed dev even when a local API is running; select
[the intended API explicitly](testing/console.md#prove-the-changed-revision).

[Localhost login](testing/console.md#localhost-login) uses the existing dev test identities and the SSM-backed
Playwright helper.

Console PR lanes include offline migration history, package export boundaries and infrastructure contracts plus
assembled support-template `cfn-lint`. Install `cfn-lint==1.57.2` before running `pnpm test:ci` with Console present; CI
installs it explicitly. Migration adoption still requires disposable PostgreSQL and stays in the change tier.

### Shared dev reservation

Follow the [reservation procedure](testing/console.md#shared-dev-reservation) before mutating shared dev or running
tests that need a stable dev revision. The hosting account also contains production and is not disposable.

## Live AWS

Normal tests must fail closed against live AWS. Development Console deployments, `devlocal` refreshes, test AMI builds
and explicitly named disposable stacks are already authorized. Follow the [live procedure](testing/live-aws.md) for
account verification, ownership, cost and cleanup, including recovery after interruption. Production deployment,
migration, publishing and credential rotation require explicit authorization. Never record secret values.
