# Strict typing: CDN-present synthesis inputs

## Goal

Express the control-flow fact the existing calculated-stack resolvers already establish: helpers that dereference a
resource's `cdn` configuration are called only after that resource has an enabled CDN.

This is a type-contract slice. Preserve CloudFormation output and every runtime branch exactly.

## Owned files

- `apps/cli/src/domain/config-manager/index.ts`
- `apps/cli/src/domain/calculated-stack-overview-manager/resource-resolvers/_utils/cdn.ts`
- `apps/cli/src/domain/calculated-stack-overview-manager/resource-resolvers/buckets/index.ts`
- `apps/cli/src/domain/calculated-stack-overview-manager/resource-resolvers/application-load-balancers/index.ts`
- `apps/cli/src/domain/calculated-stack-overview-manager/resource-resolvers/http-api-gateways/index.ts`
- `apps/cli/src/domain/calculated-stack-overview-manager/resource-resolvers/functions/index.ts`
- the smallest existing characterization test files needed to pin the predicate and semantic synthesis
- this dossier

Do not fix unrelated strict diagnostics in these files.

## Intended contract

Reuse the existing CDN-compatible resource union and add one narrow refinement:

```ts
export type ResourceWithPresentCdn<TResource extends StpCdnCompatibleResource = StpCdnCompatibleResource> =
  TResource & { cdn: NonNullable<TResource['cdn']> };
```

Add a generic `hasEnabledCdn` predicate whose runtime expression is equivalent to the existing branch checks. Use it
at the existing bucket, application-load-balancer, HTTP-API, and Lambda resolver boundaries.

Require the refined shape only in helpers that actually dereference `cdn`:

- `getOriginsForDistribution`
- `getCloudfrontDistributionConfigs`
- `getCloudfrontDistributionResource`
- `getCustomErrorResponses`
- `getCacheBehavioursForRouteRewrites`

Do not tighten helpers that do not read `cdn`. Do not move resolver responsibilities, add assertions or throws, or
attempt to remove existing unrelated resource-correlation casts in this slice.

The Lambda resolver accepts user and helper Lambdas, while only the user shape participates in CDN synthesis. If one
existing cast is still necessary at that already-guarded boundary, consolidate rather than multiply it and document
why.

## Measured expectation

At prerequisite commit `93e3e9f6`, strict diagnostics are 2,215 and `_utils/cdn.ts` owns 104. An independent in-memory
TypeScript probe reduced the project to 2,183, exactly 32 fewer diagnostics, with no new boundary assignability error.

## Behavior to characterize

- The predicate rejects an absent CDN block.
- The predicate rejects a present but disabled CDN block.
- The predicate accepts an enabled CDN block and narrows the resource for callers.
- Existing synthesis characterization continues to prove that an enabled load-balancer CDN creates exactly one
  enabled CloudFront distribution with the load balancer origin.
- CloudFormation output from the characterized synthesis fixture remains unchanged.

## Known behavior debt outside this slice

The load-balancer route-rewrite branch for an absent `routeTo` dereferences `routeRewrite.routeTo` even though omission
is supported and means “reuse the resource's default origin.” This can crash. It is recorded in
`architecture/v4/DEFERRED-ISSUES.md`; do not silently fix it as part of this type-only boundary.

## Gates

- Focused predicate/configuration and synthesis characterization tests.
- Full characterization tests.
- All six TypeScript project checks.
- Strict diagnostic before/after comparison, normalized by file and diagnostic code.
- Oxfmt, Oxlint, `git diff --check`, and a scan for new casts, non-null assertions, or suppressions.
- Independent reviewer approval covering runtime-equivalent guards, helper-boundary honesty, Lambda union handling,
  CloudFormation compatibility, and conceptual complexity.
