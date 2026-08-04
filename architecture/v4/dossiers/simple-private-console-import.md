# Phase S2: import the private Console product

## Goal

Import the current private Console snapshot into the existing `apps/console`
submodule as two understandable applications, `api` and `ui`, while preserving
the reviewed security hardening and Prisma migration/adoption path. Establish
the real, practical tRPC boundary needed by the public CLI without reviving the
archived fine-grained runtime architecture.

## User-visible/end-to-end behavior

- The Console API, UI, Lambdas, background work, deployment definition, and
  ordinary development commands retain the behavior of private source commit
  `b098a76` (`security: harden API and deployment credentials`).
- Existing Console sessions continue to use the private API router through
  direct tRPC router inference.
- CLI/public consumers retain their anonymous, API-key, and AWS-identity API
  surfaces with precise types and the same runtime procedure names, paths,
  headers, and authorization boundaries.
- Existing databases that predate Prisma Migrate have a safe adoption path;
  new databases can apply the complete migration history. Deployment uses
  `prisma migrate deploy`, never `db push`.

## Why this slice exists

The public CLI is now integrated and proven in a private-source-free clone.
The next useful checkpoint is the actual private product, not another set of
placeholder packages or architectural interfaces.

## Prerequisite integration commits

- Public `v4/integration`: `ff7280a9fa80c32c08971ffb2389505d7e5f36a7`
- Recorded private submodule base:
  `7185b841822a0263c378ad25bc0f600bc9007084`
- Exact source snapshot: private `main` commit
  `b098a76` (`security: harden API and deployment credentials`)

Use tracked Git objects from `b098a76`; do not copy the dirty source working
tree or its build/runtime output. The source's modified
`tsconfig.tsbuildinfo` is not product input.

## Current implementation and known constraints

- The source repository is one package: backend in `server`, frontend in
  `src`, Prisma in `prisma`, infrastructure in `stacktape.ts`, and a mixture of
  scripts/shared code at the root.
- The v4 private submodule currently contains only a reviewed backbone and
  contract proof. Its placeholder API/UI behavior is not production behavior.
- `packages/console-api` is currently a small proof of the privacy shape; its
  dummy procedures must not be mistaken for the real Console contract.
- The imported public CLI still contains its v3 Console client/types. Keep it
  working while replacing cross-repository private-router generation with a
  real public external contract.
- The source security commit contains the Prisma baseline migration,
  API-key-v2 migration, API-key hashing/legacy lookup hardening, deployment
  token signing and scope checks, and focused security tests.
- The source still tracks old operational files such as `.env*`,
  `.sentryclirc`, `AGENTS_DEV_PLAYBOOK.md`, and generated/cache output. Some
  contain credentials or obsolete instructions. They are forbidden migration
  inputs.
- One deployment definition value that behaves like a third-party credential
  is still hard-coded in `stacktape.ts`. Do not copy or print it. Replace it
  with the existing Stacktape secret-reference mechanism and report the
  required secret name/provisioning follow-up without contacting AWS or
  deploying.

## Target app/package ownership

- `apps/console/api`: Fastify/tRPC server, Prisma schema/migrations, Lambdas,
  jobs, integrations, server-side shared code, operational scripts, and the
  Stacktape deployment definition.
- `apps/console/ui`: React/Vite Console UI and UI-only assets/configuration.
- A small private submodule-root source folder is acceptable only for code
  genuinely consumed by both applications and only when that is simpler than
  a package. Do not create a private package merely to make the tree symmetric.
- `packages/console-api`: public schemas, DTOs, and client-visible contract
  types for the real anonymous/API-key/AWS-identity surfaces. It contains no
  private router, Prisma model, database column shape, billing-only field,
  session-only procedure, or server implementation.
- `apps/cli`: only the minimum client/type import changes required to consume
  the real public contracts without losing behavior.

No `console-domain`, `console-infrastructure`, repository/service layer,
dependency-injection container, router registry, compatibility shell, or
future-use package is allowed.

## Provisional interfaces

- Console UI directly imports the private API router type and uses
  `@trpc/tanstack-react-query`.
- Public external routers reuse schemas from `@stacktape/console-api` and
  carry compile-time input/output conformance proofs.
- Anonymous, API-key, AWS-identity, and private-session procedures remain
  separately composed and separately authorized at runtime.
- If moving every existing external schema in one pass would create a less
  maintainable result, keep the current runtime router composition and define
  explicit public contract modules by surface/procedure group. Do not generate
  or publish the complete private router as a shortcut.
- Existing source functions and direct calls are preferred. Introduce a seam
  only for an actual HTTP, credential, database, or AWS boundary.

These are constraints, not a demand for extra abstractions. A simpler local
shape that preserves privacy, runtime enforcement, and exact client typing is
welcome.

## Must-preserve behaviors

- Existing tRPC procedure names, endpoint layout, input/output behavior, and
  public client headers unless a source bug is demonstrated and classified.
- Cognito/session authorization for the Console UI.
- API-key hashing, scope, expiry, revocation, last-used bookkeeping,
  organization/project authorization, and legacy-key transition behavior from
  `b098a76`.
- AWS-identity verification and account/invocation scoping.
- Deployment credentials remain short-lived, signed, independently rotatable,
  and never returned as user API keys.
- The complete reviewed Prisma schema and both migrations, including the
  adoption path for databases formerly managed by `db push`.
- Existing Stacktape logical names/resource names and deployment topology.
- Existing UI routes, Emotion object styles, and user workflows.
- A public clone remains installable and fully checkable with
  `apps/console` absent.

## Intentional v4 changes allowed

- Move source paths to `api` and `ui`.
- Replace Bun workspace installation/lockfiles with pnpm non-shared workspace
  lockfiles. Bun may remain the runtime for scripts that intentionally depend
  on it.
- Use root TypeScript 6, Oxlint, Oxfmt, Turbo, and shared configs; remove the
  private ESLint/Prettier setup and old duplicated tooling.
- Use `@trpc/tanstack-react-query` for the private UI.
- Remove generated cross-repository router declaration write-back after real
  public contracts replace it.
- Stop tracking generated Prisma clients, TypeScript build info, build output,
  local Stacktape output, caches, old test-run corpora, and credential-bearing
  local configuration.
- Replace hard-coded secret values with secret references without printing
  their old values.
- Correct path-only scripts/configuration required by the move.

Do not perform a broad dependency-upgrade campaign. Change versions only where
the root catalog/toolchain or working import requires it, and explain each
nontrivial compatibility adjustment.

## Owned paths

Private:

- `apps/console/**`

Public:

- `packages/console-api/**`
- Console-related client/type files under `apps/cli/shared/trpc/**`,
  `apps/cli/src/stacktape-api/**`, and their direct imports
- root workspace/catalog/Turbo/tooling files only when strictly required for
  the two real private applications
- this dossier if implementation evidence requires a factual correction

## Shared/frozen paths

- Preserve the imported CLI's synthesis, naming, packaging, release, and
  command behavior.
- Do not extract `packages/packaging`, `packages/helper-lambdas`, `ui-react`, or
  new architectural packages in this slice.
- Do not redesign docs/website/design tokens.
- Do not copy code from `v4/complex-archive`.
- Do not change deployment resources or logical names merely to fit the new
  folder layout.

## Required deterministic tests

- Runtime tests that independently reject missing/invalid credentials for all
  four tRPC surfaces.
- Compile-time proofs that each public client sees only its intended
  procedures and the private UI retains direct router inference.
- Existing API-key/deployment-token security tests from `b098a76`, adapted
  without weakening assertions.
- Prisma schema validation and migration-history checks.
- A local disposable PostgreSQL proof, when the environment supports it, that
  migrations create a fresh schema and that the documented baseline/adoption
  path does not destroy an existing representative schema. No remote database.
- API package typecheck/tests and UI typecheck/build.
- Public-contract leakage checks showing published public declarations do not
  expose private session procedures, Prisma/database structure, or internal
  credentials.
- Public CLI characterization tests for Console API client behavior.

Tests must fail closed and must not contact real AWS, the deployed Console API,
or production databases.

## Generated artifacts

- Prisma client generation is a normal Turbo/package dependency; no human-only
  generation ritual.
- Do not commit generated Prisma client source or `*.tsbuildinfo`.
- Keep only generated public contract output that is intentionally published,
  deterministic, narrow to external surfaces, and has a freshness check. Prefer
  source contracts over generated declarations when that is simpler.
- Review every generated diff; no opaque bulk regeneration.

## Public-only implications

- `pnpm install --frozen-lockfile` and `pnpm check:public` must pass in a clean
  clone where `apps/console` is absent.
- Public lockfiles cannot require private packages.
- No public source import may resolve through `apps/console`.

## Private-submodule implications

- Commit private source first on its private slice branch.
- Commit public contract/client changes separately.
- Report both ranges and the resulting submodule pointer.
- The orchestrator integrates private commits first and records the final
  pointer; the implementer must not push or update integration branches.

## Acceptance commands

At minimum, from the integrated slice worktree:

```sh
pnpm install --frozen-lockfile
pnpm --filter @stacktape/console-api typecheck
pnpm --filter <real-console-api-package> typecheck
pnpm --filter <real-console-api-package> test
pnpm --filter <real-console-ui-package> typecheck
pnpm --filter <real-console-ui-package> build
pnpm check:integrated
pnpm check:public
```

Also run the focused Prisma/migration and tRPC authorization/privacy checks
introduced by the slice. If a full gate is platform-blocked, record the exact
tool defect and run it in native Linux rather than weakening or excluding the
check.

## Expected commits

1. One or a small number of cohesive private commits importing the product and
   preserving its security/database behavior.
2. A separate public commit for real external contracts and the minimum CLI
   client adaptation.
3. A public pointer commit only as required by the integration protocol.

Commit messages describe behavior, not bulk file movement.

## Out of scope

- Deployment, AWS mutation, production database access, or secret creation.
- SDK/headless runtime work.
- Runtime/core extraction.
- Packaging/helper-Lambda extraction.
- Website/docs redesign.
- Shared React component extraction.
- Broad dependency modernization unrelated to a working import.
- Cleaning or rewriting the old repositories/history.
