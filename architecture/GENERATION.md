# Generated-file architecture

Generation follows the workspace dependency graph; it is not a separate workflow a maintainer has to remember.

```text
canonical source ──owner's generate task──> derived artifact ──ordinary package dependency──> consumer
                         │
                         └──generate:check──> compare expected bytes without writing the checkout
```

## Output classes

| Class                              | Examples                                                                                                | Policy                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Committed deterministic artifacts  | config schemas, the Zod validator, LLM corpus, starter metadata, CloudFormation types, design-token CSS | The owning workspace has `generate` and a non-mutating `generate:check`. Both are offline and deterministic.           |
| Ignored workspace materializations | Monaco declarations, Console's copied schema/declarations, Prisma client                                | The consumer's normal build/dev dependency creates them. They are never freshness-checked against Git.                 |
| Live-upstream snapshots            | AWS prices, RDS engine versions, CloudFormation resource catalogs                                       | Explicitly refreshed with the named `refresh:catalog:*` command. Ordinary build/check tasks never contact the network. |
| Build/release output               | `dist`, release archives, helper-Lambda bundles                                                         | Owned by `build` or the relevant packaging task, not by `generate`.                                                    |

The distinction is behavioral. A generated file is not “committed” merely because it exists under a directory named
`generated`, and build output does not become source generation merely because another task consumes it.

## Commands and ownership

- `pnpm generate` runs package-owned deterministic generators through Turbo.
- `pnpm generate:check` computes committed outputs away from their real paths and compares their contents without
  changing the checkout. A generator may use memory or a temporary directory. Missing, outdated, and unexpected files
  fail with the owning command.
- Ordinary `build`, `typecheck`, `test`, and `dev` tasks depend on the generation tasks they need in `turbo.json`.
- A package owns the algorithm and output its `package.json`/`turbo.json` declare. Consumers read an exported artifact
  or depend on that task; they do not copy the algorithm.

The three networked snapshot refreshes are intentionally outside Turbo's ordinary task graph:

```sh
pnpm --filter @stacktape/cli run refresh:catalog:aws-prices
pnpm --filter @stacktape/cli run refresh:catalog:cloudformation
pnpm --filter @stacktape/cli run refresh:catalog:rds
```

Run them only when deliberately updating their upstream catalog, then review and test the resulting committed diff.

There is deliberately no second central generator registry. Package scripts plus the Turbo graph are the executable
source of truth; a separate manifest would duplicate paths and task names and could drift.

## Current deterministic owners

| Owner                                      | Committed output                                                                                               |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `@stacktape/cloudformation`                | `packages/cloudformation/generated/**`                                                                         |
| `@stacktape/cli`                           | `apps/cli/starter-projects-metadata.json`, `apps/cli/@generated/schemas/**`, `apps/cli/@generated/llm-docs/**` |
| `@stacktape/cli` (cross-package exception) | `packages/config/generated/config-schema.json`                                                                 |
| `@stacktape/design-tokens`                 | `packages/design-tokens/generated/tokens.css`                                                                  |

The config-schema exception is explicit: its model belongs to `@stacktape/config`, but the current schema compiler also
provides CLI declaration generation and relies on the CLI's TypeScript program. Do not create a duplicate config
compiler merely to eliminate the cross-package write. Move it only when one compiler can own both uses and preserve the
schema byte-for-byte.

`apps/cli/.generated/monaco-declarations` is intentionally ignored materialization. Docs and Console request
`@stacktape/cli#generate:monaco` through Turbo, then consume the four declarations. Console's copied public files and
Prisma's generated client follow the same materialization rule.

## Generator contract

A deterministic generator must:

1. enumerate and sort unordered inputs explicitly;
2. write only its declared output paths and remove stale files in an owned directory;
3. avoid timestamps, machine-specific absolute paths, locale ordering, and network access;
4. expose a non-mutating `--check` path for committed output;
5. stage a multi-file replacement before installing it when interruption could leave consumers with a partial tree;
6. have a semantic test for transformations that are not a direct serialization.

There is no universal watch process. Turbo runs generation before a consumer starts; add a native watcher only when a
long-running development process has demonstrated that it must react to changing canonical input.
