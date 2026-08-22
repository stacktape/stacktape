# Architecture

Stacktape is a pnpm workspace with a public repository and one private Git boundary.

```text
apps/
  cli/           CLI, synthesis, deployment orchestration, MCP and helper Lambdas
  docs/          Astro documentation site
  init-ui/       React UI embedded by `stacktape init`
  website/       Astro marketing site
  console/       private submodule: API and UI
packages/
  config/        public configuration model and schema
  config-authoring/ TypeScript authoring runtime and YAML/TS conversion
  config-inference/ deterministic repository facts, verification and composition
  cloudformation/ typed CloudFormation declarations
  packaging/     Lambda and container packaging engines
  naming/        stable physical names and logical IDs
  console-api/   public control-plane schemas and clients
  pricing/       pricing calculations and upstream catalog parsing
  stack-info/    deployed stack information contracts
  analytics/     event contracts and browser/server adapters
  design-tokens/ shared visual values
  ui-react/      reusable, router-neutral React components
```

## Dependency direction

Applications compose packages. Packages do not import applications. Public code never imports `apps/console`.
`pnpm check:architecture` enforces these directions and rejects new import cycles.

The private Console may consume public packages. Its UI infers its signed-in tRPC router directly from the private API,
but it cannot import the API-key or AWS-identity routers. Public API clients use the schemas in `packages/console-api`
instead of private router types.

Console UI currently reads four explicit JSON exports from `apps/cli`: AWS prices, RDS versions, CloudFormation resource
types, and starter-project metadata. This is a data-only dependency; it does not import CLI implementation or bundle the
CLI. The CLI owns those snapshots and starter sources, so moving them into a package would move generation ownership
without removing complexity. Revisit this only if another producer appears or a consumer needs them outside the
workspace.

## Application boundaries

The CLI stays the composition root for command handling, mutable invocation state, AWS credentials, synthesis and
deployment workflows. A large class is not by itself a reason to create `packages/core`; extract a capability only when
it has an independent contract or another real consumer.

`config-inference` is different: both the CLI and init UI consume its deterministic model. Repository probes produce
observable facts, verification downgrades unproved claims, and composition chooses infrastructure. Agents may submit a
restricted facts schema but cannot write infrastructure or user-facing prose. See its local `AGENTS.md` for the safety
invariants.

Helper Lambdas remain under `apps/cli/helper-lambdas`. They are separately built deployment artifacts, not standalone
products, and they currently depend on CLI-owned contracts.

## Console layout

`apps/console/api` uses the same conventions as the public applications:

- `src/` contains API runtime code and Lambda entrypoints;
- `prisma/` owns the schema and migrations;
- `infrastructure/` contains deployment parameter contracts, connection templates and the EC2 runner image;
- `scripts/` contains explicit operational commands;
- `stacktape.ts` remains at the app root because the Stacktape CLI loads it directly.

Small browser/API contracts live beside their feature (`src/aws`, `src/integrations/git`, `src/organizations`) and are
exported through deliberate package subpaths. There is no generic `domain`, `shared`, or application-wide types folder.

## Generated data

Turbo connects deterministic generation to the build, test and development tasks that consume it. Live AWS catalog
refreshes remain manual because their input is not pinned. [`generated-files.md`](generated-files.md) lists ownership
and the rules for committed, ignored and release output.

## Deliberate debt

The known-cycle baseline contains old CLI config-manager cycles and several Console UI cycles. It makes existing debt
visible while failing on every new cycle. Remove entries when nearby work makes a cycle cheap to break; do not redesign
an unrelated subsystem only to reduce the count.

The CLI is not strict-TypeScript-clean yet. Its non-strict setting is explicit. New packages and the Console use their
own stricter contracts where practical; enabling strict mode for the imported CLI remains a separate migration.

Console's repository-based config generator still uses its older hosted inference pipeline. The v4 `stacktape init` flow
uses `packages/config-inference` and a local interactive workflow instead. Converging them requires a product decision
about the Console experience and trust model; sharing files between the two implementations would only hide the
difference.
