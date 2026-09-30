# Architecture

Stacktape is a pnpm workspace with a public repository and one private Git boundary.

```text
apps/
  cli/           CLI, synthesis, deployment orchestration, MCP and helper Lambdas
  docs/          Astro documentation site
  init-ui/       React UI embedded by `stacktape init`
  vscode-extension/ Stacktape language support and CLI commands for VS Code
  website/       Astro marketing site
  console/       private submodule: API, UI and Bitbucket Forge app
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
`pnpm check:architecture` resolves each workspace's own TypeScript aliases and package export maps. It rejects runtime
cycles without a baseline. A second pass checks declaration imports against the same package and privacy boundaries;
type-only cycles do not represent runtime initialization cycles. Generated and built implementations are not traversed,
but their incoming dependency edges are still checked.

The private Console may consume public packages. Its UI infers its signed-in tRPC router directly from the private API,
but it cannot import the API-key or AWS-identity routers. Its production runtime imports only the small pure contracts
explicitly allowed by the architecture rules. Isolated integration tests may compose the actual API and UI together.
Public API clients use the schemas in `packages/console-api` instead of private router types.

Console UI currently reads four explicit JSON exports from `apps/cli`: AWS prices, RDS versions, CloudFormation resource
types, and starter-project metadata. This is a data-only dependency; it does not import CLI implementation or bundle the
CLI. The CLI owns those snapshots and starter sources, so moving them into a package would move generation ownership
without removing complexity. Revisit this only if another producer appears or a consumer needs them outside the
workspace.

## Application boundaries

The CLI stays the composition root for command handling, mutable invocation state, AWS credentials, synthesis and
deployment workflows. A large class is not by itself a reason to create `packages/core`; extract a capability only when
it has an independent contract or another real consumer.

CLI service initialization is tracked by instance, including concurrent initialization and retry after failure. Command
cancellation owns the pending-operation registry independently of application presentation and invocation state.
Resource resolvers import the calculated-resource accumulator; commands import the separate `synthesize.ts` workflow,
which assembles the resolver order. The accumulator never imports its resolvers.

Configuration helpers receive the active candidate configuration instead of reading the published singleton while
normalization is still in progress. Dev resource selection is a pure rule beside normalization; both command code and
synthesis use an explicit deployment context. Built-in directives receive narrow runtime capabilities from command
composition. Logging policy and database-engine rules are owned below synthesis because normalization also uses them.

Packaging produces artifacts; artifact deployment consumes an explicit packaging source. Deployed-stack inspection uses
the resource snapshot passed at initialization or refresh. AWS identity and instrumentation receive credentials, region
and presentation callbacks explicitly. These boundaries support real integration scenarios without replacing domain code
with mocks.

`config-inference` is different: both the CLI and init UI consume its deterministic model. Repository probes produce
observable facts, verification downgrades unproved claims, and composition chooses infrastructure. Agents may submit a
restricted facts schema but cannot write infrastructure or user-facing prose. See its local `AGENTS.md` for the safety
invariants.

Helper Lambdas remain under `apps/cli/helper-lambdas`. They are separately built deployment artifacts, not standalone
products, and they currently depend on CLI-owned contracts.

The VS Code extension embeds the canonical config schema produced by the CLI generator. It delegates ordinary YAML
language behavior to the maintained `yaml-language-server` package and owns only Stacktape-specific references, schema
selection, code lenses, and command integration. It does not carry a fork of the upstream YAML implementation.

## Console layout

`apps/console/api` uses the same conventions as the public applications:

- `src/` contains API runtime code and Lambda entrypoints;
- `prisma/` owns the schema and migrations;
- `infrastructure/` contains deployment parameter contracts, connection templates and the EC2 runner image;
- `scripts/` contains explicit operational commands;
- `stacktape.ts` remains at the app root because the Stacktape CLI loads it directly.

Small browser/API contracts live beside their feature (`src/aws`, `src/integrations/git`, `src/organizations`) and are
exported through deliberate package subpaths. There is no generic `domain`, `shared`, or application-wide types folder.

The private `bitbucket-forge` application is a separate browser composition root for provider pairing; it does not
belong in the Console UI bundle or a shared capability package.

## Project checks

`check:deadcode` checks authored files, dependency declarations and unresolved imports from actual application
entrypoints, exported package modules and test/tool entrypoints. It includes tests: a compatibility helper used only by
a meaningful test is not dead production code. Built package exports that cannot be mapped automatically have explicit
source entrypoints. CSS-only dependencies, Monaco/Octokit declaration dependencies, Prisma-generated runtime imports and
the source-map banner injected during CLI release bundling, plus React required by Prisma Studio and the Forge SDK's
peer contracts, have narrow exclusions in the Knip configuration.

`audit:deadcode` additionally reports unused exports and types for review. An application-local export is not a package
API, and removing its keyword alone is not a useful repository gate. Do not mark all package source as entrypoints to
make the scanner pass.

## Generated data

Turbo connects deterministic generation to the build, test and development tasks that consume it. Live AWS catalog
refreshes remain manual because their input is not pinned. [`generated-files.md`](generated-files.md) lists ownership
and the rules for committed, ignored and release output.

## Deliberate debt

The CLI is not strict-TypeScript-clean yet. Its non-strict setting is explicit. New packages and the Console use their
own stricter contracts where practical; enabling strict mode for the imported CLI remains a separate migration.

Console's repository-based config generator still uses its older hosted inference pipeline. The v4 `stacktape init` flow
uses `packages/config-inference` and a local interactive workflow instead. The hosted pipeline is being retired rather
than converged: first deployments start only with `stacktape init`, and Console deploys use the config in the
repository.
