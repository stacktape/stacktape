# Stacktape v4 migration runbook

## End state

Stacktape v4 is complete when:

- the public repository is a pnpm/Turbo monorepo and is fully useful to public contributors without private source;
- `apps/console` is the only private submodule and contains the Console API and UI;
- CLI, docs, and fresh Astro website are applications with independent tasks and clear release/deployment ownership;
- coherent reusable capabilities live in the packages defined by `TARGET-ARCHITECTURE.md`;
- `packages/core` runs operations in process with explicit context, no process-global operation state, and meaningful
  deterministic tests;
- Console API/UI and every external auth surface remain practical and precisely typed with tRPC;
- npm package/binary/helper-Lambda/release artifacts are verified;
- existing customer infrastructure does not receive accidental logical-ID/name/property replacements;
- v4 intentional breaking changes are documented rather than hidden in structural churn;
- public-only, integrated private, emulator, and authorized real-AWS gates have named owners and cadences.

## Phase 0 — preflight and safety

Status: complete. No deployment was performed.

- Console security hardening committed: `b098a76`.
- Stacktape credential hardening committed: `747d6371`.
- Prisma baseline/adoption migrations tested with zero drift.
- No security deployment performed.
- Required credential secrets created/restored without recording values.
- Public/private Git and pnpm proof of concept validated.
- Contract-first tRPC POC updated to TypeScript 6 and validated in integrated and absent-submodule worktrees.
- Parent-plus-private-submodule worktree isolation validated.

Completed phase-0 evidence:

1. Reusable characterization tests cover CLI semantics, config loading, packaging, tRPC auth surfaces, dense
   credential-free synthesis, the packed npm artifact, and all helper-Lambda artifacts.
2. The dense synthesis fixture captures 88 CloudFormation resources with logical-ID, physical-name, dependency,
   deletion-policy, reference, output, and semantic assertions.
3. `TEST-STRATEGY.md` records the Floci-certified/real-AWS strategy and emulator safeguards.
4. Release archive checksums are generated, published, packaged into npm, and verified before extraction. Historical
   pinned releases remain installable through an explicit version cutoff because they predate checksum manifests.
5. The architecture documents and root/private agent-instruction templates are ready for backbone validation.
6. The contract-first tRPC and isolated public/private worktree POCs pass.
7. Independent review of the characterization and release-integrity changes is complete; every reported finding was
   resolved and the final review found no remaining blocker.

The phase-0 characterization, checksum, and architecture freeze is committed on the legacy public branch at
`17aef681`. The reviewed Console and Stacktape security baselines remain `b098a76` and `747d6371`.

Gate:

- current repositories remain releasable;
- no unreviewed dirty security work;
- characterization and artifact gates pass;
- checksum tampering test passes;
- the decision register has no migration-blocking ambiguity.

The explicitly deferred credential rotation, historical secret scan, website import, and deployment are not phase-0
gates.

## Phase 1 — create the fresh backbone

Status: complete on non-default branches. Legacy product migration has not started.

Create fresh/orphan `v4/integration` histories in the existing public and private repositories. Do not change or
force-update default branches.

Public backbone:

- pnpm workspace with globs that tolerate absent `apps/console`;
- pnpm non-shared workspace lockfiles, as validated by the public/private POC;
- pinned package manager and runtime versions;
- Turbo task graph;
- TS6 base configurations;
- Oxlint/Oxfmt/dprint and architecture checks;
- root `AGENTS.md` and `CLAUDE.md` compatibility strategy;
- empty target app/package directories with scoped package manifests;
- fresh Astro `apps/website`;
- public-only CI;
- release workflow skeleton preserving npm OIDC/provenance identity;
- agent worktree scripts.

Private backbone:

- `api` and `ui` application manifests;
- standalone private `AGENTS.md`;
- integrated CI that accepts a public Git ref and mounts itself at `apps/console`;
- no duplicate public tooling configurations unless needed to bootstrap the private CI checkout.

Gate:

- clean public clone without submodule passes frozen install and all available checks;
- integrated clone passes the same checks plus private contract tests;
- two concurrent disposable agent worktrees initialize independent private checkouts;
- no default branch or production system changed.

Evidence:

- private Console backbone through `7185b84`;
- public backbone through `69e36163`, recording that private commit;
- frozen installs and complete checks pass in fresh public-only and recursive-submodule clones;
- public and integrated GitHub Actions pass;
- durable tests exercise independent private worktrees, wrong-base/collision/dossier rejection, cleanup refusal for an
  unpushed or remotely pruned private commit, staged and tracked-tree secret detection, tRPC surface isolation, and an
  externally installed/running CLI package;
- release publishing remains intentionally disabled in the v4 `release.yml` identity placeholder.

## Phase 2 — behavior-preserving structural import

Import current source snapshots into the backbone without importing historical Git graphs:

1. Move the public CLI/engine/release assembly to `apps/cli`.
2. Move docs to `apps/docs`.
3. Move helper Lambdas to `packages/helper-lambdas`.
4. Extract existing command option contracts rather than redesigning them.
5. Extract browser-safe config model and schema tooling.
6. Move deterministic naming and reusable AWS code to their named packages.
7. Move existing packaging code to `packages/packaging`, using temporary adapters where globals remain.

This phase changes paths and package imports, not core behavior.

Gate:

- characterization tests pass;
- normalized synthesis baselines match or every difference is classified;
- npm package files, bins, exports, config-authoring types, and binary inputs match the approved baseline;
- all helper Lambda artifacts build and pass structural checks;
- docs builds;
- no package imports an app;
- no public package imports private source;
- public-only clone remains green.

## Phase 3 — integrate the private Console boundary

1. Import the current Console snapshot into the private `api` and `ui` applications.
2. Preserve the reviewed Prisma migration history and deployment order.
3. Replace sibling-path/Vite aliases into Stacktape source with workspace package imports.
4. Create the real `@stacktape/console-api` from the contract-first POC.
5. Make private external routers reuse public Zod schemas and prove input/output conformance.
6. Keep direct private router inference for Console UI.
7. Migrate Console UI to TanStack's tRPC React Query client.
8. Delete the old cross-repository type write-back generator and generated Console router declarations.
9. Add public/private CI and pointer-update automation.

Gate:

- anonymous, API-key, AWS-identity, and private Console surfaces are independently typed and runtime-protected;
- forbidden procedures fail type tests and runtime auth tests;
- no Prisma/private router structure appears in public package output;
- Console API tests, UI build, and browser smoke checks pass;
- public-only clone has no private dependency or lockfile requirement;
- database migration deployment command remains `prisma migrate deploy`.

## Phase 4 — refactor the runtime vertically into `packages/core`

This is not one “move core” task. Begin with a serialized foundation slice:

### Foundation slice

- explicit operation identity/context;
- clock and ID ports;
- cancellation token;
- structured result/event sink;
- centralized AWS client factory;
- Console/control-plane port;
- filesystem/process/prompt ports;
- composition root in CLI;
- hard safety mode preventing tests from reaching real AWS.

The foundation is provisional until the first two behavior slices exercise it. Avoid prematurely general frameworks.

### Behavior slices

Recommended order, adjusted by the orchestrator after dependency inspection:

1. Configuration load, directives, validation, and synthesis.
2. Artifact packaging and content tracking.
3. Deployment planning, change sets, deploy/update/no-op.
4. Rollback, failure reporting, cancellation, and cleanup.
5. Delete and repeated/failed delete.
6. Stack info, outputs, drift, and other read operations.
7. Remote runners and Console operation reporting.
8. Local development/emulation and long-running process behavior.
9. Remaining commands and removal of the old alternate server lifecycle.

Each slice:

- runs old and new implementations against applicable fixtures;
- preserves logical IDs/names unless a difference is approved;
- replaces accessed globals with context/ports rather than introducing a new singleton facade;
- adds deterministic success and failure tests;
- receives independent review;
- removes obsolete global behavior only after all consumers move.

Gate:

- more than one operation can run independently in a process test;
- core never calls `process.exit` or owns global signals;
- no manager requires module-import-time mutable operation state;
- deterministic core suite covers deploy/update/delete/failure/cancellation semantics;
- package dependency rules pass;
- CLI behavior and artifacts pass;
- public/private integrated tests pass.

## Phase 5 — design tokens, shared UI, docs, and website shell

1. Create TypeScript-canonical design primitives and product semantic themes.
2. Add typed CSS variable references and deterministic CSS/Tailwind emission.
3. Add committed generated CSS freshness checks.
4. Adapt Console's existing Emotion tokens through compatibility aliases rather than rewriting every component.
5. Make docs consume the shared tokens and recipes.
6. Bootstrap the fresh Astro website without importing the old implementation/history.
7. Promote only genuinely shared router-neutral React components into `ui-react`.

Gate:

- tokens generate deterministically;
- Astro uses static CSS without requiring Emotion;
- Console continues to support Emotion's `css` prop;
- no styled-components API;
- visual smoke/selected screenshot tests pass;
- website contains only new scaffold/content intentionally added in v4.

## Phase 6 — tooling and dependency modernization

Tooling exists from the backbone; this phase removes migration adapters and completes upgrades:

- eliminate remaining ESLint/Prettier configuration;
- enable the approved Oxlint rule set with no broad warning baseline;
- run Oxfmt/dprint once as an intentional v4 baseline;
- normalize dependency versions/catalogs with Sherif;
- remove dead dependencies/exports/files with Knip;
- enforce package directions and no-barrel patterns;
- verify publishable packages with publint;
- update dependencies per owning package with tests;
- retain TS6 authoritative until TS7/programmatic API constraints are deliberately revisited.

Gate:

- zero lint/format errors;
- strict typecheck passes;
- architecture/dead-code/workspace/package checks pass;
- no formatter/linter duplication;
- generated files and caches follow the documented policy.

## Phase 7 — layered integration and end-to-end verification

Use the approved layered strategy:

- deterministic whole-core, packaging, synthesis, CLI process, and static CloudFormation validation on every change;
- Floci only for a machine-declared supported subset, with stub detection and data-plane assertions;
- trusted real-AWS cheap canary on main/merge queue;
- broader stateful/container/edge/multi-account suites nightly, weekly, or before release.

Real AWS activity requires explicit authorization, OIDC roles, isolated test accounts, cost ceilings, tags, janitor
cleanup, and fork-safe CI. An emulator `CREATE_COMPLETE` alone is never sufficient.

Gate:

- deploy/no-op/update/failure/rollback/delete/cancellation matrix passes at its assigned layers;
- Floci tests fail on unclassified/stub resources;
- authorized AWS canary records clean deletion and orphan audit;
- failures identify whether Stacktape, the emulator, or AWS behavior caused the issue.

## Phase 8 — release cutover

Before changing default branches:

1. Run clean public-only and integrated clones.
2. Run complete deterministic/artifact/browser/emulator gates.
3. Run authorized real-AWS release suites.
4. Test database migration and Console-first rollout order in an approved environment.
5. Build release archives and verify checksums through the npm launcher.
6. Compare npm package and install paths against the approved v4 release contract.
7. Document all intentional breaking changes and migration instructions.
8. Obtain explicit approval for default-branch/history changes and deployment.

Only then:

- push the reviewed private v4 history;
- record its final submodule pointer;
- push the public v4 history;
- change default branches or replace main as explicitly approved;
- deploy Console before compatible Stacktape clients;
- publish v4.

## Stop conditions

The orchestrator pauses integration when:

- a slice changes deployed logical IDs/names without an explicit classification;
- public CI requires private credentials/source;
- a public artifact exposes private router/Prisma structure;
- Prisma would fall back to `db push`;
- tests can accidentally contact real AWS;
- an agent needs to rewrite shared history or force-push without explicit approval;
- an interface dispute affects multiple active slices and cannot be localized;
- a migration gate is weakened merely to make structural progress appear green.
