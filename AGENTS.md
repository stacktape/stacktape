# Stacktape agent guide

## Goal and repository model

This is the public Stacktape v4 monorepo. It must remain fully installable, testable, buildable, and publishable when
the private `apps/console` Git submodule is absent.

- Public apps: `apps/cli`, `apps/docs`, `apps/website`.
- Private Git boundary: `apps/console`, containing `api` and `ui`.
- Reusable capabilities: `packages/*`.
- Architecture and migration decisions: `architecture/v4`.

Never make public code depend on private source. A missing private submodule is a normal public-contributor state.

## Before changing code

1. Read the nearest `AGENTS.md`, the relevant package manifest, and the applicable `architecture/v4` documents.
2. Check Git status in the public repository and, when present, in `apps/console`.
3. Preserve unrelated changes and identify generated outputs and behavioral baselines affected by the change.
4. Migration agents work only in their assigned worktree and dossier.

## Commands

Use pnpm for installation and workspace orchestration. Bun remains valid inside scripts that intentionally use it.

```sh
pnpm install --frozen-lockfile
pnpm check:public
pnpm check:integrated
pnpm fmt
pnpm fmt:check
pnpm lint
pnpm typecheck
pnpm test
```

Turbo makes generation a dependency of build/typecheck/test; do not rely on humans remembering a manual generation
step. Use package filters for focused work. Do not weaken a failing gate with a broad exclusion.

## Architecture

- Applications may import packages; packages never import applications.
- `packages/core` is headless: no argument parsing, `process.exit`, global signals, or mutable operation singleton.
- Environmental behavior enters core through explicit context/ports.
- The default/browser entry of `packages/config` imports no Node, filesystem, process, or AWS runtime.
- Centralize AWS client creation so tests can redirect endpoints and prohibit accidental real-AWS calls.
- Treat naming/logical-ID behavior as compatibility-sensitive.
- Do not create generic `utils`, `common`, or `shared` packages.
- Do not create re-export-only barrel modules; use explicit package subpath exports.
- Prefer narrow types and validation at I/O boundaries. Do not bridge package boundaries with `any`.

## tRPC and privacy

- Public schemas, DTOs, contract routers, and surface-specific client factories live in `packages/console-api`.
- Public artifacts never import private routers or Prisma models.
- Private external routers reuse the public Zod schemas and prove contract conformance.
- Direct router inference is allowed only between the private Console API and UI.
- Keep anonymous, API-key, AWS-identity, and private Console auth surfaces separately typed and enforced.

## UI

- Never introduce styled-components or styled-component APIs.
- Console may use Emotion object styles and the `css` prop.
- Docs and website use Astro/CSS/Tailwind and do not require Emotion.
- Share canonical values through `packages/design-tokens`.
- Shared React components are presentational, router-neutral, styling-system-neutral at their API boundary, and used by
  at least two applications.

## Generated files and tests

- Never hand-edit generated output. Every generator declares inputs, outputs, and a freshness check.
- Classify behavior as `must-preserve`, `intentional-v4-break`, `known-v3-bug`, or `implementation-detail`.
- Protect CloudFormation identities, physical names, replacement-sensitive properties, security scoping, and artifact
  hashes unless a reviewed v4 change explicitly says otherwise.
- Tests fail closed instead of contacting real AWS. Emulator success is not proof of AWS correctness.
- Do not deploy or run costed AWS tests without explicit authorization.

## Git and security

- For cross-repository changes, commit private Console changes first and the public submodule pointer last.
- Only the orchestrator updates integration branches or submodule pointers. Never force-push.
- Never print, copy, commit, or document secret values.
- Use reviewed Prisma migrations and `prisma migrate deploy`, never production `db push`.
- Preserve temporary-credential cleanup on success, failure, timeout, and non-start.

## Handoff

Report behavior and rationale, commits per repository, validation, compatibility classifications, unresolved risks, and
whether public-only and integrated checks ran.
