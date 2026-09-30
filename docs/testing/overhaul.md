# Testing overhaul plan

This is the coordinator's plan for the repository-wide testing overhaul. Ordinary changes need only the
[short policy](../testing.md). Slice workers receive one assignment from this plan plus the procedures it links.

The goal is to find and prevent the defects customers would hit, with tests cheap enough to keep running. Success is
measured by defects found and defects that escape later, not by test counts, deletions or the share called E2E. Keep
useful existing tests.

## What the evidence says

Most defects fixed since mid-2026 were found by building real projects, running the starter and project corpus, and live
smoke runs: packaging defects from the corpus, ECS deployments that never converged, runner image failures and a
Windows-built Lambda that could not load `pg`. Focused tests with imagined inputs found few of them. The overhaul
therefore:

- starts every assignment from a real end-to-end scenario and the bugs already shipped in that area;
- treats the project corpus and starters as the main packaging and onboarding regression suite;
- adds focused tests for rules with many meaningful inputs (naming, pricing, parsing, redaction), not by default.

## Status

The pilots are complete. Their run evidence is in the ignored `.stacktape/qa-initiative/` directory.

- Stable naming (P1), a shared dialog in the browser (P2), MiniStack layer upload and retention (P3), and the isolated
  Console issue journey (P4) are merged, with the helpers they needed.
- Calibration accepted the shared config editor (former S40), issue ingestion (S54) and CLI analytics (S69).
- The pricing assignment (S42) found a product bug: a product without a price in the selected region crashes the
  estimator and returns an empty breakdown. It is blocked until that bug is fixed.

## Priorities

The product serves developers who deploy many times a day and a few committed customers who accept that v4 may have
rough edges. Activation matters most: a new user must get from a repository to a working deployment. Existing stacks
must never lose data.

| Priority | Journeys                                                                                                  | Why                                                                |
| -------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1        | J1 first deployment, J2 deploy loop and data safety, J3 packaging real projects                           | Activation, the daily loop, and the defects customers hit most.    |
| 2        | J4 local development, J5 Console access and tenancy, J6 CLI and Console together, J7 errors and incidents | Daily use and the trust a CTO needs before buying.                 |
| 3        | J8–J13                                                                                                    | Important, but fewer users or lower cost of failure. Do on demand. |

Work in priority order. Within a priority, start with the assignment whose anchor scenario is missing entirely.

## Journeys and assignments

A **journey** is a customer outcome that crosses packages, processes and services. Each journey has one **anchor
scenario**: the end-to-end test that proves the outcome. An **assignment** is the unit one agent completes in one
session: the anchor scenario or a focused contract inside the journey. Former slice IDs (S01–S74) are listed so earlier
evidence stays traceable.

Before dispatching a journey, check its surface against the code: commands, resource types, helper Lambdas, Console
pages and workers. Assign anything unlisted. Split an assignment that turns out to hold several independent contracts.

### J1 — First deployment (priority 1)

A developer takes an existing repository or a starter, runs `stacktape init`, and gets a working deployment they can see
in the Console. The Console's own first-deployment paths (Git repository, starter, hosted config generation) wait for a
product decision; do not extend their tests until it is made.

| ID   | Outcome and anchors                                                                                                                                                                                | Scenario and failures to cover                                                                                                                                                                     | Former   |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| J1.1 | **Anchor.** Existing repository → terminal init → config → package → runnable artifact. [Init flow](../../apps/cli/src/init), [inference](../../packages/config-inference).                        | Current CLI process with recorded model/provider responses; written config synthesizes and packages; artifact responds. Cancellation, existing config, repeated run, monorepo, uncertain evidence. | S04–S06  |
| J1.2 | Embedded wizard reaches the same result. [Wizard](../../apps/init-ui), [init server](../../apps/cli/src/init/server).                                                                              | CLI starts the wizard; browser changes a decision and resolves an uncertain one; saved config loads. Server disconnect and cancellation leave no child processes.                                  | S07      |
| J1.3 | Init deploys and writes CI/CD. [Init deploy](../../apps/cli/src/init/deploy), [CI/CD](../../apps/cli/src/init/cicd).                                                                               | Deploy consent bound to the reviewed config, failure explanation, generated secrets, written pipeline for each supported host. Live proof is the existing init canary.                             | S06      |
| J1.4 | Import respects existing infrastructure and trust boundaries. [Policy](../../packages/config-inference/src/policy), [tools](../../apps/cli/src/init/tools).                                        | Existing hosting and databases are not replaced or invented; no reads outside the project; conflicting evidence is downgraded. Keep the focused trust-boundary tests.                              | S05, S08 |
| J1.5 | Model quality stays acceptable. [Evaluation](../../apps/cli/src/init/eval).                                                                                                                        | Run on model or prompt changes only: a small sanitized corpus with expected facts and forbidden actions, compared with the previous version.                                                       | S08      |
| J1.6 | Console first deployment (Git, starter, hosted config generation). [Pages](../../apps/console/ui/src/pages/DeployNewProject), [config generation](../../apps/console/api/src/services/config-gen). | **On hold** pending the product decision about deploying from the Console.                                                                                                                         | S73, S48 |

The first deployment's appearance in the Console is covered by J6.1.

### J2 — Deploy loop and data safety (priority 1)

Authored config becomes a template and artifacts, then a stack that is created, updated, left unchanged and deleted.
Updates, including the v3 → v4 upgrade, never delete or replace stateful resources unexpectedly.

| ID   | Outcome and anchors                                                                                                                                                                                                                                                    | Scenario and failures to cover                                                                                                                                                                                                                                                  | Former    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| J2.1 | **Anchor.** Live lifecycle: create → meaningful update → unchanged update → delete. [Deploy](../../apps/cli/src/commands/deploy), [stack manager](../../apps/cli/src/domain/cloudformation-stack-manager), [live canaries](../../apps/cli/scripts/real-aws/README.md). | Extend the existing packaging and alias canaries. Unchanged update uploads nothing and changes nothing; a failed update rolls back; delete removes exactly the owned resources.                                                                                                 | S13, S14  |
| J2.2 | No unexpected data loss on update or upgrade. [Change plan](../../apps/cli/src/domain/deployment-change-plan), [naming](../../packages/naming).                                                                                                                        | Offline: baseline template → current synthesis → the product's change plan. Assert no destroy or replace of databases, buckets, tables, file systems, user pools, streams and queues. Baselines include templates from v3 configs.                                              | S03 (new) |
| J2.3 | Config loads and resolves predictably. [Authoring](../../packages/config-authoring), [config manager](../../apps/cli/src/domain/config-manager), [config](../../packages/config).                                                                                      | YAML and TypeScript, directives, references, stages; valid and invalid public type consumers; useful errors without secret values.                                                                                                                                              | S01, S02  |
| J2.4 | Resource families synthesize into valid, connected templates. [Resolvers](../../apps/cli/src/domain/calculated-stack-overview-manager/resource-resolvers), [templates](../../apps/cli/src/domain/template-manager).                                                    | Representative configs per family through real synthesis and `cfn-lint`; assert references, permissions and routing. Include families with no coverage: Convex, AgentCore, CDK constructs, custom and raw CloudFormation resources, overrides, log forwarding. Split by family. | S09–S12   |
| J2.5 | Artifacts are uploaded once, reused and retained. [Artifact manager](../../apps/cli/src/domain/deployment-artifact-manager).                                                                                                                                           | Done in P3 (MiniStack). Extend only for new upload behavior.                                                                                                                                                                                                                    | S33       |
| J2.6 | Diff, rollback and delete commands choose the right operation. [Commands](../../apps/cli/src/commands).                                                                                                                                                                | Absent or failed stacks, destructive confirmation, cancellation and retry, through the CLI process.                                                                                                                                                                             | S14       |

### J3 — Packaging real projects (priority 1)

A project builds into an artifact that runs in its target runtime. Artifact correctness lives here; J2 owns what AWS
does with it.

| ID   | Outcome and anchors                                                                                                                                                                                                           | Scenario and failures to cover                                                                                                                                                                    | Former   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| J3.1 | **Anchor.** Starters and the project corpus package and run. [Project qualification](../project-qualification.md).                                                                                                            | Run the corpus and all starters; record the pass rate; triage every failure as product bug, fixture problem or unsupported project. Add a small deterministic fixture for each product bug found. | new      |
| J3.2 | Node/TypeScript Lambdas, single and split. [ES bundler](../../packages/packaging/src/bundlers/es), [split bundler](../../packages/packaging/src/split-bundler).                                                               | Build and invoke in the Lambda runtime with layers; ESM/CJS, dynamic imports, assets, native modules, SDK policy, source maps; changed-only rebuilds and cache identity.                          | S19, S20 |
| J3.3 | Packaging on a Windows machine produces artifacts that run on Linux. [Archive entries](../../packages/packaging/src/artifact).                                                                                                | Build on the Windows CI runner, then execute the artifact in the Linux Lambda runtime. Cover module resolution, executable bits, links and cache identity.                                        | new      |
| J3.4 | Language Lambdas (Python, Go, Java, .NET, Ruby, Rust). [Bundlers](../../packages/packaging/src/bundlers), [buildpacks](../../packages/packaging/src/buildpacks).                                                              | One small real project per language, executed in the Lambda runtime. Driven by corpus failures: add a case when the corpus finds a language-specific defect.                                      | S21–S25  |
| J3.5 | Container images: `js-bundle`, Railpack `buildpack` (including PHP) and `dockerfile`. [Image builders](../../packages/packaging/src/image).                                                                                   | Build and run the image; observe a response. Context, platform, secrets and cache invalidation; unavailable builder or platform.                                                                  | S26, S27 |
| J3.6 | SSR frameworks and static sites. [Web packaging](../../packages/packaging/src/web).                                                                                                                                           | One pinned real build per adapter (Next.js, Astro, SvelteKit, Nuxt, SolidStart, TanStack, Remix); invoke a dynamic route, assets and cookies. Static: build, serve, deep links.                   | S28–S31  |
| J3.7 | Custom artifacts and helper Lambda archives run safely. [Artifacts](../../packages/packaging/src/artifact), [archive acceptance](../../apps/cli/scripts/packaging-archives), [helper Lambdas](../../apps/cli/helper-lambdas). | Extract as the runtime user and invoke; permissions, link containment, size limits, custom-resource responses.                                                                                    | S32      |

### J4 — Local development (priority 2)

| ID   | Outcome and anchors                                                                                                                                                                                        | Scenario and failures to cover                                                                                              | Former |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| J4.1 | **Anchor.** `dev` starts, reloads and stops cleanly. [Dev](../../apps/cli/src/commands/dev), [dev stop](../../apps/cli/src/commands/dev-stop), [debug services](../../apps/cli/src/domain/debug-services). | Sample app starts, responds, reflects an edit, stops all children. Failed startup, occupied port, interruption, agent mode. | S15    |

### J5 — Console access and tenancy (priority 2)

| ID   | Outcome and anchors                                                                                                                                                                                                       | Scenario and failures to cover                                                                                                                                          | Former |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| J5.1 | **Anchor.** Each HTTP surface enforces its own credentials. [Routers](../../apps/console/api/src/api), [middleware](../../apps/console/api/src/middlewares.ts), [HTTP server](../../apps/console/api/src/http-server.ts). | Real HTTP across anonymous, API-key, AWS-identity, session and run-token surfaces: missing, malformed, expired and wrong-scope credentials; errors inside tRPC batches. | S43    |
| J5.2 | Organizations, roles and membership are enforced. [Organizations](../../apps/console/api/src/organizations), [pages](../../apps/console/ui/src/pages).                                                                    | Invite, change role, remove through the UI and API; cross-tenant isolation, last owner, stale membership, API keys.                                                     | S44    |
| J5.3 | AWS account connection grants only intended capabilities. [AWS](../../apps/console/api/src/aws), [connection handler](../../apps/console/api/src/lambdas/handle-account-connection.ts).                                   | Connection lifecycle and policy construction; unconnected and denied accounts. Live check owns the trust policy.                                                        | S45    |
| J5.4 | Secrets and parameters stay scoped and hidden. [Secrets page](../../apps/console/ui/src/pages/SecretsPage), [CLI commands](../../apps/cli/src/commands).                                                                  | Create, read, update, delete with synthetic values through CLI and Console; correct stage, account and role; values absent from output and logs.                        | S52    |

### J6 — CLI and Console together (priority 2)

| ID   | Outcome and anchors                                                                                                                                                                                                                    | Scenario and failures to cover                                                                                                                                        | Former |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| J6.1 | **Anchor.** A CLI deployment appears correctly in the Console. [Stack info](../../packages/stack-info), [public API](../../packages/console-api), [progress service](../../apps/console/api/src/services/stack-operation-progress.ts). | Source CLI → real HTTP → stored operation → Console page, using the isolated Console fixture. Wrong project/stage/account, terminal errors, redaction, stale updates. | S46    |
| J6.2 | Login, profiles and org/project commands use the right identity. [API manager](../../apps/cli/src/app/stacktape-trpc-api-manager).                                                                                                     | Isolated local state; real serialized requests reach the intended endpoint; expiry and denial.                                                                        | S18    |

### J7 — Errors and incidents (priority 2)

| ID   | Outcome and anchors                                                                                                                                                                                                                                                                             | Scenario and failures to cover                                                                                                                                           | Former       |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| J7.1 | **Anchor.** A runtime error becomes an issue, then an incident, then an alert the user acts on. [Issues](../../apps/console/api/src/issues), [incident engine](../../apps/console/api/src/services/incident-engine.ts), [alert router](../../apps/console/api/src/services/alert-router.ts).    | Real ingestion → stored redacted issue → incident → delivered alert → browser action persists. Duplicate and out-of-order delivery. Ingestion and triage parts exist.    | S54–S56, S63 |
| J7.2 | Uptime checks, alarms and synthetics produce the promised signal. [Prober](../../apps/cli/helper-lambdas/uptimeProber), [ingestion](../../apps/console/api/src/services/uptime-ingestion.ts), [sweeper](../../apps/console/api/src/lambdas/monitoring-sweeper.ts).                              | Probe an owned HTTP fixture; timeout and recovery reach ingestion; sweeper state. Live check owns scheduling and delivery.                                               | S65          |
| J7.3 | Automatic assessment is grounded and bounded. [Assessment](../../apps/console/api/src/services/incident-assessment.ts).                                                                                                                                                                         | Recorded model responses through the real orchestration: refusal, malformed output, timeout, no data. Model quality evaluated separately.                                | S57          |
| J7.4 | Hosted runs use the chosen funding, read only allowed data, and propose a reviewable fix. [Runs](../../apps/console/api/src/services/incident-agent-runs.ts), [tools](../../apps/console/api/src/services/incident-agent-tools.ts), [fix](../../apps/console/api/src/services/incident-fix.ts). | Extend the existing incident-agent fixtures: no fallback to another credential, masked scoped reads, oversized or forbidden changes rejected, public-repository PR text. | S58–S60      |

### J8–J13 — Priority 3

Handle these when their area changes or a priority 1–2 journey needs them. Former slice rows remain a useful checklist
of what each area promises.

| Journey                                                                                                                                                            | Assignments                                                                                                                                                                                             | Former                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| J8 Git-driven deployments and runners. [Remote deploy](../../apps/console/api/src/services/remote-deploy), [runners](../../apps/console/api/src/services/runners). | Anchor: provider webhook → remote operation → runner → provider status, with duplicate delivery and cancellation. Then runner capacity, GitHub, GitLab, Bitbucket. Depends partly on the J1.6 decision. | S47–S51                      |
| J9 Day-2 CLI operations and output. [Commands](../../apps/cli/src/commands), [terminal UI](../../apps/cli/src/app/tui-manager).                                    | Logs, metrics, queries, sessions and tunnels through the CLI process; TTY, plain and JSON output; `aws-call`, `cf-module-update`, `domain-add`, `ai-connect`.                                           | S16, S17, S74                |
| J10 Console insight pages. [Pages](../../apps/console/ui/src/pages).                                                                                               | Logs, metrics and traces views; costs, budgets and pricing; security inventory and findings; guardrails.                                                                                                | S42, S61, S62, S64, S66, S67 |
| J11 Billing. [Billing](../../apps/console/api/src/billing).                                                                                                        | Provider events: duplicates, out of order, plan changes, denied actions. No real charges.                                                                                                               | S53                          |
| J12 Editor, AI and documentation surfaces.                                                                                                                         | VS Code extension host, MCP protocol against the shipped binary, docs build and search, website routes, shared UI controls, config editor, diagram, tokens.                                             | S35–S41, S70                 |
| J13 Distribution and repository tooling.                                                                                                                           | Release artifacts and installers, external tool downloads, workspace checks, analytics opt-out, Console database migrations and startup parameters.                                                     | S34, S68, S69, S71, S72      |

## Foundation work

Build helpers only when an assignment in the current batch needs them. One owner changes shared helpers at a time.
[The E2E guide](e2e.md) lists the helpers that exist and the ones worth building.

| ID  | Deliverable                                                                                                                                                           | Needed by      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| F1  | `pnpm test:plan` selects every heavy lane by path, including the Console database feature suites (the default `test:db` runs migrations only) and the MiniStack lane. | All            |
| F2  | A documented release-qualification run: every heavy lane, the corpus, and the live canaries, run before each release candidate.                                       | All            |
| F3  | Change-plan compatibility check: baseline template → current synthesis → change plan → assertion on stateful resources. Baselines from v3 configs.                    | J2.2           |
| F4  | Windows packaging lane: build on the Windows runner, execute on Linux.                                                                                                | J3.3           |
| F5  | Console tenant fixture: extract UI startup, session installation and tenant seeding from the isolated Console test so a second journey can reuse them.                | J5, J6.1, J7.1 |
| F6  | One process runner and one Lambda-runtime invoker instead of the current duplicates.                                                                                  | J1, J3         |
| F7  | Provider fixtures and a job observer for asynchronous workflows, extracted from the incident-agent fixtures.                                                          | J7, J8         |

Heavy lanes stay out of the per-PR CI gate. `test:plan` selects them for the agent changing the relevant code, and the
release-qualification run (F2) catches anything that rotted between releases. Revisit CI when a lane becomes cheap and
stable enough to add public signal.

## How to complete an assignment

1. Read the business documents, the short policy, the nearest `AGENTS.md` and the assignment's anchors. Follow the real
   callers and effects; do not infer the contract from old tests.
2. List the bugs already fixed in this area: `git log -i --grep=fix -- <paths>` in both repositories. They are the first
   failures to cover.
3. Write or extend the anchor scenario through real cooperating code. Add focused tests only for failures the scenario
   cannot reach cheaply.
4. Fault check: break the protected behavior in a scratch copy and confirm the test fails for that reason. Record the
   fault and result in the handoff. A compile or fixture error does not count.
5. Keep, merge or remove old tests by what they protect. For each removal, name where its protection now lives.
6. Run the focused lane, `pnpm test:plan`'s suggested lanes and the relevant gate.
7. Hand off: patch, checks run, fault check, removed protection, product bugs found, known gaps.

Workers do not fix product bugs, change shared helpers, CI or dependency manifests, or create external resources outside
their assignment. They report a missing helper as a short request: what they tried, the smallest capability needed, and
a proposed test call.

## Models and review

- **Author:** Claude Opus 5.5 by default. GPT-6.1 Sol authors when Opus limits are short; calibration showed Sol strong
  on narrow artifact, process and contract tests.
- **Reviewer:** the other model, in a fresh context, receiving the assignment, baseline, patch and check results. A
  different model catches different blind spots.
- **When to review:** always for priority 1 anchor scenarios, authorization and tenant isolation, secrets, billing,
  data-loss checks, shared helpers and any test deletion. Otherwise the author's fault check is enough; the coordinator
  spot-checks about one in four.
- **Effort:** medium by default; high for shared helpers and authorization.
- **When limits are short:** author priority 1 first and defer reviews of low-risk work. Do not spend limits on model
  comparisons; calibration is finished.

The reviewer checks that the scenario proves the customer outcome, that the fault check reached the intended assertion,
and that removed tests lost no unique protection. Agreement between author and reviewer is not evidence.

## Coordination

One coordinator session owns the queue, write scopes and integration. Keep the queue in the ignored
`.stacktape/qa-initiative/queue.md` with one line per assignment: ID, state (`ready`, `running`, `review`, `done`,
`blocked-bug`, `blocked-helper`), owner, base revision, next action. Run three or four authors at once at most; Docker
and browser lanes compete for the machine.

Give each worker a short packet: assignment ID and outcome, baseline revisions, write scope, helpers and commands to
use, and anything decided that the code does not show. Integrate small patches, rerun affected lanes on the combined
revision, and follow the two-repository commit order for Console changes.

A product bug found during testing goes to a separate fix session with a minimal reproducer, expected and actual
behavior, and the failing test. Keep the failing test on its branch until the fix lands; do not commit it skipped or
asserting the buggy behavior.

Between batches, review helper requests and duplicated setup across the accepted patches. Extract a shared helper when
two accepted assignments need the same capability.

## Done

The overhaul is done when every priority 1 and 2 journey has an anchor scenario that passes on the integrated revision,
each assignment has a recorded disposition, removed tests lost no unique protection, and every heavy lane is selectable
through `test:plan` and part of release qualification. Known product bugs stay listed as blockers until fixed or
explicitly descoped by the owner.
