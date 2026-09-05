# Stacktape CLI

The CLI is the composition root for commands, AWS access, synthesis and deployments. Reusable configuration, authoring,
inference, naming, packaging, pricing and stack-info contracts live in workspace packages. Do not create a parallel
runtime or move code merely to make directories smaller.

## Layout and boundaries

- `src/entrypoints` contains process entrypoints.
- `src/commands` parses and orchestrates commands.
- `src/domain` owns CLI workflows and synthesis.
- `src/aws` owns invocation-scoped AWS clients and capabilities.
- `src/app` owns presentation and mutable invocation state.
- `src/stacktape-api` contains outbound control-plane clients.
- `src/init` runs repository analysis and the init wizard server.
- `helper-lambdas` contains four separately built artifacts deployed into customer accounts.
- `scripts` contains build, generation, release and guarded test tooling.
- `starter-projects` contains canonical starter sources; it is not a workspace collection.

There is no generic `shared` directory. Put behavior with its owner. New application types are ordinary imported
modules; ambient declarations are limited to environment and third-party module shims.

## Configuration and synthesis

TypeScript configs export one default `defineConfig` result. The authoring runtime compiles the config and its transform
side channel in one invocation; do not execute the config again to rediscover callbacks. YAML remains plain data.

Commands capture authored inputs before resolving the target stack, then pass one immutable `StackContext` through
directive resolution, normalization and synthesis. Config, template and calculated-resource code must not read mutable
CLI global state for account, region, project, stage or paths.

`@stacktape/config-inference` owns deterministic repository facts, verification and infrastructure composition for
`stacktape init`. CLI code owns filesystem scanning orchestration, agents, preflight, the loopback server and
deployment. Do not let agent-authored prose or unverified facts bypass the package's trust boundary.

## AWS

`src/aws/context.ts` owns the credential provider, region, local endpoint and middleware for one invocation. All service
clients must use it so credential refresh, retries and emulator endpoints stay consistent.

`AwsSdkManager` is an invocation-scoped composition object. Its service capabilities own coherent operations; do not add
unrelated flat methods or create another global client registry. Pollers and workflows should receive the narrow
capability they use. Preserve service-specific retry, timeout, redirect and cleanup behavior during extraction.

`package`, `synth` and `validate` use the standard local AWS credential chain and do not require Console login. They do
resolve account identity because it participates in stable names and ARNs.

## Generated and built artifacts

Never hand-edit `@generated`, `.generated`, `starter-projects-metadata.json` or helper-Lambda bundles.

- `generate` owns deterministic schemas, validators, docs data/corpus and starter metadata.
- `generate:check` computes those outputs elsewhere and compares bytes without changing the checkout.
- `generate:monaco` materializes ignored editor declarations needed by Console.
- `refresh:catalog:*` contacts live upstreams for prices, RDS versions or CloudFormation catalogs. Run it only when
  deliberately refreshing that snapshot.
- release output and helper-Lambda bundles are build artifacts, not source generation.

The CLI exports a few generated JSON catalogs to Console UI. These are data-only subpaths; never expose CLI runtime
source to another application.

## State and errors

`src/config/local-state-paths.ts` is the registry for hidden state written by the CLI. Every new hidden write must state
who owns it and when it is cleaned. User-selected outputs and other tools' configuration do not belong there.

Use `CliError` for expected, actionable failures. Give reusable classes a stable semantic code, keep one-off errors near
the rule that detects them, preserve lower-level failures as `cause`, and do not add new numbered `stpErrors` or
`ExpectedError` call sites. Domain messages are plain text; the TUI adds presentation.

## Tests

Read [`../../docs/testing.md`](../../docs/testing.md) before choosing a lane. In particular, `pnpm dev:cli <command>`
means “run the current CLI source against the dev control plane”; `pnpm dev:cli dev ...` is the product's local-runtime
command. Neither spelling chooses a deployment stage, so mutating tests must pass the stage, region, project name, and
credential mode explicitly.

Use the narrowest useful command while working:

```sh
pnpm --filter @stacktape/cli run typecheck
pnpm --filter @stacktape/cli run test:src
pnpm --filter @stacktape/cli run test:characterization
pnpm --filter @stacktape/cli run test:generators
pnpm --filter @stacktape/cli run test:cli-smoke
pnpm --filter @stacktape/cli run generate:check
```

The full `test` script covers source, characterization, generation, release/security, MCP, helper-Lambda and compiled
CLI behavior. `test:src` runs every source test file in a fresh Bun process with two workers and a two-minute per-file
limit. This contains module mocks and avoids the intermittent import-time failures seen with Bun 1.4.1's in-process
`--isolate`. Keep the network preload enabled. Run a single file with
`pnpm --filter @stacktape/cli exec bun test ./src/...`.

Normal tests must not contact AWS. Docker packaging tests and guarded real-AWS canaries are separate, explicit lanes. An
implementation-detail unit test is not sufficient for a changed CLI command, package artifact, AWS contract, or customer
workflow. See `scripts/real-aws/README.md` before running a deployment test. Agents may run its guarded development
canaries without asking again, but must preserve their account, ownership, cost, state, and verified-cleanup guards.
