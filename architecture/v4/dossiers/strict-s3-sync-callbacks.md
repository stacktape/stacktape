# Strict S3 sync callback contracts

## Goal

Make the existing S3 directory-sync engine honestly type-check under TypeScript strict mode without redesigning it.

## User-visible/end-to-end behavior

No intentional behavior change. Upload, download, retry, progress, deletion, multipart ETag, skip-file, and custom
`getS3Params` behavior must remain unchanged.

## Why this slice exists

At integration commit `a01c4341`, `shared/aws/s3-sync/index.ts` owns 64 strict diagnostics; 63 are untyped callbacks or
helpers inherited from its callback-style implementation. This is one repeated contract problem, not 64 independent
bugs.

## Prerequisite integration commit

`a01c4341` (`cli: require current helper resolver properties`)

## Current implementation and known constraints

- This is a 1,400-line, callback-oriented engine derived from `auth0/node-s3-client`.
- It is used by the CLI and remains under `apps/cli/shared`; this slice does not extract it.
- There is no focused test today.
- The synchronous public-URL helpers currently receive unresolved AWS region and endpoint providers. This known v3 bug
  remains explicit strict-mode contract debt; resolving it would be a separate behavior change.
- Windows can run typechecks and non-bundling tests, but the Bun packaging/release lanes require Linux or macOS.

## Target ownership

`apps/cli/shared/aws/s3-sync`

## Provisional interfaces

Prefer small local aliases for callbacks, retry operations, S3 parameters/results, progress emitters, and mutable
records when those aliases make several call sites clearer. Use AWS SDK and Node types where they express the actual
runtime contract. Do not introduce a generic async framework, dependency injection, or a new package.

## Must-preserve behaviors

- Existing exported class methods, accepted option shapes, and returned event emitters.
- Retry count/delay and the meaning of a non-retryable error.
- Event names, event ordering, progress accounting, abort behavior, and error propagation.
- S3 request payloads, pagination, metadata replacement, multipart ETag checks, URL formatting, and filesystem
  mutation order.
- `getS3Params` may asynchronously skip an item by returning no parameters.

## Intentional v4 changes allowed

None. If strict typing reveals a real bug, stop and report it rather than silently changing runtime behavior.

## Owned paths

- `apps/cli/shared/aws/s3-sync/index.ts`
- `apps/cli/shared/aws/s3-sync/streamsink.d.ts`
- A focused test beside it, only if a cheap deterministic test materially protects a contract touched by the change.
- This dossier.

## Shared/frozen paths

All other production files, workspace configuration, dependencies, generated files, and private Console code.

## Required deterministic checks

- Measure strict diagnostics for the owned directory before and after.
- Run the CLI's six-project `typecheck`.
- Run any focused test added by the slice.
- Run repository formatting and lint checks.
- Scan the diff for new `any`, unsafe assertions, non-null assertions, and suppressions. Existing `any` should be
  narrowed where needed for the changed callback contracts, not mechanically spread.

## Artifact/AWS checks

No deployment and no real AWS calls. Bundling/release artifact checks are deferred to the Linux/macOS phase gate
because the current Windows Bun bundler cannot traverse pnpm symlinks.

## Public/private/generated implications

Public CLI only. No private-submodule or generated-artifact change.

## Acceptance

- The owned file has zero, or a small explicitly justified remainder of, strict diagnostics.
- Normal CLI typecheck, format, and lint remain green.
- The diff is predominantly type contracts and contains no broad assertions or runtime rewrite.
- An independent reviewer confirms compatibility and conceptual simplicity.

## Expected commit

One public commit: `cli: type S3 sync callbacks`

## Out of scope

- Converting the engine to promises or another library.
- Moving it into a package.
- Refactoring the AWS SDK manager.
- Changing packaging output contracts.
- Fixing unrelated strict diagnostics.
