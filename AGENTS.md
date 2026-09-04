# Stacktape agent guide

## Repository model

This is the public Stacktape monorepo. `apps/console` is a private Git submodule containing the Console API and UI.
Public clones must install, test, build, and produce release artifacts without that submodule.

- `apps/*` are runnable products: CLI, documentation, init wizard, website, VS Code extension, and the private Console.
- `packages/*` are capabilities with real consumers. Packages never import applications.
- Public code never imports private Console source.
- [`docs/architecture.md`](docs/architecture.md) describes package ownership and dependency direction.

Do not create a package, abstraction, compatibility layer, or generic `shared`/`utils` area without a concrete current
need. Prefer the simplest complete implementation. Stacktape v4 may make deliberate breaking changes; do not preserve
obsolete v3 behavior by default.

## Before changing code

1. Read the nearest `AGENTS.md` and package manifest.
2. Check Git status here and, when initialized, in `apps/console`. Preserve unrelated changes.
3. Identify generated files, package boundaries, and behavior that the change can affect.
4. Run `pnpm test:plan` (or `pnpm test:plan -- --since=<ref>`) and choose evidence for each affected failure boundary.
5. Run focused checks while working and the relevant repository gate before handoff.

Use pnpm for workspace orchestration and Bun where package scripts already use it.

```sh
pnpm install --frozen-lockfile
pnpm check:public       # works without apps/console
pnpm check:integrated   # includes the private submodule
pnpm fmt
pnpm lint
pnpm typecheck
pnpm test
```

[`docs/development.md`](docs/development.md) covers local apps and the source-built CLI. Real AWS tests are opt-in and
documented in [`apps/cli/scripts/real-aws/README.md`](apps/cli/scripts/real-aws/README.md).
[`docs/testing.md`](docs/testing.md) is the canonical test-selection, Console E2E, live-AWS, cost, cleanup, and evidence
policy. Read it before adding a test or running a live scenario.

For Console work, `pnpm dev:console:ui` is only for UI changes that can use the deployed dev API. Use `pnpm dev:console`
for every API change, API/UI contract change, or behavioral API test. It runs the UI and API locally against the shared
dev data plane while deployed dev Lambdas continue to handle webhooks and background work.

## Architecture and code

- Keep applications as composition roots. Extract only stable, reusable capabilities into packages.
- Use explicit package subpath exports. Do not add re-export-only barrel modules.
- Avoid hidden work at module import time.
- Validate I/O at the boundary and use narrow types across boundaries. Do not use `any` to bridge them.
- Preserve CloudFormation logical IDs, physical names, artifact hashes, IAM scope, and replacement-sensitive properties
  unless the task intentionally changes them.
- Keep anonymous, API-key, AWS-identity, and Console-session tRPC surfaces separately typed and enforced at runtime.
- Public tRPC schemas live in `packages/console-api`; private Console routers may infer types directly inside the
  submodule.
- Shared UI belongs in `packages/ui-react` only when it has a real second consumer. Components stay router-neutral and
  use explicit subpath exports. Shared visual values belong in `packages/design-tokens`.

The dependency and cycle rules run through `pnpm check:architecture`. Do not silence a new violation by refreshing the
known-violations file.

## Generated files

[`docs/generated-files.md`](docs/generated-files.md) defines ownership and output classes.

- Never hand-edit generated output.
- Run the owner's non-mutating `generate:check` after changing canonical input.
- Review generated diffs instead of accepting regeneration only to make CI pass.
- Do not commit caches, `*.tsbuildinfo`, release directories, or ignored materializations.

## Tests and external systems

Tests must prove user-visible behavior or a risky contract at the boundary where it can fail. Do not accept mock call
choreography, source-text inspection, or a unit test as the only evidence for behavior that crosses a process, database,
browser, provider, artifact-runtime, or AWS boundary. Use semantic assertions instead of large snapshots. Run
`pnpm test:doctor` before a long lane and report commands with the behavior each one proved.

Normal test commands must fail closed rather than contact AWS. The repository owner has authorized agents to run
development-only Console deployments, `devlocal` refreshes, test AMI builds, and explicitly named disposable AWS stacks
without asking for every run. These operations must verify the account and region, use unique owned resources, minimize
expensive resource lifetime, record recovery state, clean up after success or failure, and verify deletion. Production
deployment, migration, publishing, and credential rotation still require explicit authorization.

Never print, copy, commit, or document secret values. Prisma production changes use migrations and
`prisma migrate deploy`; do not use destructive schema push options.

For a Console schema change, commit an append-only migration under `apps/console/api/prisma/migrations`, update the
adoption ledger in `apps/console/api/scripts/migrate-db.ts`, and run the migration-history tests. Apply it to the shared
dev database with `pnpm migrate:console:dev`. Run `pnpm migrate:console` only with explicit production authorization;
normal Console deployments already run that migration path automatically.

## Git and Console

For work spanning both repositories:

1. Commit and push Console changes inside `apps/console`.
2. Run `pnpm console:pointer:verify` from the public root.
3. Commit the public changes and updated submodule pointer separately.

Use worktrees provided by Codex or Claude Code. Do not add repository-specific worktree lifecycle scripts. Never treat a
submodule pointer as generated noise, and do not rewrite shared history without explicit approval.

## Communication

At the start of every agent session, before the first user-facing update or response, read `.agents/skills/wtf/SKILL.md`
completely and apply it to all user-facing writing. This requirement applies automatically; `$wtf` in Codex or `/wtf` in
Claude Code can reapply the guide explicitly.
