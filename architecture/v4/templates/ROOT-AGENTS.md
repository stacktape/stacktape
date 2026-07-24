# Stacktape agent guide

## Goal and repository model

This is the public Stacktape v4 monorepo. It must remain fully installable, testable, buildable, and publishable when
the private `apps/console` Git submodule is absent.

- Public apps: `apps/cli`, `apps/docs`, `apps/website`.
- Private Git boundary: `apps/console`, containing `api` and `ui`.
- Reusable capabilities: `packages/*`.
- Architecture and migration decisions: `architecture/v4`.

Never make public code depend on private source. A missing private submodule is a normal public-contributor state, not
an error to work around.

## Before changing code

1. Read the nearest `AGENTS.md` and the relevant package manifest.
2. Check Git status in the public repository and, when present, in `apps/console`.
3. Preserve unrelated changes.
4. For migration work, read the assigned slice dossier and `architecture/v4/AGENT-EXECUTION.md`.
5. Identify generated outputs and behavioral baselines affected by the change.

## Workspace commands

Use pnpm for installation/workspace orchestration and Bun where package scripts intentionally use it.

```sh
pnpm install --frozen-lockfile
pnpm check                 # complete checks available in this checkout
pnpm check:public          # must work without apps/console
pnpm check:integrated      # requires apps/console
pnpm fmt
pnpm fmt:check
pnpm lint
pnpm typecheck
pnpm test
```

Use package/Turbo filters for focused work. Run the narrowest relevant checks during implementation and the documented
gate before handoff. Do not replace a failing check with a broad exclusion.

## Architecture rules

- Applications may import packages; packages never import applications.
- `packages/core` is headless. It does not parse process arguments, call `process.exit`, own global signals, or read
  mutable operation state from module singletons.
- Environmental behavior enters core through explicit context/ports.
- `packages/config`'s default/browser entry imports no Node, filesystem, process, or AWS runtime.
- AWS clients are created through the centralized factory so tests can redirect endpoints and block real AWS.
- Naming and logical-ID algorithms are compatibility-sensitive pure functions.
- Do not create generic `utils`, `common`, or `shared` dumping-ground packages.
- Do not create re-export-only barrel modules. Define explicit package subpath exports.
- Avoid hidden side effects at module import time.
- Prefer narrow types and explicit validation at I/O boundaries. Do not use `any` or unsafe assertions to bridge a
  package boundary.

## tRPC and privacy

- Public external schemas/DTOs/client surfaces live in `packages/console-api`.
- Public artifacts never import private routers or Prisma models.
- Private external routers reuse the public Zod schemas and prove conformance.
- Direct router inference is allowed only inside the private Console repository.
- Keep anonymous, API-key, AWS-identity, and private Console authorization surfaces separately typed and separately
  enforced at runtime.

## UI

- Do not add styled-components or styled-component APIs.
- Console may use Emotion object styles and the `css` prop.
- Docs and website use native Astro/CSS/Tailwind; do not require Emotion for Astro shells.
- Shared tokens come from `packages/design-tokens`.
- `packages/ui-react` components are presentational, router-neutral, and used by at least two consumers.

## Generated files

Turbo tasks own generation dependencies. Humans and agents should not need to remember a separate generation step
before build/typecheck/test.

- Never hand-edit generated output.
- Run the owning package's freshness check after changing canonical inputs.
- Do not commit `*.tsbuildinfo`, caches, release folders, or generated Prisma clients unless the documented policy
  explicitly changes.
- Review generated diffs; do not accept opaque regeneration merely to make CI green.

## Testing and compatibility

Classify behavior changes as `must-preserve`, `intentional-v4-break`, `known-v3-bug`, or `implementation-detail`.

- Protect CloudFormation logical IDs, resource names, replacement-sensitive properties, security scoping, and artifact
  hashing unless an intentional change is approved.
- Prefer semantic assertions and normalized fixtures over large brittle snapshots.
- Add failures/cancellation/cleanup tests, not success-only tests.
- An emulator `CREATE_COMPLETE` is not proof of AWS correctness.
- Tests must fail closed rather than contact real AWS unless a trusted real-AWS lane was explicitly requested.
- Do not deploy or run costed AWS tests without explicit authorization.

## Git and the private submodule

Public-only changes produce a public commit.

For changes spanning Console and public code:

1. Commit private changes inside `apps/console`.
2. Commit public source changes separately.
3. Let the orchestrator integrate the private commit first.
4. Record the final private commit with a public submodule-pointer commit.

Do not force-push, update integration/default branches, push slice branches, or rewrite history unless the orchestrator
explicitly requests it. Never treat a submodule pointer update as an unimportant generated diff.

Implementation agents work only in their assigned isolated worktree. Review agents remain read-only unless assigned a
fix.

## Security

- Never print, copy, commit, or document secret values.
- Instruction files must not contain secret paths or credentials.
- Use one-time/scoped credentials and preserve organization/project/account/invocation authorization boundaries.
- Temporary credentials require cleanup on success, failure, timeout, and non-start.
- Prisma production changes use migrations and `prisma migrate deploy`; never restore `db push --accept-data-loss`.

## Handoff

Report:

- behavior changed and why;
- files/commits changed in each repository;
- tests and artifact gates run;
- intentional compatibility differences;
- unresolved risks or follow-up work;
- whether public-only and integrated checks were exercised.
