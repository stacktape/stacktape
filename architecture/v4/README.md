# Stacktape v4 migration

This directory is the authoritative design and execution contract for the Stacktape v4 monorepo migration.

The goal is not merely to move files into a monorepo. The migration must produce:

- one public repository containing every public application, package, tool, and shared configuration;
- one private Git submodule containing only the Console API and Console UI source;
- a headless, testable `@stacktape/core` with explicit operation context and environmental ports instead of
  process-global managers;
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

## Documents

- [DECISIONS.md](./DECISIONS.md) records pinned decisions, non-goals, deferred work, and remaining gates.
- [TARGET-ARCHITECTURE.md](./TARGET-ARCHITECTURE.md) defines the repository tree, package responsibilities, and
  dependency directions.
- [AGENT-EXECUTION.md](./AGENT-EXECUTION.md) defines isolated worktrees, implementation/review roles, commit
  integration, and how agents may improve provisional interfaces.
- [ORCHESTRATION-PLAN.md](./ORCHESTRATION-PLAN.md) defines migration waves, dependencies, integration checkpoints,
  and the context every slice dossier must carry.
- [AGENT-INSTRUCTIONS-AUDIT.md](./AGENT-INSTRUCTIONS-AUDIT.md) records what is retained or discarded from the legacy
  `AGENTS.md`, `CLAUDE.md`, and development playbook.
- [MIGRATION-RUNBOOK.md](./MIGRATION-RUNBOOK.md) defines the ordered migration phases and acceptance gates.
- [TEST-STRATEGY.md](./TEST-STRATEGY.md) defines the deterministic, Floci-certified, and selective real-AWS testing
  strategy and its emulator safeguards.

If these documents disagree with old root instructions, old proof-of-concept notes, or historical structure, these
documents win after they are approved and copied into the v4 backbone.
