# Helper Lambdas

The four Lambdas Stacktape deploys into customer AWS accounts:

- `stacktapeServiceLambda` — custom resources, alarm notifications, issue processing, custom tagging, ECS maintenance;
- `batchJobTriggerLambda`;
- `cdnOriginRequestLambda` and `cdnOriginResponseLambda` — CloudFront edge functions.

They are separately built deployment artifacts, but they are **not** a workspace package, and this directory is their
permanent home until the condition below is met.

Wire contracts shared by helper runtime entrypoints and CLI synthesis belong beside the artifacts. CloudFront's
Stacktape-owned origin headers therefore live in `cloudfront/cloudfront-origin-headers.ts`; consumers use the existing
`@helper-lambdas/*` application alias so synthesis and both edge artifacts compile from one source of truth.

## Why this is not `packages/helper-lambdas`

`SIMPLIFIED-MIGRATION.md` once listed `helper-lambdas` as a package to extract "because it is an independently built
artifact set". Building the artifacts is indeed independent; the source is not. The original transitive-import
measurement that settled it remains the relevant baseline:

- the four entrypoints reached **31 non-helper CLI modules, ~9,000 lines**, almost all broadly consumed elsewhere;
- extracting the physical naming source into `@stacktape/naming` removed a public/private duplicate, but did not turn
  the remaining AWS, S3, CloudFormation, tRPC, and configuration closure into helper-owned code;
- the largest are general CLI facilities: the AWS SDK manager, the S3 sync engine, and shared physical naming (now
  honestly owned by `@stacktape/naming` because both CLI and Console consume it), alongside broadly used filesystem,
  configuration, logical-naming, and miscellaneous CLI modules;
- exactly one module is helper-only — `src/stacktape-api/aws-identity-protected.ts`, 78 lines — and it still depends on
  `src/aws/identity.ts` and `src/stacktape-api/client.ts`, which reach `src/aws/fetch-handler.ts` (13 other consumers);
- alarm configuration uses an explicit `AlarmDefinition` import from `@stacktape/config`, while the runtime imports the
  CLI-only `AlarmNotificationEventRuleInput` payload from `src/domain/config-manager/resolved-types/alarms.ts`. AWS
  credentials are imported explicitly from the general CLI facility `src/aws/credentials.ts`; supported region types
  come from the configuration vocabulary at `@stacktape/config/aws-regions`. Neither capability is helper-owned.

Every way to make a package out of that is worse than co-location:

| Approach                                                     | Why it was rejected                                                                                                                                                    |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Move the closure into the package                            | The CLI would import its AWS SDK manager, naming and CloudFormation types from a package called `helper-lambdas`. Dishonest ownership.                                 |
| Import `apps/cli` from the package                           | Package-to-app dependency. Forbidden, including via TypeScript `paths` or a build path.                                                                                |
| Copy the utilities into the package                          | Two sources of truth for customer-visible resource names and CloudFormation responses.                                                                                 |
| Split out further `aws`/`config` packages only for this move | A package cascade with no additional present-day consumer; the independently justified `@stacktape/naming` package does not make the rest of the closure helper-owned. |
| Refactor the runtimes to erase the imports                   | Changes deployed behavior to satisfy a directory diagram.                                                                                                              |
| A package that only points a script here                     | A workspace entry that owns no source.                                                                                                                                 |

Co-location keeps one concept — "these are CLI-owned artifacts built by a CLI script" — instead of adding a package
boundary plus the machinery required to pretend the dependency runs the other way.

## What would justify revisiting

Extract the package when the helper runtimes no longer need general CLI implementation to run — concretely, when the
non-helper closure is small and helper-dominant (a handful of modules whose honest owner is helper-Lambda runtime
behavior), and the runtime source no longer depends on CLI-only resolved configuration contracts such as
`AlarmNotificationEventRuleInput`. A deliberate, separately justified slice that narrows the closure is the
prerequisite; the package is the result, not the trigger.

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
`src/utils/helper-lambdas.ts`. `test:characterization:helper-lambdas` bundles with Bun, so per the CLI's `AGENTS.md` it
has to run on Linux or macOS.
