# Stacktape agent guide

## Goal and repository model

This is the public Stacktape v4 monorepo. It must remain fully installable, testable, buildable, and capable of
producing and validating release artifacts when the private `apps/console` Git submodule is absent. Manually selected
preview and stable releases build identical artifacts; protected jobs publish npm/GitHub and the matching installer
endpoint with separate short-lived OIDC identities.

- Public apps: `apps/cli`, `apps/docs`, `apps/website`.
- Private Git boundary: `apps/console`, containing `api` and `ui`.
- Reusable capabilities with current consumers: `packages/*`.
- Active architecture decisions: `architecture/v4/DECISIONS.md`.

Never make public code depend on private source. A missing private submodule is a normal public-contributor state, not
an error to work around.

## Before changing code

1. Read the nearest `AGENTS.md` and the relevant package manifest.
2. Check Git status in the public repository and, when present, in `apps/console`.
3. Preserve unrelated changes.
4. Read the focused architecture guide for the area you are changing. In particular, generated-file work starts at
   `architecture/GENERATION.md`; the completed v4 migration records under `architecture/v4` are context, not a live
   implementation plan.
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

`DEVELOPMENT.md` is the practical companion to this guide: credentials, the development-built CLI, semi-local `dev`
mode, and the guarded real-AWS validation lane including the reusable packaging smoke stack.

## Architecture rules

- Applications may import packages; packages never import applications.
- The existing CLI implementation is the v4 starting point. Do not build a parallel runtime or compatibility shell.
- Create a package only for a concrete present-day responsibility or consumer. Empty and speculative packages are not
  architecture.
- V4 may redesign customer-facing configuration and CLI behavior. Do not add v3 compatibility shims or maintain a
  general compatibility-removal ledger. Discuss broad product changes, then test the chosen v4 contract directly.
- Structural refactors must still avoid accidental infrastructure replacement, data loss, security-scope changes, or
  packaging/release drift. Change those behaviors only as an explicit product decision.
- Do not create generic `utils`, `common`, or `shared` dumping-ground packages.
- Do not create re-export-only barrel modules. Define explicit package subpath exports.
- Avoid hidden side effects at module import time.
- Prefer narrow types and explicit validation at I/O boundaries. Do not use `any` or unsafe assertions to bridge a
  package boundary.
- The duplicate-code gate excludes the imported pricing implementation, structurally repetitive stack-info
  contracts, and the declarative config-authoring child-resource matrix. Treat those as explicit data/legacy
  baselines; do not broaden the exclusions, and do not introduce abstractions solely to satisfy the metric.

## Conceptual complexity

Conceptual complexity is reviewed as strictly as correctness.

- Prefer direct calls and existing application objects over new ports, registries, factories, service containers, or
  frameworks.
- An interface with one implementation needs evidence that it represents a real external boundary.
- Do not split code for architectural symmetry or hypothetical future reuse.
- An abstraction must reduce the total number of concepts needed to understand the behavior.
- Choose the simplest implementation that completely satisfies the current requirement. Do not add speculative
  configuration, indirection, or extension points.
- Before writing a helper or adding a dependency, inspect the existing code and the documentation and types of
  dependencies already present. Prefer a maintained library only when it reduces total complexity and maintenance.
- Make coherent end-to-end changes that leave the repository working. Do not land half-built scaffolding that a later
  change must make usable.
- Do not knowingly introduce a temporary architecture intended to be replaced later. If an explicitly approved
  transitional mechanism is unavoidable, document why it exists and the concrete condition for removing it.
- Harden genuinely untrusted inputs. Do not complicate internal trusted code to defend against exotic hostile
  JavaScript behavior without a demonstrated boundary.
- During structural refactors, preserve working behavior first. Refactor it only when the changed design has a
  concrete present-day benefit.

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

The executable ownership model and output classes are documented in `architecture/GENERATION.md`.
Turbo tasks own dependencies for deterministic generators used by ordinary build/typecheck/test work. Humans and
agents should not need to remember a separate generation step for those outputs. The CLI config-schema generator is
part of its ordinary `generate` task; only live-upstream generators remain deliberate manual operations documented in
`apps/cli/AGENTS.md`.

- Never hand-edit generated output.
- Run the owning package's non-mutating `generate:check` after changing canonical inputs.
- Do not commit `*.tsbuildinfo`, caches, release folders, or generated Prisma clients unless the documented policy
  explicitly changes.
- Review generated diffs; do not accept opaque regeneration merely to make CI green.

## Testing and compatibility

Classify behavior changes as `must-preserve`, `intentional-v4-break`, `known-v3-bug`, or `implementation-detail`.

- Protect CloudFormation logical IDs, resource names, replacement-sensitive properties, security scoping, and artifact
  hashing unless an intentional change is approved.
- Prefer semantic assertions and normalized fixtures over large brittle snapshots.
- Cover ordinary failures and cleanup where the changed behavior owns them; do not invent a framework merely to make
  every internal operation injectable.
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
fix. `scripts/agents/README.md` documents the current `pnpm worktree:create` and `worktree:remove` helpers; migration
dossiers and `v4/slice/*` branch names are historical.

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
- concepts or abstractions introduced and their present-day justification;
- whether public-only and integrated checks were exercised.
