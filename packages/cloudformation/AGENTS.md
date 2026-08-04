# @stacktape/cloudformation

This package is the single CloudFormation vocabulary used by synthesis, authored configuration and the published
`stacktape` declarations. Runtime values are mutable plain objects; do not reintroduce resource classes, base classes,
serialization hooks, per-resource factories or a parallel generated model.

## Source and generated output

- `src/intrinsics.ts` owns structural intrinsic types and lower-case helper functions.
- `src/resource.ts` owns resource/template envelopes, `cfnResource` and the explicitly unchecked third-party escape
  hatch.
- `generated/resources/*.ts` and `generated/resource-types.ts` are produced by `scripts/generate.ts` from the exact
  service-spec versions in `package.json`. Never edit them manually.
- Generated resource properties include writable inputs and their reachable nested property types, not read-only
  resource attributes.

Keep `isIntrinsic` forward-compatible with single-key `Fn::*` objects while keeping the authored helper/type surface
precise. Standard AWS resources use `cfnResource`; use `cfnResourceUnchecked` only for third-party, private-registry or
newly introduced types absent from the pinned specification.

## Checks

```sh
pnpm --filter @stacktape/cloudformation run generate:check
pnpm --filter @stacktape/cloudformation run typecheck
pnpm --filter @stacktape/cloudformation run test
```

After deliberately updating the pinned specification, run `generate`, review the provider-model diff, and run the npm
declaration checks because `stacktape/cloudformation` publishes all known generated resource types in one declaration
file.
