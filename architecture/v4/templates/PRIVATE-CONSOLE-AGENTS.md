# Stacktape Console agent guide

This private repository contains the Stacktape Console `api` and `ui` applications. In the integrated workspace it is
mounted at `apps/console` inside the public `stacktape/stacktape` repository.

The private repository contains private application source only. Shared TypeScript, lint, format, Turbo, package
catalog, and generated-file policy live in the public parent. Private CI checks out a selected public ref before running
integrated tasks.

## Before changing code

1. Read this file and, when mounted, the public parent `AGENTS.md`.
2. Check status in both this repository and the public parent.
3. Preserve unrelated changes.
4. Identify whether the change alters public tRPC contracts, Prisma, generated artifacts, or the parent submodule
   pointer.

## Applications

- `api`: tRPC/Fastify API, Prisma/database, background jobs, deployment infrastructure, and external integrations.
- `ui`: React Console application using Emotion and TanStack React Query/tRPC.

Do not split domain/infrastructure packages merely to imitate layered architecture. Extract a private package only when
it has a coherent capability and more than one real consumer.

## tRPC boundary

- UI may directly infer the private Console router type from API source.
- Externally consumable schemas and DTOs live in public `packages/console-api`.
- External API routers reuse those Zod schemas and carry compile-time conformance checks.
- Never expose the complete private router, Prisma payload types, database columns, billing fields, integration
  credentials, or internal procedures through public generation.
- Keep anonymous, API-key, AWS-identity, and private Console middleware independently enforced and tested.
- Use TanStack's tRPC React Query integration in UI.

## Database and credentials

- Use reviewed Prisma migrations and `prisma migrate deploy`.
- Never use production `prisma db push` or `--accept-data-loss`.
- Preserve the baseline/adoption path for databases previously managed by `db push`.
- User-facing API keys remain visible, revocable, scoped, and expiring.
- Internal service/deployment identities are separate and are never returned as user credentials.
- Deployment credentials remain signed, short-lived, invocation/project/account scoped, and independently rotatable.
- Do not log or expose secret values.

## UI

- Use Emotion object styles and the `css` prop where appropriate.
- Never introduce styled-components/styled APIs.
- Consume shared values from `@stacktape/design-tokens`.
- Shared React components must remain router-neutral; Console navigation adapters stay in UI.
- Preserve accessible loading, error, keyboard, and focus behavior.

## Validation

From the integrated public parent:

```sh
pnpm check:integrated
pnpm --filter <console-api-package-name> test
pnpm --filter <console-ui-package-name> test
```

Use focused package commands during implementation. Relevant changes require:

- tRPC compile-time surface tests and runtime authorization tests;
- Prisma validation/migration tests;
- backend unit/integration tests;
- UI typecheck/build and relevant browser smoke tests;
- public contract leakage checks;
- public-only parent validation when public packages change.

No deployment or real-AWS test is implied. Those require explicit authorization.

## Git

Commit private application changes here first. The public parent records the reviewed private commit as a submodule
pointer in a separate integration step. Do not update or push the public pointer yourself unless the orchestrator asks.

Do not force-push or rewrite shared history. Report private and public commit ranges separately.
