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

The filesystem layout of Console-managed EC2 runners is owned by
`api/server/services/remote-deploy/ec2/runner-paths.ts`. Generated scripts and SSM launch calls must use that registry.
Invocation worktrees and GitHub Actions job directories are temporary; repository mirrors, runner tool caches, and the
installed Actions runner persist across jobs. Add new persistent runner writes there so retention and cleanup remain
reviewable.

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
- Consume shared values from `@stacktape/design-tokens`. It owns the brand colour, the semantic surfaces, text, borders,
  interaction and status colours, the AWS category colours, and the shared radii, focus and motion. Values only Console
  uses stay in `ui/src/styles`, below the comment that says so.
- Buttons, links, form controls, tabs, badges, dialogs, tooltips, alerts, progress/loaders, grid lists and product
  resource/framework icons come from `@stacktape/ui-react`. Console's adapters keep only what is Console's: React Router
  navigation, React Hook Form translation, hint persistence, brief post-click acknowledgement, or private orchestration.
  Emotion `Css` types never cross into the shared package; Emotion's `css` prop may style a shared component through its
  ordinary `className` contract.
- `@stacktape/ui-react/config-editor` is the reusable editor frame and document state. Console's `ConsoleConfigEditor`
  is its private controller: tRPC compilation, pricing, saving, presets, and account/project context remain there. Do
  not create a second visual editor frame in Console.
- `@stacktape/ui-react/monaco-editor` owns only Monaco editor/model lifecycle. Console's `StacktapeEditor` adds
  Stacktape YAML and TypeScript language services, decorations, shortcuts, and toolbar. Keep that distinction in the
  names and do not restore the ambiguous `CodeEditor`/`MonacoEditor` wrapper pair.
- The shared stylesheet is imported once in `ui/src/main.tsx` and sits in the `stacktape-ui` cascade layer, so Console's
  unlayered Emotion always wins over it. That is also why `globalCss` restores the focus ring for `.stp-ui-button`:
  Console's own blanket `*:focus-visible { outline: none }` would otherwise erase it.
- Prefer native `<button>` and `<a>`. Never nest one inside the other and never revive `<div role="button">`; an
  icon-only control always carries an accessible name.
- The independent infrastructure diagram is `@stacktape/ui-react/isometric-diagram`. ConfigEditor hands it a parsed
  `StacktapeConfig` and owns its own compile indicator and cannot-compile message. Diagram topology, layout, rendering
  and fixtures live in the package; do not nest them under ConfigEditor or add a second set of infrastructure semantics.
- Keep `ui/src/components/IsometricDiagramView.tsx` inside the `lazy()` boundary and keep the diagram's stylesheet
  imported there. The isopack icon catalogue is about a megabyte and must stay in the diagram chunk.
- Resource-to-icon/category meaning lives in `@stacktape/ui-react/resource-icon/catalog`; Console must not carry a
  second authored map. Ordinary surfaces use `ResourceIcon`/`FrameworkIcon`, while only the diagram imports isopacks.
- `/diagram-test` is a development harness only. It may import the public component and its fixtures; it must never hold
  diagram implementation.
- Shared React components must remain router-neutral; Console navigation adapters stay in UI.
- Preserve accessible loading, error, keyboard, and focus behavior.
- Console design experiments are development-only and live under `ui/src/dev/design-preview`; compare them at `/ui-lab`.
  The Ø option applies no properties, so it is always exactly what production ships. Correct a defect in the production
  code; use a preview only for a choice that is genuinely a matter of taste.
- A preview may change a coherent visual treatment — palette, surfaces, elevation, radii, chrome and interaction states
  — but must not override layout geometry such as widths, heights, spacing, positioning, overflow, or icon sizes.
  Stress-test dense content and wrapping. Every production hook uses `var(--hook, <original value>)`, so deleting the
  preview code cannot change the released UI.
- Monaco's Stacktape declarations come from the workspace v4 CLI's `generate:monaco` output. UI build/dev generates and
  copies all four files; never restore a published v3 `stacktape` fallback or silently keep stale declarations.
- The served `/config-schema.json` is a generated byte-for-byte copy of `@stacktape/config/config-schema.json`.
  Build/dev materializes it through the UI's `generate` task; never transform or hand-edit the ignored public copy.
- Console API `generate` owns only the Prisma client. TypeScript declarations under `dist` are build output; the UI's
  typecheck declares its dependency on the API build explicitly instead of relying on compilation hidden in generation.
- Consume starter-project metadata and the AWS, CloudFormation and RDS editor catalogs through the public
  `@stacktape/cli` subpaths; do not restore private generated copies. MongoDB Atlas prices currently have no generator
  and are a Console-only editor input, so their single source is `ui/src/data/mongodb-atlas-prices.json`.
- Inspect Stacktape resource definitions through `@stacktape/config/schema-inspection`; do not generate or commit a
  Console-local resource-description snapshot.
- Consume pricing catalog ingestion, DynamoDB refresh, and resource-estimator contracts from `@stacktape/pricing`; do
  not restore either private or CLI-local copies of the pricing implementation.
- Browser AWS operations receive an explicit access context containing organization, AWS account, region, and signed-in
  user. Read session state at the component boundary and pass it down; do not restore a singleton that reads the global
  store internally.
- Acquire browser AWS clients through `ui/src/aws/client.ts`. Its cache owns expiry margin, concurrent credential
  requests, client reuse, and logout cleanup; feature code must not add a second credential or client cache.
- Scope AWS-backed React Query keys by organization, account, and region whenever the AWS result is regional. Global
  services such as Route 53 deliberately omit region. Keep one query-key family shared by each query and its
  invalidations.
- Keep feature-specific AWS operations beside their sole UI feature. Use `ui/src/aws` only for operations shared by
  several screens or for the common access/client boundary.

## Validation

From the integrated public parent:

```sh
pnpm check:integrated
pnpm exec turbo run test --filter=@stacktape/console-api-app
pnpm exec turbo run build --filter=@stacktape/console-ui
pnpm exec turbo run test --filter=@stacktape/console-ui
pnpm exec turbo run dev --filter=@stacktape/console-ui
```

Use Turbo-filtered commands for focused Console work so generation dependencies run in the declared DAG. Relevant
changes require:

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
Before that pointer is committed, push the reviewed private feature branch so the commit survives harness-worktree
cleanup; the public parent verifies this with `pnpm console:pointer:verify`.

Do not force-push or rewrite shared history. Report private and public commit ranges separately.
