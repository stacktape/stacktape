# Stacktape CLI

This application is the Stacktape CLI as it shipped in v3, moved into the monorepo with the smallest set of path,
manifest and tooling changes needed to make it an ordinary pnpm workspace application. Its runtime, synthesis,
packaging, naming, MCP and release behavior are unchanged; refactoring happens in later, separate phases.

## Layout

- `src/` — commands, application/domain managers, TUI, MCP, and the published `stacktape` npm API (`src/api/npm`).
- `shared/` — AWS clients, packaging bundlers, naming, tRPC clients used by both the CLI and the helper Lambdas.
- `helper-lambdas/` — sources of the Lambdas Stacktape deploys into customer accounts.
- `scripts/` — build, code generation, release and publishing tooling, plus the committed platform binaries under
  `scripts/assets/` that release archives ship.
- `types/` — hand-authored config type definitions. Their JSDoc is the source of the published config schema and of
  the documentation examples, so comment layout is content: `types/` is excluded from formatters.
- `@generated/` — committed generated data (CloudFormation types, config schema, LLM docs, price tables). Never
  hand-edit; regenerate with the matching `gen:*` script.
- `tests/characterization/` — behavioral baselines for the CLI contract, config runtime, packaging and synthesis.
- `_test-stacks/config-loading-smoke/` — the only imported test stack; the characterization suite loads it.

## Toolchain

- pnpm installs; Bun runs the scripts and builds, exactly as the application was written.
- `tsconfig.json` keeps the compiler options the sources were written against. TypeScript 6 enables `strict` by
  default and this code predates that, so `strict` is explicitly off. Turning it on is a migration of its own
  (~2,500 diagnostics). `paths` carries the mappings that used to come from `baseUrl`, which TypeScript 6 deprecates.
- `.prettierrc` is not repository formatting: `scripts/build-npm-main-export.ts` invokes Prettier with it to format
  the `.d.ts` files shipped in the `stacktape` npm package. Repository sources are formatted with oxfmt.
- `@generated/` and `starter-projects/` are excluded from oxfmt, oxlint, jscpd and knip. The workspace lint rules the
  imported sources do not satisfy yet are listed per rule in the root `.oxlintrc.json` override for `apps/cli`.
- `build` passes an explicit `--version` because pnpm does not expand variables in scripts on Windows; keep it in
  step with this package's `version` field.

## Checks

```sh
pnpm --filter @stacktape/cli run typecheck
pnpm --filter @stacktape/cli run test           # characterization, release security, MCP docs, helper-Lambda artifacts
pnpm --filter @stacktape/cli run test:release-artifact
```

Two known constraints:

- Bun applies `mock.module()` process-wide, and several `src/**/__tests__` files stub whole application singletons.
  Those files pass individually but cannot share one `bun test` process, so `test` runs the product's lanes rather
  than the whole tree. Making the unit tests process-safe is outstanding work.
- On Windows, Bun 1.3.9's bundler aborts on modules reached through pnpm's symlinked `node_modules`
  ("Expected pretty file path to have only forward slashes"). Every Bun-bundling lane — `build`, `build:dist`,
  `pkg:hl`, `test:characterization:helper-lambdas`, `test:release-artifact` — therefore has to run on Linux or macOS.
  Typecheck and the non-bundling test lanes run everywhere.

## Deferred

- `@generated/llm-docs` is shipped from the committed tree. Regenerating it reads the documentation app, so
  `scripts/generate-llm-docs.ts` returns together with `apps/docs`.
- `@generated/schemas` does not currently reproduce byte-for-byte from `types/`, with either TypeScript 5.9 or 6.
  That drift predates the move; a freshness gate is only worth adding once the inputs and generator agree again.
- The v3 release workflow, its `scripts/release-workflow.spec.ts` gate, and the MCP evaluation lanes are migrated
  with the release pipeline.
