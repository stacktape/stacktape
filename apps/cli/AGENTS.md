# Stacktape CLI

This application is the Stacktape CLI as migrated from v3. Its command/runtime and synthesis ownership remain largely
intact, while concrete reusable capabilities such as config, deterministic AWS naming, and packaging have been
extracted behind explicit package entry points. Refactors remain behavior-focused rather than directory-driven.

## Layout

- `src/` — commands, application/domain managers, TUI, and MCP. The config-authoring runtime used to build the
  published `stacktape` npm API lives in `@stacktape/config-authoring`. Executable process boundaries live in
  `src/entrypoints`; the outbound
  Stacktape control-plane tRPC clients live in `src/stacktape-api`. CLI-owned AWS facilities live in `src/aws`, and
  application utilities live in `src/utils`. Helper Lambdas may import those modules because they are CLI-owned
  deployment artifacts; co-location
  does not make the modules a reusable workspace package. The historical catch-all `shared/` directory is gone.
  TypeScript config loading accepts only a default `defineConfig` export. That authoring runtime compiles the plain
  config and its transform side channel in one invocation; the CLI must never execute a config factory again to
  rediscover functions. The command composition layer captures raw authoring inputs before target-stack resolution,
  then supplies the final stack identity for directive resolution and normalization. `ConfigManager`,
  `ConfigResolver`, and built-in directives receive those contexts explicitly; they must not read the CLI global-state
  manager. YAML remains a plain-data input and has no transform side channel.
  `src/domain/stack-context.ts` is the immutable stack identity captured after account/project/stage resolution.
  Configuration normalization, calculated-resource synthesis and template finalization use that same value. Resource
  resolvers must not reach back into mutable CLI global state for names, regions, account IDs or invocation paths.
  `src/aws/context.ts` owns the per-session client inputs: a refreshable credential provider, region, optional local
  endpoint and middleware. Service clients must use that context so refreshed credentials and emulator endpoints are
  not bypassed. `AwsSdkManager` is the transitional invocation-scoped composition object, not the owner of credential
  refresh. New AWS behavior must not add another unrelated flat method to that class. Extract a cohesive boundary only
  when it has real callers and behavior of its own. Stack lifecycle and private-type registry operations are reached
  as `awsSdkManager.cloudFormation` and `awsSdkManager.cloudFormationRegistry`. Bucket/object/version operations and
  directory synchronization are reached as `awsSdkManager.s3`; upload presets and native-header classification live
  beside that capability in `src/aws/s3-upload-options.ts`. IAM role/policy operations and STS role assumption are
  reached as `awsSdkManager.iam` and `awsSdkManager.sts`; keep the policy-repair and credential-validation behavior in
  those boundaries. ECR image/auth operations and Lambda invocation/deployment operations are reached as
  `awsSdkManager.ecr` and `awsSdkManager.lambda`; Lambda clients retain the extended invocation timeout. Pollers and
  other workflow objects receive the narrow capabilities they use instead of the complete manager. ECS discovery,
  task registration, service updates, ECS Exec and ECS-targeted CodeDeploy operations are reached as
  `awsSdkManager.ecs`; the CodeDeploy client belongs there because it implements the ECS blue-green deployment
  workflow rather than a general CodeDeploy surface. CodeBuild API operations and buildspec construction are reached
  as `awsSdkManager.codeBuild`; the cross-service pipeline setup and secret lifecycle remain in
  `src/aws/codebuild-deployment.ts`. Do not restore the removed, unreachable remote-delete runner. Session Manager
  sessions and Run Command shell execution are reached as `awsSdkManager.systemsManager`; Parameter Store is a
  separate capability despite using the same AWS service client. SSM Parameter Store, Secrets Manager, CloudWatch
  logs/metrics/alarms, and Route 53/ACM/SES domain operations are reached as `awsSdkManager.parameterStore`,
  `awsSdkManager.secrets`, `awsSdkManager.observability`, and `awsSdkManager.domains`. Regional resource-tag discovery,
  Cost Explorer tags and account budgets form the budget workflow's `awsSdkManager.costManagement` boundary.
  Distribution lookup and cache invalidation are reached as `awsSdkManager.cloudFront`; invalidation deliberately
  confirms that AWS accepted the request after 1.5 seconds rather than waiting for completion.
  EC2 instance-type, VPC, subnet and route-table discovery are reached as `awsSdkManager.ec2`.
  Auto Scaling group, OpenSearch instance-limit, and RDS instance/cluster lookups retain separate service boundaries
  at `awsSdkManager.autoScaling`, `awsSdkManager.openSearch`, and `awsSdkManager.rds`; do not collapse them into a
  generic resource-details adapter.
  Capability extraction must keep using `src/aws/context.ts` client construction so credential
  refresh, endpoint overrides, retry/redirect middleware and service-specific timeouts do not drift.
  `package`, `synth`, and `validate` initialize that context from the standard local AWS credential provider chain and
  do not require Stacktape Console authentication. Account identity remains required because it participates in
  deterministic names and synthesized ARNs.
  Packaging implementation lives entirely in `@stacktape/packaging`; the CLI's
  `PackagingManager` remains its composition root and supplies the concrete dependency installer, error constructor,
  process/Docker/binary actions, invocation-specific paths and progress loggers. Global runtime state, artifact
  deployment and command orchestration stay in the application (see the package's `AGENTS.md`).
  Deterministic CloudFormation logical IDs, AWS physical names, workload/resource/alarm identifiers, ARNs, Console
  links, SSM paths, stack descriptions, output/tag/metadata names, and truncation/hash behavior live in
  `@stacktape/naming`. CLI runtime/build paths, generated CloudFormation links and URIs, artifact keys, and alarm
  descriptions remain beside the application behavior that owns them.
- `helper-lambdas/` — sources of the four Lambdas Stacktape deploys into customer accounts. Cross-artifact wire
  contracts used by synthesis live beside them (for example, `cloudfront/cloudfront-origin-headers.ts`). They are
  separately built artifacts that stay in this application because their source needs general CLI implementation and
  CLI-owned resolved configuration types; see that directory's `AGENTS.md` for the measurement and the compatibility
  contract.
- `scripts/` — build, code generation, release and publishing tooling, plus the committed platform binaries under
  `scripts/assets/` that release archives ship. The npm package manifest and JavaScript launcher are release inputs
  under `scripts/release/npm-package`; they are not application runtime source. `scripts/real-aws/packaging-canary.ts`
  is an explicitly opted-in deploy/no-op/update/delete diagnostic. It must run only against an exact verified
  disposable account and externally supplied unique stack name; it is never part of ordinary tests or releases.
  `scripts/publish-install-scripts.ts` publishes the seven installer assets directly through the release-only AWS
  identity, verifies S3 checksums, invalidates exact CloudFront paths, and verifies public bytes. It must not invoke
  Stacktape or accept a `STACKTAPE_API_KEY`.
- `starter-projects/` — canonical starter templates, not installed workspace projects. Their TypeScript configs are
  named `tsconfig*.template.json` so editors do not treat framework templates as live projects; starter
  materialization removes the `.template` segment (for example, `tsconfig.node.template.json` becomes
  `tsconfig.node.json`) before publishing or use. `starter-projects-metadata.json` is derived from these sources by
  the CLI's Turbo `generate` task and is exported to integrated consumers as
  `@stacktape/cli/starter-projects-metadata.json`.
- `src/domain/config-manager/resolved-types/` — the CLI's resolved/internal configuration model. These are ordinary
  modules with explicit exports and imports; application types must not be added to the global namespace.
- `src/environment.d.ts` — asset-module declarations required by the bundler. Ambient declarations are limited to
  environment and third-party module shims such as `src/aws/s3-sync/streamsink.d.ts`.
- `@generated/` — committed generated data (config validators, LLM docs, price tables and AWS catalogs). The
  canonical config JSON schema lives with its model at `packages/config/generated/config-schema.json`. Never
  hand-edit; regenerate with the matching task. The main CLI project excludes this directory, so
  `@generated/tsconfig.json` owns the generated Zod validator (`test:generated-types`).
  The ordinary `generate` task owns starter metadata, the canonical JSON schema and Zod validator, the enhanced
  documentation schema, `@generated/schemas/api-reference-data.json`, and the complete `@generated/llm-docs` tree.
  `generate:check` produces that complete set in a temporary directory and compares bytes without modifying the
  checkout; it also rejects unexpected files in the owned schema and LLM-docs directories. The LLM corpus reads
  canonical data from `apps/docs` plus the current config model and stages the complete tree before replacement.
  Release archives carry only `llm-docs/chunks/chunks.jsonl`, the corpus the MCP
  runtime actually reads; the npm launcher carries no duplicate docs because it downloads that archive. The rendered
  pages, indexes and single-file exports remain generated publication inputs. `api-reference-data.json` is the
  normalized API reference this generator
  already renders into the corpus, published so `apps/docs` can render the same data instead of keeping a second copy
  of the extractor — a copy that in practice diverged and stopped decoding HTML entities. Change the normalization
  here, never in a consumer. AWS
  prices, CloudFormation resource-type catalogs and RDS versions are exported through explicit
  `@stacktape/cli/catalogs/*.json` subpaths so Console does not keep application-local copies. Those generators read
  live upstream data and have no pinned input; regenerate deliberately rather than as a side effect of an unrelated
  change. Typed CloudFormation resources and intrinsics live in `@stacktape/cloudformation`; its committed output is
  generated deterministically from an exactly pinned AWS CDK service specification by its ordinary Turbo `generate`
  task and checked by `generate:check`.
  Config-schema source discovery sorts normalized relative paths before constructing the TypeScript program; changing
  that ordering requires proving byte-identical generation on both Windows and Linux.
- The live AWS Pricing CSV parser and product catalog definitions used by `gen:price:info` live in
  `@stacktape/pricing/catalog`. The generated editor catalog remains CLI-owned output because this application
  defines and publishes its JSON shape.
  Package-owned `generate:check` tasks cover committed artifacts; do not replace them with a generate-then-Git-diff
  workflow, which mutates the checkout before it proves freshness.
- `.generated/monaco-declarations/` — ignored deterministic workspace output containing the four v4 declaration files
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

## Errors

- Intentional user-actionable failures use `CliError` with a stable semantic code such as
  `CONFIG_RESOURCE_NAME_INVALID`; do not add numbered `stpErrors.e*` entries or new `ExpectedError` call sites.
- Keep one-off errors next to the behavior that detects them. Add a domain-local factory only when a complex message is
  reused or centralizing it makes the owning rule clearer; do not recreate a global error catalog.
- Error messages and hints are plain text. Mark values, paths, options and commands with backticks, and let the TUI
  presentation boundary add color or emphasis. Domain code must not embed ANSI styling in an error.
- When translating an unknown lower-level failure, preserve it as `cause`. Re-throw an existing `CliError` unchanged.

## Checks

```sh
pnpm --filter @stacktape/cli run generate        # all committed CLI schemas, docs data/corpus and starter metadata
pnpm --filter @stacktape/cli run generate:check  # non-mutating freshness check for that complete output set
pnpm --filter @stacktape/cli run typecheck       # CLI, build/test projects, smoke fixtures and committed generated TypeScript
pnpm --filter @stacktape/cli run test            # complete source suite, characterization, generators, release/security checks, helper Lambdas, CLI smoke
pnpm --filter @stacktape/cli run test:src        # all colocated source tests, isolated per file to contain Bun module mocks
pnpm --filter @stacktape/cli run test:config-unit # authored-config npm API and directive-resolution unit tests
pnpm --filter @stacktape/cli run test:generators      # generator unit tests: declarations, JSDoc, schema and metadata
pnpm --filter @stacktape/cli run test:llm-docs        # corpus integrity and documented runtime safety invariants
pnpm --filter @stacktape/cli run test:starter-projects # config-name restoration and source-template invariants
pnpm --filter @stacktape/cli run test:generated-types # type-checks the committed generated schema validator
pnpm --filter @stacktape/cli run test:docker-secrets # proves registry password, build-arg and container-env values never reach Docker's argv
pnpm --filter @stacktape/cli run test:cli-smoke # compiles the binary and runs `--version` and `--help`
pnpm --filter @stacktape/cli run test:release-artifact
pnpm --filter @stacktape/cli run test:helper-lambdas # helper-Lambda runtime tests; no bundling, runs everywhere
```

Bun applies `mock.module()` process-wide. The normal `test:src` lane therefore uses Bun's per-file isolation and
covers every colocated source test without allowing one test file's application-singleton mocks to affect another.
The workspace-pinned Bun version also runs the normal build, compiled-binary smoke test, and helper-Lambda packaging
lanes on Windows; keep CI aligned with the root engine requirement when upgrading it.

## Deferred

- Framework-level starter validation belongs in a separate CI lane that materializes each starter into a temporary
  directory, installs with that starter's package manager, and runs its own typecheck with bounded concurrency,
  per-starter timeouts, and unconditional cleanup. It must not add every framework dependency to this workspace or
  run network installs as part of the normal CLI test command.
- Mutable schema and generated AI-documentation publication remain separate from the v4 npm/binary release. If they
  are reconnected, use direct resource-scoped OIDC rather than restoring Stacktape API-key authentication.
