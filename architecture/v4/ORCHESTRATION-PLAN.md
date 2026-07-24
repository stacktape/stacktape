# Stacktape v4 orchestration plan

## Mission

Migrate the current Stacktape and private Console products into the fresh v4 histories without treating the work as a
directory shuffle. The result must be easier to test and compose, pleasant to use from TypeScript, safe for existing
customer infrastructure, and fully usable by public contributors without Console source.

The end state has:

- public `apps/cli`, `apps/docs`, and a fresh Astro `apps/website`;
- one private `apps/console` submodule containing `api` and `ui`;
- the capability packages in `TARGET-ARCHITECTURE.md`, including headless `core`, packaging, design tokens, and
  router-neutral React UI;
- direct private Console API-to-UI tRPC inference plus explicit public contract routers and surface-specific clients;
- pnpm, Turbo, TypeScript 6, Oxlint, Oxfmt, and dprint only for Astro;
- meaningful deterministic, artifact, emulator, browser, and separately authorized AWS test lanes;
- no SDK, Vite+, styled-components, generic shared package, or artificial domain/infrastructure split.

The orphan histories intentionally omit legacy Git history. Old `main` refs remain read-only source and behavior
references until cutover. No deployment, default-branch change, force-push, release, credential rotation, or historical
secret rewrite is implied by migration work.

## Orchestrator invariants

The orchestrator owns both `v4/integration` branches and is the only writer to the public submodule pointer.

Before every dispatch it:

1. starts from clean, synchronized public and private integration refs;
2. writes a dossier using the complete template in `AGENT-EXECUTION.md`;
3. records exact legacy refs, prerequisite v4 commits, owned paths, frozen shared paths, and acceptance commands;
4. creates an isolated worktree with `pnpm worktree:create`;
5. assigns one implementer and a distinct read-only reviewer;
6. integrates private commits first, public source second, and the final private pointer last;
7. runs focused checks after each slice and fresh public/integrated clones at wave gates;
8. updates a migration matrix with preserved behavior, intentional v4 breaks, known v3 bugs, and remaining risks.

An implementer reads legacy files through Git refs or clean legacy checkouts. It never copies legacy repository
metadata into v4. Agents never coordinate through uncommitted sibling-worktree files; they consume integration commits.

Interfaces are provisional until exercised. Local improvements with tests are welcome. Shared seam changes use the
proposal protocol in `AGENT-EXECUTION.md` and are integrated before dependent work continues.

## Migration waves

### Wave 0 — safety and backbone

Status: complete.

- freeze security and behavior baselines;
- establish fresh public/private histories;
- prove public-absent and integrated installs;
- prove tRPC privacy boundaries;
- establish tooling, hooks, worktree safety, packageability, and agent instructions.

### Wave 1 — compatibility primitives

These slices can mostly run in parallel because they own narrow pure boundaries:

1. **Naming compatibility:** move logical-ID and physical-name algorithms into `packages/naming`; import exhaustive
   legacy fixtures and property invariants.
2. **Command contracts and machine protocol:** extract option/input/result contracts into
   `packages/command-contracts`; intentionally specify v4 JSONL and retain subprocess CLI characterization.
3. **Config model and schema generation:** establish the browser-safe config entry, explicit Node loader subpaths,
   directive/reference validation, and deterministic schema/editor outputs.
4. **Packaging foundation:** move deterministic selection, hashing, buildpack contracts, and artifact tracking into
   `packages/packaging`; import helper-Lambda ownership without changing artifacts.
5. **Console public contracts:** replace examples with real anonymous, API-key, and AWS-identity schemas and clients
   while preserving the private boundary.

Serialize collisions in config types, package exports, generated-schema ownership, or public tRPC contracts. Gate the
wave on characterization and artifact equivalence, not merely typecheck.

### Wave 2 — core foundation and synthesis

First run one serialized foundation slice:

- explicit operation identity and context;
- clock, IDs, cancellation, structured events/results, prompts, filesystem/process/network ports;
- centralized AWS client factory with endpoint overrides and fail-closed test mode;
- Console/control-plane and packaging ports;
- CLI composition root;
- proof that two operations can coexist without shared mutable state.

Then migrate configuration-to-template synthesis vertically. It consumes the integrated config, naming, AWS, and
packaging seams and must reproduce normalized legacy templates for dense fixtures. Old app-manager globals begin
disappearing here; do not replace them with a singleton facade.

### Wave 3 — lifecycle operations

Migrate complete behaviors rather than managers:

1. plan/change-set/no-op;
2. deploy/create/update and progress events;
3. rollback/failure classification;
4. cancellation, signals, and cleanup;
5. delete and repeated/failed delete;
6. stack info, outputs, drift, and logs;
7. local development and long-running processes;
8. remaining commands.

Each slice crosses core, AWS adapters, CLI composition, events, and tests as needed. Every failure path proves cleanup.
Logical IDs, names, replacement-sensitive properties, IAM intent, and artifact hashes remain must-preserve unless the
migration matrix explicitly approves a v4 difference.

### Wave 4 — private Console product

Run private work only from integrated public contracts:

1. import the Console API and reviewed Prisma migrations;
2. retain `prisma migrate deploy` and adoption for databases previously managed by `db push`;
3. migrate real external routers onto public Zod schemas with compile-time conformance;
4. preserve separate anonymous, API-key, AWS-identity, and session authorization;
5. import Console UI and use TanStack's tRPC React Query integration with direct private inference;
6. replace legacy sibling-source aliases with public workspace packages;
7. remove generated private router declarations and cross-repository write-back generation;
8. add backend, migration, UI, and browser regression coverage.

Private and public commits are reviewed as one logical slice whenever contracts change.

### Wave 5 — docs, website, and UI sharing

- adapt Console's Emotion tokens to `packages/design-tokens`;
- generate deterministic CSS variables for Astro consumers;
- migrate docs;
- keep website a fresh Astro implementation—do not import the old Next.js project or history;
- add `ui-react` components only after at least two real consumers need the same presentational component;
- keep routing adapters inside apps and never introduce styled-component APIs.

No watch process is required for correctness. Turbo makes one-shot generation a dependency of build, typecheck, and
tests. Add native watch mode only when it materially improves a real human development loop.

### Wave 6 — release and layered verification

- restore the checksum-generating release pipeline and verify the packed npm launcher before enabling publish;
- retain npm trusted publishing/OIDC provenance identity;
- run deterministic whole-core, synthesis, packaging, CLI-process, static CloudFormation, helper-Lambda, and browser
  gates;
- certify only the declared Floci subset and reject stub resources or real-AWS egress;
- run real AWS canaries only after separate authorization, cost controls, OIDC roles, and cleanup controls;
- rehearse Console-first database/backend rollout before compatible CLI clients;
- obtain explicit approval before default-branch changes, publishing, or deployment.

## Concurrency map

| Lane | Primary work                       | May run beside                                         | Must wait for                  |
| ---- | ---------------------------------- | ------------------------------------------------------ | ------------------------------ |
| A    | naming compatibility               | command contracts, Console contract analysis           | wave 0                         |
| B    | command contracts/JSONL            | naming, packaging fixtures                             | wave 0                         |
| C    | config/schema                      | naming, Console contract analysis                      | wave 0                         |
| D    | packaging/helper Lambdas           | naming, command contracts                              | config type ownership decision |
| E    | Console contracts/router migration | public pure-package slices                             | relevant public contracts      |
| F    | core foundation                    | read-only fixture/review agents only                   | wave-1 seams                   |
| G    | synthesis/lifecycle                | one implementation slice at a time; parallel reviewers | core + required pure packages  |
| H    | docs/tokens/UI                     | lifecycle work with disjoint paths                     | design-token seam              |

Root tooling, package catalogs, foundational ports, public tRPC contracts, Prisma, naming algorithms, release assembly,
and the private pointer are serialized integration surfaces.

## Phase-gate evidence

At each wave gate the orchestrator records:

- public and private commit ranges;
- fresh public-only and recursive-submodule clone results;
- behavior classifications and normalized fixture diffs;
- package, CLI, helper-Lambda, and release artifact results;
- test counts by deterministic/emulator/browser/AWS layer;
- customer-infrastructure and security risks reviewed;
- unresolved risks and the exact next prerequisite.

Passing an emulator or typecheck never substitutes for artifact equivalence, runtime authorization, or real AWS
behavior where AWS itself is the only oracle.
