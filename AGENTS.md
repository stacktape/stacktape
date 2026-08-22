# Stacktape agent guide

## Repository model

This is the public Stacktape monorepo. `apps/console` is a private Git submodule containing the Console API and UI.
Public clones must install, test, build, and produce release artifacts without that submodule.

- `apps/*` are runnable products: CLI, documentation, init wizard, website, and the private Console.
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
4. Run focused checks while working and the relevant repository gate before handoff.

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

Prefer tests that prove user-visible behavior or a risky contract. Use semantic assertions instead of large snapshots.
Tests must fail closed rather than contact AWS. Do not deploy, publish, rotate credentials, or run costed cloud tests
unless the task explicitly authorizes it.

Never print, copy, commit, or document secret values. Prisma production changes use migrations and
`prisma migrate deploy`; do not use destructive schema push options.

## Git and Console

For work spanning both repositories:

1. Commit and push Console changes inside `apps/console`.
2. Run `pnpm console:pointer:verify` from the public root.
3. Commit the public changes and updated submodule pointer separately.

Use worktrees provided by Codex or Claude Code. Do not add repository-specific worktree lifecycle scripts. Never treat a
submodule pointer as generated noise, and do not rewrite shared history without explicit approval.

## Communication

- Write for a mid-level or senior software engineer with working AWS knowledge. Explain project-specific context and do
  not assume the reader remembers a long session.
- Make the message easy and pleasant to follow. Use plain speech, active voice, and name the actor.
- Remove filler, unnecessary jargon, sycophancy, and chatbot phrases such as “Certainly” or “Found the smoking gun.”
- Split dense sentences. If a reader must backtrack to parse one, shorten it.
- Give sections a clear purpose and order. Do not turn a response into unrelated headings or a wall of text.
- Group questions together, preferably at the end.

In the handoff, state what behavior changed, which checks ran, and what remains uncertain. Mention new concepts only
when they help the reader understand or maintain the result.
