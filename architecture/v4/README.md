# Stacktape v4 migration

[SIMPLIFIED-MIGRATION.md](./SIMPLIFIED-MIGRATION.md) is the authority for every ongoing and new migration decision. It
supersedes the earlier runtime-extraction plan: the existing CLI implementation is the v4 starting point, applications
move first with the smallest practical set of path and tooling changes, and code is extracted into a package only when
that package has a concrete present-day responsibility and consumer.

The migration must still produce:

- one public repository containing every public application, package, tool, and shared configuration;
- one private Git submodule containing only the Console API and Console UI source;
- stable and pleasant package boundaries based on real capabilities rather than architectural ceremony;
- practical, precisely typed tRPC surfaces without leaking private router or database structure;
- a pnpm and Turborepo workspace that works both with and without the private submodule;
- fast deterministic tests, emulator-assisted integration tests, and selective real-AWS end-to-end tests;
- agent instructions and automation that make the unusual Git topology and generated artifacts difficult to misuse;
- a fresh v4 history while retaining the existing GitHub repository identities.

The migration is allowed to make intentional v4 breaking changes. It must not accidentally alter deployed
CloudFormation identities, resource names, security boundaries, packaging semantics, or customer data migrations.
Every observed v3/v4 difference must be classified as intentional, a preserved contract, a fixed bug, or an
implementation detail.

## Current status

| Area                       | State                                                                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace and Git boundary | Implemented on the public and private `v4/integration` branches. Public clones work without `apps/console`; maintainers pin one private Console submodule.                                                                                        |
| Product applications       | The CLI and private Console API/UI are migrated. Docs and website are buildable Astro shells, not migrated product sites.                                                                                                                         |
| Package boundaries         | `config`, `console-api`, `design-tokens`, `naming`, and `packaging` own concrete code. Helper Lambdas and the broader runtime intentionally remain in the CLI.                                                                                    |
| Validation                 | Public and integrated frozen installs/checks pass in CI. At public commit `f091e541`, the packaging fixture also passed a disposable real-AWS deploy, invocation, shared-layer inspection, cached no-change redeploy, and deletion on 2026-07-30. |
| Not implemented            | Floci integration, the production release/publish pipeline, full docs/website applications, and broader real-AWS canaries.                                                                                                                        |
| Release state              | Publishing is disabled. Repository default branches, production infrastructure, and customer rollout are unchanged. Release blockers remain in `DEFERRED-ISSUES.md`.                                                                              |

## Current documents

- [SIMPLIFIED-MIGRATION.md](./SIMPLIFIED-MIGRATION.md) defines the migration approach, the destination tree, the
  conceptual-complexity budget, the sequence, and the review process. It wins over every other document here.
- [DECISIONS.md](./DECISIONS.md) records pinned decisions, superseded decisions, non-goals, deferred work, and
  remaining gates.
- [AGENT-EXECUTION.md](./AGENT-EXECUTION.md) defines isolated worktrees, implementation/review roles, commit
  integration, and how agents may improve provisional interfaces.
- [TEST-STRATEGY.md](./TEST-STRATEGY.md) defines the deterministic, Floci-certified, and selective real-AWS testing
  strategy and its emulator safeguards.
- [AGENT-INSTRUCTIONS-AUDIT.md](./AGENT-INSTRUCTIONS-AUDIT.md) records what is retained or discarded from the legacy
  `AGENTS.md`, `CLAUDE.md`, and development playbook.
- [dossiers/](./dossiers) holds the per-slice contracts. A dossier is authoritative for its own slice and names its own
  owned paths, gates, and out-of-scope work.

## Historical documents

The documents below describe the **rejected** complex migration: a headless `packages/core` runtime reached through
explicit ports, with `config`, `command-contracts`, `aws`, `naming`, and `helper-lambdas` packages extracted around it.
They are retained for the design research, completed phase-0/wave-0 evidence, and compatibility analysis they record.

They are not instructions. Do not create the packages, interfaces, waves, or gates they describe, and do not cite them
as a reason to move code out of `apps/cli`.

- [TARGET-ARCHITECTURE.md](./TARGET-ARCHITECTURE.md) — the rejected package tree, package responsibilities, and
  dependency directions.
- [ORCHESTRATION-PLAN.md](./ORCHESTRATION-PLAN.md) — the rejected parallel wave, lane, and concurrency plan.
- [MIGRATION-RUNBOOK.md](./MIGRATION-RUNBOOK.md) — the rejected phase sequence and its acceptance gates.

If a current document disagrees with a historical one, with old root instructions, or with old proof-of-concept notes,
the current document wins.
