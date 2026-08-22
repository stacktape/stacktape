# Helper Lambdas

Stacktape deploys four CLI-owned artifacts into customer accounts:

- `stacktapeServiceLambda` for custom resources and maintenance;
- `batchJobTriggerLambda`;
- `cdnOriginRequestLambda` and `cdnOriginResponseLambda` at the CloudFront edge.

They stay under the CLI because their source still depends on CLI AWS, configuration and runtime contracts. A separate
workspace package would either depend on an application or duplicate those contracts. Revisit extraction only after the
non-helper dependency closure becomes small and honestly belongs to helper-Lambda runtime behavior.

Wire contracts shared by synthesis and a helper runtime live here. Import them through the existing `@helper-lambdas/*`
alias; do not copy the shape into CLI source.

## Compatibility

The following affect deployed customer infrastructure:

- artifact names and `index.default` handlers;
- target, minification, externals and source-map settings;
- extracted contents and layout;
- per-artifact size limits;
- the content digest used for upload identity.

ZIP bytes can differ because timestamps are not fixed. Compare extracted content.

```sh
pnpm --filter @stacktape/cli run test:helper-lambdas
pnpm --filter @stacktape/cli run test:characterization:helper-lambdas
```
