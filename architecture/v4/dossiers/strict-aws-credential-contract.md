# Strict typing: AWS manager credential contract

## Goal

State the existing `AwsSdkManager.init()` lifecycle honestly and normalize the successful AWS STS `AssumeRole`
response before returning credentials.

Preserve singleton identity, initialization and re-initialization semantics, public manager API, credential precedence,
plugins, retry timing, and ordinary AWS error behavior. This is not an AWS-manager redesign, package extraction, or
dependency-injection slice.

## Owned files

- `apps/cli/shared/aws/sdk-manager/index.ts`
- `apps/cli/tests/characterization/aws-sdk-manager.spec.ts`
- this dossier
- `architecture/v4/DEFERRED-ISSUES.md` only for the already-audited behavior debt

Do not normalize CloudFormation or other AWS service responses in this slice.

## Intended contract

All real manager producers construct the manager and synchronously call `init()` before using AWS operations. Retain
that lifecycle and use localized definite-assignment markers for `credentials`, `region`, and `#getErrorHandler`.
Making these public fields optional is not honest to their initialized API and was compiler-probed to increase the
project from 2,183 to 2,432 diagnostics.

Do not add a type-state framework, factory, constructor requirement, pre-operation guard cascade, or optional public
fields. Preserve the runtime class-field form and the existing `isInitialized` behavior.

At the `AssumeRole` success boundary, require:

- access key ID
- secret access key
- expiration
- session token

Successful AssumeRole credentials semantically contain all four and current consumers depend on expiration and the
session token. Validate them inside `executeAssumeRole`, before its existing retry and error-handler layers. Do not
hide malformed output with non-null assertions.

The only intended behavior change is for a malformed successful response: missing `Credentials` currently causes an
incidental `TypeError`, while a partially populated response can escape as invalid credentials. Both must instead
enter the existing retry path and, when exhausted, the configured error handler.

## Behavior to characterize

- A new manager is not initialized.
- `init()` keeps the exact credential object, region, explicit plugins, handler, and printer.
- Later mutation of the supplied credential object remains visible through the manager.
- Re-initialization keeps manager identity, replaces the credential reference, and resets omitted optional arguments
  to their existing defaults.
- A valid STS result maps all four fields exactly and preserves role ARN, session name, and duration input.
- Missing and partially populated STS credentials reach the configured error handler.
- An incomplete first response participates in retry and can be followed by a valid response.
- A real SDK rejection reaches the configured handler only after retries are exhausted.

Use serial tests and a narrowly restored spy on `STSClient.prototype.send`; do not use process-wide module mocking or
real AWS.

## Measured expectation

At prerequisite commit `e34f82ca`:

- whole CLI strict diagnostics: 2,183
- `shared/aws/sdk-manager/index.ts`: 100
- owned diagnostics: three lifecycle `TS2564`, four optional-STS `TS18048`, and two incomplete-return `TS2322`

An independent in-memory compiler probe produced 2,174 project diagnostics and 91 manager diagnostics, exactly nine
fewer, with no new diagnostic.

## Known behavior debt outside this slice

- Permanent credentials already sourced from the credentials file, or from environment variables without expiration,
  can leave the reload-local `creds` variable unassigned on a second load.
- Automatic role refresh requests the manager's default 12-hour session even where the created role allows only ten
  hours. The same duration expression also raises every explicit duration at or below one hour to exactly one hour.
- Pre-initialization misuse is not uniformly guarded. All traced real producers initialize correctly; adding a
  fail-fast runtime state changes public/error behavior and needs a separate decision.

## Gates

- Focused AWS-manager characterization without network access.
- Full characterization tests.
- All six TypeScript projects.
- Strict before/after comparison normalized by file and diagnostic code.
- Oxfmt, Oxlint, `git diff --check`, and scan for casts, suppressions, and unrelated AWS changes.
- Independent reviewer approval covering object identity, re-init/default reset, STS validation placement,
  retry/error behavior, spy cleanup, runtime API compatibility, and conceptual complexity.
