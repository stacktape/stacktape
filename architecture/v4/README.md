# Stacktape v4 architecture record

The v4 repository migration is complete. This directory preserves its decisions, evidence, rejected alternatives and
deferred work; it is not a live orchestration plan. For current work, start with the root `AGENTS.md`, the code, and
focused guides such as [`architecture/GENERATION.md`](../GENERATION.md). [DECISIONS.md](./DECISIONS.md) remains useful
architectural context, while [SIMPLIFIED-MIGRATION.md](./SIMPLIFIED-MIGRATION.md) records how the monorepo was created.

The migration must still produce:

- one public repository containing every public application, package, tool, and shared configuration;
- one private Git submodule containing only the Console API and Console UI source;
- stable and pleasant package boundaries based on real capabilities rather than architectural ceremony;
- practical, precisely typed tRPC surfaces without leaking private router or database structure;
- a pnpm and Turborepo workspace that works both with and without the private submodule;
- fast deterministic tests, emulator-assisted integration tests, and selective real-AWS end-to-end tests;
- agent instructions and automation that make the unusual Git topology and generated artifacts difficult to misuse;
- a fresh v4 history while retaining the existing GitHub repository identities.

The migration may redesign customer-facing configuration and CLI behavior without maintaining a v3 compatibility ledger.
Broad product changes should be discussed and the chosen v4 contract tested directly. Structural work must not
accidentally alter deployed CloudFormation identities, resource names, security boundaries, packaging semantics, or
customer data migrations.

## Current status

| Area                       | State                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace and Git boundary | Implemented on `main`. Public clones work without `apps/console`; maintainers pin one private Console submodule.                                                                                                                                                                                                                                                                                                     |
| Product applications       | The CLI, the public documentation site, and the private Console API/UI are migrated. `apps/website` is still a buildable Astro shell, not a migrated product site.                                                                                                                                                                                                                                                   |
| Package boundaries         | `config`, `console-api`, `design-tokens`, `naming`, and `packaging` own concrete code. Helper Lambdas and the broader runtime intentionally remain in the CLI.                                                                                                                                                                                                                                                       |
| Validation                 | Public and integrated frozen installs/checks pass in CI. At public commit `f091e541`, the packaging fixture also passed a disposable real-AWS deploy, invocation, shared-layer inspection, cached no-change redeploy, and deletion on 2026-07-30.                                                                                                                                                                    |
| Not implemented            | Floci integration, the full website application, mutable schema/AI-documentation release cutover, and broader real-AWS canaries beyond the packaging fixture.                                                                                                                                                                                                                                                        |
| Release state              | One manually dispatched workflow builds identical preview/stable artifacts. Protected OIDC jobs publish npm/GitHub and then the matching S3/CloudFront installer endpoint; releases never deploy a Stacktape project or use a Stacktape API key. AWS and GitHub configuration is provisioned, while npm trusted-publisher activation remains an npm-owner action documented in [`RELEASING.md`](../../RELEASING.md). |

## Migration records

- [SIMPLIFIED-MIGRATION.md](./SIMPLIFIED-MIGRATION.md) records the migration approach, destination tree,
  conceptual-complexity budget, sequence, and review process.
- [DECISIONS.md](./DECISIONS.md) records pinned decisions, superseded decisions, non-goals, deferred work, and remaining
  gates.
- [AGENT-EXECUTION.md](./AGENT-EXECUTION.md) records the migration's isolated-worktree and review process. Use the
  current root instructions for new work.
- [TEST-STRATEGY.md](./TEST-STRATEGY.md) defines the deterministic, Floci-certified, and selective real-AWS testing
  strategy and its emulator safeguards.
- [AGENT-INSTRUCTIONS-AUDIT.md](./AGENT-INSTRUCTIONS-AUDIT.md) records what is retained or discarded from the legacy
  `AGENTS.md`, `CLAUDE.md`, and development playbook.
- [dossiers/](./dossiers) holds the completed per-slice contracts and their historical gates.

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
