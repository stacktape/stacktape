# Strict typing: resources after defaults

## Goal

Express the existing boundary between:

- a resource normalized from authored configuration, where defaultable properties remain optional; and
- the same resource after `RESOURCE_DEFAULTS` has been merged into it.

This is a type-contract repair, not a defaulting rewrite. Preserve the current merge behavior and public configuration
shape exactly.

## Owned files

- `apps/cli/src/config/random.ts`
- `apps/cli/src/domain/config-manager/normalized-resource.ts`
- `apps/cli/src/domain/config-manager/utils/misc.ts`
- `apps/cli/src/domain/config-manager/index.ts` (only the generic defaulted-resource return boundary)
- `apps/cli/src/domain/config-manager/resolved-types/multi-container-workloads.ts`
- `apps/cli/tests/characterization/config-normalization.spec.ts`
- this dossier

Do not fix unrelated strict diagnostics in these files.

## Intended contract

1. Let TypeScript retain the actual inferred shape of each entry in `RESOURCE_DEFAULTS`. Constrain the table with
   `satisfies`, without `as const` and without adding a recursive `DeepPartial` abstraction.
2. Add a `ResourceDefaultsOf<T>` lookup and a `DefaultedResource<T, TParent>` intersection beside `NormalizedResource`.
   `NormalizedResource` must continue to describe the honest pre-default shape.
3. Keep the runtime merge algorithm. Use one localized assertion-signature helper to state its postcondition rather than
   scattering casts or non-null assertions through consumers.
4. Make `getResourcesFromConfig` return defaulted resources.
5. If measurement remains favorable, state the all-producer container-workload guarantee that `scaling.minInstances` and
   `scaling.maxInstances` are present. Do not make `scalingPolicy` required: the Convex producer does not supply it.

Implement items 1–4 and measure before item 5. If tightening the all-producer contract causes broader dishonest typing
or net-negative churn, omit item 5 and report why.

## Behavior to characterize

- Function, edge-function, bastion, service, and multi-container defaults are filled.
- An authored value wins while missing siblings are filled.
- Existing nested write-back behavior is pinned, not silently changed.
- A returned nested object does not alias the defaults table, and repeated reads are stable.
- Empty default entries do not change a resource.
- Compile-time tests distinguish normalized from defaulted resources, retain parent identity, and keep `scalingPolicy`
  optional for the all-producer container shape.

## Known behavior debt outside this slice

- Minimal-template cleanup deletes `cleanedConfig[key]` instead of `cleanedConfig.resources[key]`.
- The special `container` merge branch assigns to a `forEach` parameter and therefore does not update the array when its
  fallback branch is reached. No current resource default exercises that branch.
- Nested default merging can write into the working resolved-config object because the resource copy is shallow. Raw
  authored config remains isolated by the earlier serialization clone.

Record these; do not opportunistically change them in this slice.

## Gates

- Focused config-normalization characterization tests.
- All six TypeScript project checks.
- Strict diagnostic before/after measurement using the established absolute-tsconfig harness.
- Oxfmt and Oxlint on owned files.
- Independent reviewer approval, specifically covering the honesty of the assertion signature, generic inference,
  circular-type risk, runtime preservation, and compile-time tests.
