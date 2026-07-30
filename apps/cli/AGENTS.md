# Stacktape CLI

This application is the Stacktape CLI as migrated from v3. Its command/runtime and synthesis ownership remain largely
intact, while concrete reusable capabilities such as config, deterministic AWS naming, and packaging have been
extracted behind explicit package entry points. Refactors remain behavior-focused rather than directory-driven.

## Layout

- `src/` — commands, application/domain managers, TUI, MCP, and the published `stacktape` npm API (`src/api/npm`).
- `shared/` — AWS clients, packaging bundlers, CLI-only logical/generated/filesystem naming, and tRPC clients used by
  both the CLI and the helper Lambdas. Deterministic AWS physical names, ARNs, Console links, SSM paths, stack
  descriptions, output/tag names, and truncation/hash behavior live in `@stacktape/naming`.
  `shared/packaging` stops where the CLI's own vocabulary begins. ES split bundling, package resolution and native
  dependency installation/layer layout live in `@stacktape/packaging`; the CLI supplies its concrete dependency
  installer, typed packaging-error constructor, Docker execution action and invocation-specific installation root.
  `eventManager` progress, global runtime state, artifact deployment and command orchestration stay here (see the
  package's `AGENTS.md`).
- `helper-lambdas/` — sources of the four Lambdas Stacktape deploys into customer accounts. They are separately built
  artifacts that stay in this application because their source needs general CLI implementation and the ambient
  `types/` declarations; see that directory's `AGENTS.md` for the measurement and the compatibility contract.
- `scripts/` — build, code generation, release and publishing tooling, plus the committed platform binaries under
  `scripts/assets/` that release archives ship.
- `starter-projects/` — canonical starter templates, not installed workspace projects. Their TypeScript configs are
  named `tsconfig*.template.json` so editors do not treat framework templates as live projects; starter
  materialization removes the `.template` segment (for example, `tsconfig.node.template.json` becomes
  `tsconfig.node.json`) before publishing or use. `starter-projects-metadata.json` is derived from these sources by
  the CLI's Turbo `generate` task and is exported to integrated consumers as
  `@stacktape/cli/starter-projects-metadata.json`.
- `types/` — the CLI's resolved/internal global declaration API. Declarations that depend on the authored
  configuration model import their types explicitly from `@stacktape/config` and publish the existing globals
  through `declare global`; there is no ambient alias bridge. The retained JSDoc still feeds generated schema/npm
  content, so `types/` remains excluded from formatters.
- `@generated/` — committed generated data (CloudFormation types, config validators, LLM docs, price tables). The
  canonical config JSON schema lives with its model at `packages/config/generated/config-schema.json`. Never
  hand-edit; regenerate with the matching task. The main CLI project excludes this directory, so
  `@generated/tsconfig.json` owns both CloudFormation trees and the generated Zod validator
  (`test:generated-types`). `generate-schemas.ts` owns only `@generated/schemas/validate-config-zod.ts` and preserves
  separately generated schema variants in that directory. `generate:llm-docs` owns the enhanced documentation schema
  and the complete `@generated/llm-docs` tree; it reads canonical data from `apps/docs` plus the current config model,
  stages the corpus before replacement, and has a separate Turbo cache from the uncached config-schema task. AWS
  prices, CloudFormation resource types and RDS versions are exported through explicit
  `@stacktape/cli/catalogs/*.json` subpaths so Console does not keep application-local copies. Those generators read
  live upstream data, as do `gen:cloudform` and `gen:cf:types`, and have no pinned input; regenerate deliberately
  rather than as a side effect of an unrelated change.
  Config-schema source discovery sorts normalized relative paths before constructing the TypeScript program; changing
  that ordering requires proving byte-identical generation on both Windows and Linux.
  The root `check:generated-diff` gate checks both tracked changes and untracked files in every committed generated
  scope; a newly generated page must be committed and cannot pass CI merely because `git diff` ignores it.
- `generated/monaco-declarations/` — ignored deterministic workspace output containing the four v4 declaration files
  served by Console's Monaco editor. `generate:monaco` reuses the npm declaration assembler without building or
  mutating `__release-npm`; Console build/dev materializes it automatically and then copies it into its served assets.
- `tests/characterization/` — behavioral baselines for the CLI contract, config runtime, packaging and synthesis.
  `tests/tsconfig.json` is their editor project and is part of the normal CLI typecheck.
- `_test-stacks/` — small Stacktape projects used as test input. `config-loading-smoke/` is the imported one the
  characterization suite loads; `packaging-smoke/` is a disposable stack deployed to real AWS by hand to check split
  bundling and Lambda layers, described in its own `README.md` and in the root `DEVELOPMENT.md`.

## Toolchain

- pnpm installs; Bun runs the scripts and builds, exactly as the application was written.
- Two TypeScript versions are in play on purpose. Validation uses the workspace's TypeScript 6, which is why
  `typecheck` invokes `../../node_modules/typescript/bin/tsc` instead of the package-local `tsc`. The `typescript`
  runtime dependency stays on 5.9 because the code-generation scripts and the config loader use the compiler API,
  and it is also what `@opentui/core`'s types-only peer resolves against.
- `tsconfig.json` keeps the compiler options the sources were written against. TypeScript 6 enables `strict` by
  default and this code predates that, so `strict` is explicitly off. Turning it on is a migration of its own
  (~2,500 diagnostics). `paths` carries the mappings that used to come from `baseUrl`, which TypeScript 6 deprecates.
- `.prettierrc` is not repository formatting: `scripts/build-npm-main-export.ts` invokes Prettier with it to format
  the `.d.ts` files shipped in the `stacktape` npm package. Repository sources are formatted with oxfmt.
- `@generated/` and `starter-projects/` are excluded from oxfmt, oxlint, jscpd and knip. The workspace lint rules the
  imported sources do not satisfy yet are listed per rule in the root `.oxlintrc.json` override for `apps/cli`.
- Dependency resolutions match the `bun.lock` of the imported source commit, so the structural move is not also a
  dependency update. `@smithy/fetch-http-handler`, `@smithy/protocol-http`, `lodash`, `@types/lodash` and `tar` are
  pinned exactly because transitive consumers otherwise pull pnpm's deduplicated newer version. Deliberate
  exceptions: `@octokit/plugin-throttling` 11 (Octokit Core 7 peer) and `solid-js` 1.9.12 (OpenTUI peer).
- `bunfig.toml` preloads `scripts/test-preload.ts` for every Bun test. It replaces inherited AWS credentials, disables
  metadata/profile endpoint resolution, and rejects non-loopback fetch/HTTP(S) dispatch. This is an application-level
  fail-closed guard for normal AWS SDK paths, not an operating-system network sandbox; tests that spawn processes or
  use raw sockets still own their isolation.

## Checks

```sh
pnpm --filter @stacktape/cli run generate        # starter metadata plus deterministic config JSON/Zod schemas
pnpm exec turbo run generate:llm-docs --filter @stacktape/cli # enhanced schema and complete shipped LLM corpus
pnpm --filter @stacktape/cli run typecheck       # CLI, build/test projects, smoke fixtures and committed generated TypeScript
pnpm --filter @stacktape/cli run test            # characterization, generators, command/Docker secret safety, release security, MCP docs, helper Lambdas, CLI smoke
pnpm --filter @stacktape/cli run test:config-unit # authored-config npm API and directive-resolution unit tests
pnpm --filter @stacktape/cli run test:generators      # generator unit tests: JSDoc escaping, cloudform naming/generics
pnpm --filter @stacktape/cli run test:llm-docs        # corpus integrity and documented runtime safety invariants
pnpm --filter @stacktape/cli run test:starter-projects # config-name restoration and source-template invariants
pnpm --filter @stacktape/cli run test:generated-types # type-checks committed CloudFormation and schema TypeScript
pnpm --filter @stacktape/cli run test:docker-secrets # proves registry password, build-arg and container-env values never reach Docker's argv
pnpm --filter @stacktape/cli run test:cli-smoke # compiles the binary and runs `--version` and `--help`
pnpm --filter @stacktape/cli run test:release-artifact
pnpm --filter @stacktape/cli run test:helper-lambdas # helper-Lambda runtime tests; no bundling, runs everywhere
```

Two known constraints:

- Bun applies `mock.module()` process-wide, and several `src/**/__tests__` files stub whole application singletons.
  Those files pass individually but cannot share one `bun test` process, so `test` runs the product's lanes rather
  than the whole tree. Making the unit tests process-safe is outstanding work.
- On Windows, Bun 1.3.9's bundler aborts on modules reached through pnpm's symlinked `node_modules`
  ("Expected pretty file path to have only forward slashes"). Every Bun-bundling lane — `build`, `build:dist`,
  `pkg:hl`, `test:characterization:helper-lambdas`, `test:cli-smoke`, `test:release-artifact` — therefore has to run
  on Linux or macOS. Typecheck and the non-bundling test lanes run everywhere.

## Deferred

- Framework-level starter validation belongs in a separate CI lane that materializes each starter into a temporary
  directory, installs with that starter's package manager, and runs its own typecheck with bounded concurrency,
  per-starter timeouts, and unconditional cleanup. It must not add every framework dependency to this workspace or
  run network installs as part of the normal CLI test command.
- The v3 release workflow, its `scripts/release-workflow.spec.ts` gate, and the MCP evaluation lanes are migrated
  with the release pipeline. The `release` and `build:bin` scripts that dispatched those workflows were removed
  rather than left pointing at workflows this repository does not have; they return with the pipeline.
