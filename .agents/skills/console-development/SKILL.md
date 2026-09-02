---
name: console-development
description:
  Run, diagnose, or manually test the private Stacktape Console locally, especially when local API/UI behavior must use
  the shared dev RDS data, Cognito users, AWS services, OAuth callbacks, or provider webhooks. Use for Console dev-mode
  setup, deciding between UI-only and full mode, shared-dev migrations, and GitHub/GitLab/Bitbucket end-to-end testing.
---

# Console development

Work from the public workspace root with `apps/console` initialized. Read the root and Console `AGENTS.md` files before
changing code. Check Git status in both repositories.

## Choose the smallest valid mode

- Use `pnpm dev:console:ui` only for UI changes that the deployed dev API already supports. It serves the UI at
  `http://localhost:4000` and points it at the deployed dev API.
- Use `pnpm dev:console` for API changes, API/UI contracts, database-backed behavior, permissions, or realistic manual
  testing. It runs the API at `http://localhost:3000` and the UI at `http://localhost:4000`.
- Use `pnpm deploy:console:dev` only when an external system must call changed code, such as an OAuth callback or
  webhook that cannot reach localhost. This changes the real `console-app-dev` stack.
- Never substitute the production stage or `pnpm deploy:console` for a development test.

## Full dev-mode contract

`pnpm dev:console` performs one guarded workflow:

1. Builds the source CLI artifacts.
2. verifies the Stacktape login;
3. verifies AWS CLI credentials belong to account `977946299200`;
4. reads current non-secret database and Cognito identifiers from `console-app-dev`;
5. opens an SSM tunnel through `bastionHost` to the shared dev `mainDatabase`;
6. starts the local API container and UI against the shared dev data plane; and
7. closes both processes together.

The API uses real rows, organizations, projects, provider connections, and dev-stage runtime parameters. The local
`console-app-devlocal` stack contains support resources and the assumable role for local workloads. Its resolved-config
fingerprint causes a one-time refresh when IAM or other support configuration changes; ordinary source edits reuse it.
Deployed `dev` Lambdas remain responsible for external webhooks and background work.

Do not start a separate local PostgreSQL container for shared-data tests. Do not manually copy database passwords,
Cognito IDs, API keys, or provider tokens into files or chat.

## Prerequisites and recovery

- Stacktape login: `pnpm dev:cli login`
- AWS CLI v2 credentials for the expected account
- Docker Desktop
- Required parameter names:
  - `pnpm parameters:check:console:dev`
  - `pnpm parameters:check:console:devlocal`

If startup reports an expired login, run the login command and finish its browser flow. If it rejects the AWS account,
switch the AWS profile outside the repository and retry. If a prior dev process crashed, use
`pnpm dev:cli dev:stop --cleanupContainers`; never delete the shared `console-app-dev` stack as cleanup.

Committed Prisma migrations go to the shared dev database only through `pnpm migrate:console:dev`. Do not use
`prisma migrate dev`, destructive pushes, or the production migration command.

## Manual testing

Test through the browser as a customer would. Verify the visible success path, cancellation or denial, retry after an
error, empty and large lists, search/pagination, stale tabs, disconnect/reconnect, and organization isolation. Inspect
the browser network response and API logs when UI feedback is ambiguous; do not treat a toast alone as proof.

For Git-provider work, read [references/git-provider-e2e.md](references/git-provider-e2e.md) before testing. Ask the
user to perform provider approval or installation clicks when their signed-in browser session is required. Record only
provider account/repository labels and observed behavior—never authorization codes, cookies, tokens, or secret values.
