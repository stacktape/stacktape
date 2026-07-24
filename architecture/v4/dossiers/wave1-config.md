# Wave 1 slice dossier — config model and schema generation

Goal:

Establish the real public configuration model, browser-safe authoring/validation entry point, explicit Node loading
subpaths, directive/reference validation, and deterministic schema/editor outputs.

User-visible/end-to-end behavior:

Users can author and validate Stacktape configurations with strongly typed APIs; CLI can load supported config files;
Console/editor consumers can use the same model and schemas without importing Node or private source.

Why this slice exists:

Configuration is the central public model and a prerequisite for synthesis, Console editing, packaging contracts, and
documentation. The legacy model mixes authoring types, runtime loading, transformations, and app state.

Prerequisite integration commit(s):

- Public `ba8c0961`.
- Legacy reference `17aef681` in `C:\Projects\stacktape`.
- No private source is required in this slice.

Current implementation and known constraints:

- Legacy public authoring types live primarily under `src/api/npm/ts`, with runtime validation/resolution under
  `src/domain/config-manager`, shared schema utilities, and config-generation tooling.
- Browser/default imports must have no Node, filesystem, process, AWS, or application-state transitive dependency.
- TypeScript 6 remains authoritative. Programmatic compiler API work belongs in `schema-codegen`.

Target package/app ownership:

- `packages/config` owns the public model, browser-safe validation, directives/references, and explicit Node loader
  subpaths.
- `packages/schema-codegen` owns compiler/spec-driven deterministic generation and committed schema/editor snapshots.

Provisional interfaces:

- `@stacktape/config` for browser-safe model, schemas, references, directives, and validation results.
- Explicit subpaths such as `@stacktape/config/load` for Node-only loading.
- Validation returns structured issues rather than exiting or printing.
- Schema generation consumes canonical config exports and writes declared outputs.

Must-preserve behaviors:

- Supported v3 configuration shapes, reference/directive semantics, defaults affecting synthesis, and error locations.
- Type/schema agreement for supported resources.
- Config authoring remains publishable and usable without the CLI implementation.

Intentional v4 changes allowed:

- Normalize validation issue structure and improve diagnostics.
- Remove class-based authoring duplication if object authoring remains pleasant and migration is documented.
- Split Node-only loading from browser-safe validation.

Owned paths:

- `packages/config/**`.
- `packages/schema-codegen/**`.

Shared/frozen paths:

- Root tooling, `packages/core`, `packages/naming`, `packages/packaging`, apps, architecture documents, and
  `apps/console`.

Required deterministic tests:

- Browser-entry transitive-import test proving no Node/process/filesystem/AWS modules.
- Representative dense configs covering references, directives, defaults, invalid paths, cycles, and resource
  families.
- Type-level authoring tests and runtime schema agreement.
- Deterministic generation and stale-output failure.
- Node loader tests for supported TS/JS/YAML input behavior without executing deployments.

Required artifact/emulator/AWS checks:

- No AWS or emulator call.
- Generated schema/editor artifacts must be stable across two clean runs.

Public-only implications:

- All code and generated outputs are public; checks must pass without Console.

Private-submodule implications:

- Console consumption is a later slice. Do not import or generate from private code.

Generated artifacts:

- Config JSON schema and editor metadata are committed when cross-package/published inputs.
- Canonical inputs, output paths, Turbo dependencies, and freshness commands must be explicit.

Acceptance commands:

- `pnpm --dir packages/config typecheck`
- `pnpm --dir packages/config test`
- `pnpm --dir packages/schema-codegen typecheck`
- `pnpm --dir packages/schema-codegen test`
- owning generation freshness command
- `pnpm fmt:check`
- `pnpm lint`
- `pnpm check:architecture`
- `pnpm check:patterns`

Expected commits:

- One or more public commits on `v4/slice/config-model`.

Out of scope:

- CloudFormation synthesis, private Monaco integration, CLI composition, deployments, and repository-wide TypeScript
  upgrades.
