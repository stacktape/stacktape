# Stacktape v4 target architecture

## Repository tree

```text
stacktape/                              # public stacktape/stacktape repository
├── apps/
│   ├── cli/                            # public CLI, TUI, process adapter, npm/binary assembly
│   ├── docs/                           # public Astro documentation application
│   ├── website/                        # fresh public Astro marketing application
│   └── console/                        # PRIVATE git submodule, not present in public clones
│       ├── api/                        # private Console API, jobs, Prisma, infrastructure definition
│       └── ui/                         # private Console React application
├── packages/
│   ├── core/                           # headless Stacktape operations and domain orchestration
│   ├── config/                         # config model, validation, transformations, browser-safe authoring API
│   ├── command-contracts/              # command inputs and intentional v4 machine-event contracts
│   ├── console-api/                    # public schemas, DTOs, typed tRPC clients for external surfaces
│   ├── packaging/                      # artifacts, buildpacks, bundlers, deterministic content tracking
│   ├── aws/                            # reusable AWS SDK adapters and AWS-specific primitives
│   ├── naming/                         # pure deterministic logical/physical naming
│   ├── helper-lambdas/                 # separately built helper Lambda artifacts
│   ├── schema-codegen/                 # config/schema generators with isolated compiler API dependency
│   ├── design-tokens/                  # typed values, CSS vars, themes, generated CSS/Tailwind adapter
│   └── ui-react/                       # small router-neutral shared React components
├── architecture/v4/                    # this migration contract
├── scripts/                             # workspace, agent-worktree, release, and verification tools
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── AGENTS.md
└── CLAUDE.md                            # contains only `@AGENTS.md`
```

`apps/console` is a Git/product boundary, not another runtime application. Its two children are the private
applications. A single private repository preserves atomic API/UI/Prisma/security changes.

The MCP server remains part of `apps/cli` for v4 because it is shipped and invoked as `stacktape mcp`. It becomes a
separate app only if it receives an independent distribution, process lifecycle, or release owner. Do not split it
preemptively.

## Package responsibilities

### `@stacktape/core`

Owns headless operations such as synthesize, deploy, update, delete, inspect, and development orchestration. It must:

- be callable in process without parsing `process.argv`;
- never call `process.exit`;
- not install process-global signal handlers;
- accept an explicit `OperationContext`;
- accept environmental capabilities through narrow ports;
- allow more than one independent operation in a process;
- expose structured results and events independently of TUI rendering;
- keep command orchestration and domain behavior testable with deterministic clocks, IDs, and fakes.

The context should cover capabilities rather than old manager classes:

```ts
type OperationContext = {
  identity: OperationIdentity;
  clock: Clock;
  ids: IdGenerator;
  aws: AwsPort;
  console: ConsolePort;
  packaging: PackagingPort;
  files: FileSystemPort;
  processes: ProcessPort;
  output: OperationEventSink;
  prompts: PromptPort;
  cancellation: CancellationToken;
};
```

This sketch is provisional. Slice implementers may improve it, but they must preserve explicit ownership,
testability, concurrency safety, and dependency direction.

### `@stacktape/config`

Owns the public configuration model, validation, references/directives, and configuration authoring API.

- The default/browser export must not import filesystem, process, AWS clients, or Node-only modules.
- Node-only loading/compilation may use explicit subpath exports such as `@stacktape/config/load`.
- Generated JSON schemas and editor metadata are declared outputs of this package/tooling.
- Console Monaco/configuration tooling consumes the browser-safe API rather than public-repository source aliases.

### `@stacktape/command-contracts`

Promotes the existing Zod-backed command option definitions. It owns intentional command inputs and the v4
machine-event envelope. It does not own the config model and does not preserve every internal event name.

### `@stacktape/console-api`

Owns explicit public Zod schemas, public DTOs, and surface-specific typed tRPC client factories. It contains no private
router imports and no Prisma types. Private Console API routers reuse its schemas and prove conformance. Console UI
continues direct private router inference.

### `@stacktape/packaging`

Owns artifact creation, language bundlers/buildpacks, Docker and hosting packaging, file inclusion/exclusion, dependency
analysis, content hashes, and caching. It must receive working directories, process execution, logging/progress, and
temporary storage explicitly; it must not read a global Stacktape state manager.

### `@stacktape/aws`

Owns reusable AWS SDK client construction/adapters and AWS-specific operations used by more than one deployable.
Centralized client construction is mandatory so tests can redirect endpoints and prohibit accidental real-AWS access.
It is not allowed to import CLI/TUI/core application state.

### `@stacktape/naming`

Owns pure deterministic logical IDs, physical names, tag names, and stable exported-name algorithms. It is a leaf
package. Naming compatibility tests protect existing deployed stacks.

### `@stacktape/helper-lambdas`

Owns source, dependencies, and deterministic packaging of helper Lambda artifacts. It is not an app because users do
not operate or deploy it independently; CLI/core packaging consumes its versioned artifacts.

### `@stacktape/schema-codegen`

Owns generators that require the TypeScript programmatic compiler API or external specifications. It may pin its own
compiler dependency and must not determine the repository-wide TypeScript version.

### `@stacktape/design-tokens`

Owns hand-authored TypeScript primitives and semantic product themes, typed raw values, typed `var(--stp-*)`
references, a deterministic CSS emitter, a Tailwind adapter, and broadly shared CSS recipes. Generated CSS is
committed and freshness-checked.

### `@stacktape/ui-react`

Starts intentionally small. It may contain accessible, presentational React primitives used by at least two
applications. It must not import React Router, Astro, Console state, tRPC, or Emotion-specific component factories.
Consumers own navigation and product behavior.

## Dependency directions

```text
apps/*                        -> packages/*
apps/console/api              -> console-api, config, aws, naming, design-tokens as needed
apps/console/ui               -> private API router type, console-api, config, design-tokens, ui-react
apps/cli                      -> core, config, command-contracts, console-api, packaging, aws, naming, helper-lambdas

core                          -> config and small leaf contracts only
packaging                     -> config types and low-level utilities it owns
aws                           -> naming where necessary
console-api                   -> Zod and tRPC only
ui-react                      -> design-tokens and React peer dependency
schema-codegen                -> config/schema sources
naming, design-tokens         -> leaves

packages/*                    -X-> apps/*
public code                   -X-> apps/console/*
core                          -X-> CLI/TUI/process globals
config browser entry         -X-> Node/AWS/process/filesystem
```

`apps/cli` is the composition root that wires concrete AWS, Console, packaging, process, TUI, and filesystem adapters
into core. A private or test application may wire different adapters.

## No generic shared package

The current `shared/` tree is dismantled by ownership:

- AWS behavior moves to `aws`.
- deterministic names move to `naming`;
- packaging moves to `packaging`;
- tRPC schemas/client behavior moves to `console-api`;
- pure helpers move beside the capability that owns them.

A new generic `utils`, `common`, or `platform-shared` package requires an explicit review. Duplication is preferable to
an unowned dependency magnet until a coherent capability emerges.

## Generated artifacts

Each generator declares canonical inputs, output locations, whether outputs are committed, and a freshness command.

Initial policy:

- Prisma client: generated, not committed in the final backbone unless deployment constraints prove otherwise.
- TypeScript build info: never committed.
- config schemas/editor metadata: committed when they are cross-package or published inputs; freshness-checked.
- CloudFormation specification-derived types: committed snapshots; refreshed deliberately.
- AWS pricing data: committed external snapshot; refreshed deliberately, not on every CI run.
- design-token CSS/Tailwind adapter: committed; regenerated and checked automatically.
- helper Lambda and npm/binary artifacts: not committed; verified from real builds.

No one should manually edit a generated file. No one should need to remember generation before build, typecheck, test,
or pack.
