# @stacktape/config

The user-authored Stacktape configuration language: the resource model, its CloudFormation escape hatch, and the
primitives the published config schema, the `stacktape` npm declarations, the documentation examples and the Console
are all generated from.

The committed JSON schema has the same owner: `generated/config-schema.json` is exported as
`@stacktape/config/config-schema.json`. The CLI generates, publishes and packages that file directly, and Console
imports the package subpath; do not create application-local copies.

This package exists because that model used to be ~59,000 lines of ambient `.d.ts` under `apps/cli/types`. Ambient
declarations have no owner, so `packages/packaging` ended up re-declaring `ModuleInfo` and `ProgressLogger` locally
and both copies drifted. Nothing can be extracted safely until the configuration contract has one importable owner.

## What belongs here

The authored configuration format, and only that: what a user may write in `stacktape.yml` or in a TypeScript config.
The bulk of it is classified mechanically rather than by naming convention — a declaration belongs here when it is
reachable from `StacktapeConfig`, which is how the published schema is computed, and it is why the `Stp` prefix is
not a classifier: `StpBuildpackLambdaPackaging`, `StpIamRoleStatement` and `StpStateMachine` are authored configuration,
while `StpResource`, `StpResourceType` and the `*ReferencableParam` unions are the CLI's resolved model and stay in
`apps/cli`.

Reachability is the test, not the rule. A few authored types are published by the `stacktape` npm package without
being referenced from the configuration root — `BudgetControl`, `BudgetNotification`, `IotIntegration`,
`IotIntegrationProps`. They are authored configuration, so they live here too; leaving them behind is what left
`StacktapeBudgetControl` aliasing a type that existed nowhere and `IotIntegrationProps` published as a
`Record<string, unknown>` placeholder.

Not here: CLI command arguments, manager and runtime state, logging, `ProgressLogger`, packaging I/O, and the
service-manager aliases. They stay with their real owners.

## Rules

- No barrel. The module layout _is_ the export map: `.` is `StacktapeConfig`, `./shared` is the shared authored
  primitives that resource props inherit from, and every other module is its own subpath via `./*`. The legacy
  `_root`/`__helpers` spellings no longer exist; `resolveConfigSourceFile` keeps their documentation identity.
- No dependencies. The configuration format does not need a runtime, and the only value this package owns is the
  `IntrinsicFunction` class the escape hatch is written against.
- Never import `apps/cli`. `CONNECT_TO_AWS_SERVICE_MACROS` lives here precisely because the ambient model used to
  read it back out of a CLI resolver through `typeof import('../../src/domain/...')`.
- The acceptance check is two files, both outside `src` so neither is exported.
  `tests/config-import.acceptance.ts` builds a real `StacktapeConfig` from explicit imports and belongs to the
  package's own `tsconfig.json`, which compiles it with `types: []` and `skipLibCheck: false` — the environment a
  consumer actually has, so a stray dependency on a Bun or Node global cannot pass unnoticed.
  `tests/config-import.test.ts` imports it and pins the runtime the package owns: `IntrinsicFunction.toJSON()`
  and the `connectTo` AWS-service macros. It needs `bun-types` for `bun:test`, so it compiles under
  `tests/tsconfig.json` instead; measured, that laxer project hides nothing repository-owned.

## Declaration content is product content

JSDoc here is rendered to customers: the config schema's `description`/`markdownDescription`, editor hovers, the
documentation site's YAML and TypeScript examples, and the `stacktape` npm `.d.ts`. Treat it as bytes.

- `packages/config/src/**` is excluded from oxfmt, exactly as `apps/cli/types/**` is. Formatting it rewrites 1,407
  published descriptions.
- A comment that should _not_ reach a customer must not be JSDoc. The CloudFormation module uses `//` for this
  reason: every JSDoc block reachable from `StacktapeConfig` becomes a schema `description`.
- `typescript/no-explicit-any` and the duplication check are disabled for `src/**`. Both exemptions moved here with
  the content from `apps/cli`. The `any`s are open user-supplied JSON — CDK construct properties, state-machine
  definitions, EventBridge `inputTemplate`, Cognito `providerDetails` — which the schema renders as `{}`.

## How the CLI reaches these types

Ordinary CLI sources import them explicitly. The CLI's retained resolved/internal declarations do the same, then
publish their existing global API from `declare global` blocks. Making those `.d.ts` files external modules keeps
their package dependencies explicit without changing the global names the CLI implementation consumes. There is no
generated ambient bridge or parallel alias surface.

The configuration-ownership characterization test prevents a retained CLI declaration from redefining a name owned
by this package. Direct imports and that no-redeclaration invariant are the complete boundary.

## Checks

```sh
pnpm --filter @stacktape/cli run gen:schema          # regenerate the committed JSON Schema and Zod validator
pnpm check:generated-diff                            # prove both committed outputs are current after generation
pnpm --filter @stacktape/config run typecheck          # strict, skipLibCheck false, includes the acceptance fixture
pnpm --filter @stacktape/cli run test:characterization # schema probes: 449 definitions, 44-resource union, examples
pnpm --filter @stacktape/cli run typecheck             # direct imports plus retained global declaration compatibility
```

`exactOptionalPropertyTypes` is off. Every optional property models a key a user may omit from YAML, not a key whose
value may be `undefined`, and the CLI merges defaults over loaded configuration objects; enabling it would force
`| undefined` unions that misdescribe the authored format and change the generated schema.
