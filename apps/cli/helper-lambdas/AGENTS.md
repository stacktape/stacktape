# Helper Lambdas

The four Lambdas Stacktape deploys into customer AWS accounts:

- `stacktapeServiceLambda` — custom resources, alarm notifications, issue processing, custom tagging, ECS maintenance;
- `batchJobTriggerLambda`;
- `cdnOriginRequestLambda` and `cdnOriginResponseLambda` — CloudFront edge functions.

They are separately built deployment artifacts, but they are **not** a workspace package, and this directory is their
permanent home until the condition below is met.

## Why this is not `packages/helper-lambdas`

`SIMPLIFIED-MIGRATION.md` once listed `helper-lambdas` as a package to extract "because it is an independently built
artifact set". Building the artifacts is indeed independent; the source is not. Resolving every import from the four
entrypoints gives the measurement that settled it:

- the four entrypoints transitively reach **31 non-helper CLI modules, ~9,000 lines**;
- **30 of those 31 have other CLI consumers** — 1,809 distinct non-helper CLI files import at least one of them;
- the largest are general CLI facilities: the 3,434-line AWS SDK manager, the 1,418-line S3 sync engine, and the
  760-line `aws-resource-names` model (75 other CLI files), alongside `utils/misc` (89), `utils/fs-utils` (61),
  `config/random` (56), `naming/utils` (51) and `utils/constants` (43);
- exactly one module is helper-only — `shared/trpc/aws-identity-protected.ts`, 78 lines — and it still depends on
  `shared/aws/identity.ts` and `shared/trpc/client.ts`, which reach `shared/aws/fetch-handler.ts` (13 other consumers);
- the runtime source is typed against **ambient global config types** — `AlarmDefinition` and
  `AlarmNotificationEventRuleInput` from `types/stacktape-config/alarms.d.ts`, `AwsCredentials` from
  `types/common.d.ts`. Those declarations are the source of the published config schema and cannot leave `apps/cli`.

Every way to make a package out of that is worse than co-location:

| Approach                                   | Why it was rejected                                                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Move the closure into the package          | The CLI would import its AWS SDK manager, naming and CloudFormation types from a package called `helper-lambdas`. Dishonest ownership. |
| Import `apps/cli` from the package         | Package-to-app dependency. Forbidden, including via TypeScript `paths` or a build path.                                                |
| Copy the utilities into the package        | Two sources of truth for customer-visible resource names and CloudFormation responses.                                                 |
| Split out `aws`/`naming`/`config` packages | The package cascade the simplified migration abandoned.                                                                                |
| Refactor the runtimes to erase the imports | Changes deployed behavior to satisfy a directory diagram.                                                                              |
| A package that only points a script here   | A workspace entry that owns no source.                                                                                                 |

Co-location keeps one concept — "these are CLI-owned artifacts built by a CLI script" — instead of adding a package
boundary plus the machinery required to pretend the dependency runs the other way.

## What would justify revisiting

Extract the package when the helper runtimes no longer need general CLI implementation to run — concretely, when the
non-helper closure is small and helper-dominant (a handful of modules whose honest owner is helper-Lambda runtime
behavior), and the runtime source no longer depends on the ambient `types/` config declarations. A deliberate,
separately justified slice that narrows the closure is the prerequisite; the package is the result, not the trigger.

## Compatibility contract

Changing any of these is a customer-infrastructure change, not an implementation detail:

- exactly four artifacts, under exactly these names;
- the `index.default` handler of each;
- Node target, minification, externals and source-map emission;
- extracted artifact contents and layout;
- the per-artifact bundle size limits in `scripts/package-helper-lambdas.ts`;
- the content-addressed digest that names each ZIP and decides re-upload.

ZIP container bytes vary between builds because entry timestamps are not fixed. Compare extracted contents, not ZIP
bytes.

## Checks

```sh
pnpm --filter @stacktape/cli run test:helper-lambdas                 # runtime tests; runs on every platform
pnpm --filter @stacktape/cli run test:characterization:helper-lambdas # builds and structurally verifies the artifacts
```

`test:helper-lambdas` covers the deployed runtime behavior that has tests — alarm-notification delivery and console
routing failures, multi-language issue stack-trace parsing — plus the CLI-side artifact lookup in
`src/utils/helper-lambdas.ts`. `test:characterization:helper-lambdas` bundles with Bun, so per the CLI's `AGENTS.md`
it has to run on Linux or macOS.
