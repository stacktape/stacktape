# Truthful packaging output size

## Goal

Make the CLI's packaging-output size contract describe the values it already emits, without changing packaging or
serialization behavior.

## User-visible/end-to-end behavior

No intentional behavior change. Cached jobs continue to emit `null`; ES image development builds continue to emit
`null`; pre-zipped custom artifacts continue to leave size `undefined`, which JSON serialization omits; measured
artifacts continue to emit a number.

## Why this slice exists

At integration commit `20c8270c`, the ambient `PackagingOutput` and `PackageWorkloadOutput` contracts require a numeric
size even though existing producers use `number`, `null`, and `undefined`. This creates 21 direct strict diagnostics
and has encouraged assertion casts in six Lambda wrappers.

## Prerequisite integration commit

`20c8270c` (`cli: type S3 sync callbacks`)

## Current implementation and known constraints

- `outcome` is already a runtime discriminator, but even a bundled result can legitimately have all three size states.
- `#packagedJobs` is emitted as event data. JSON preserves `null` and omits `undefined`.
- `@stacktape/packaging` neither owns nor consumes this CLI orchestration contract and already compiles strictly.
- The Windows checkout cannot run the Bun packaging/release artifact gates; those remain a Linux/macOS phase gate.

## Target ownership

The contract stays in the CLI. Do not move it into `packages/packaging`.

## Provisional interface

Both packaging result shapes use:

```ts
size: number | null | undefined;
```

The pre-zipped custom-artifact local size must likewise be explicitly optional. Do not introduce a new discriminator,
result hierarchy, generic output abstraction, or normalization step.

## Must-preserve behaviors

- Exact result object keys and values from every producer.
- JSON distinction between explicit `null` and omitted `undefined`.
- Cache decisions, event data, archive paths/layout, digests, S3 keys, and progress behavior.
- Existing `outcome` and `skipped` values.

## Intentional v4 changes allowed

None. This is a type-contract correction only.

## Owned paths

- `apps/cli/src/domain/packaging-manager/types.ts`
- `packages/packaging/src/artifact/custom-artifact.ts`
- The six non-ES Lambda wrappers that contain now-unnecessary `as PackagingOutput` return casts.
- `apps/cli/tests/characterization/packaging-contract.spec.ts`
- This dossier.

## Shared/frozen paths

All other production files, workspace configuration, dependencies, generated files, and private Console code.

## Required deterministic tests

- Characterize cached/skipped output as explicit `size: null`.
- Characterize a pre-zipped custom artifact as `size: undefined` and verify JSON omits the key.
- Measure strict diagnostics before and after; expected direct reduction is 21.
- Run the CLI six-project typecheck, packaging characterization, repository formatting and lint.
- Scan for new assertions, `any`, non-null assertions, and suppressions.

## Artifact/AWS checks

No deployment and no AWS calls. Linux/macOS packaging, release, CLI-smoke, and helper-artifact gates remain deferred to
the phase gate.

## Public/private/generated implications

Public CLI only. No private-submodule, generated-artifact, or published package-contract change.

## Acceptance

- Runtime and serialized result shapes are unchanged.
- The 21 size-contract diagnostics disappear without assertions or suppressions.
- The focused characterization proves both `null` and omitted `undefined`.
- Normal typecheck, format, and lint remain green.
- An independent reviewer confirms compatibility and conceptual simplicity.

## Expected commit

One public commit: `cli: model packaging output size`

## Out of scope

- Fixing the remaining packaging diagnostics.
- Normalizing legacy `null`/`undefined` output.
- Moving additional packaging code.
- Changing bundler defaults or authored/defaulted config contracts.
