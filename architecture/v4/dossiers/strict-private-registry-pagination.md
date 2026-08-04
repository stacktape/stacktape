# Strict typing: private CloudFormation registry pagination

## Goal

Normalize private CloudFormation resource-type and version pages at the AWS boundary.

Preserve page order, concurrent per-type version loading, public manager behavior for valid responses, and the existing
configured error path. Do not change registration, deregistration, stack details, stack events, or other AWS services.

## Owned files

- `apps/cli/shared/aws/sdk-manager/index.ts`
- `apps/cli/src/domain/cloudformation-registry-manager/index.ts`
- the smallest dedicated characterization file for no-AWS registry pagination
- this dossier

## Intended contract

- Missing `TypeSummaries` and `TypeVersionSummaries` arrays mean empty pages.
- A private type entry must have both `TypeName` and `TypeArn`; without them the app cannot key the result or request
  its versions, so a malformed successful response must enter the configured error handler.
- A returned version must have `Arn`; the registry manager later deregisters by it, so missing ARN is malformed success.
- Keep `Description`, `IsDefaultVersion`, and other AWS-optional metadata optional.
- Export the narrow version shape required by the registry manager rather than adding an ambient global.
- Preserve type-page and version-page order, request tokens, and concurrent version pagination per type.

Do not add a generic paginator, casts, non-null assertions, or broader registry redesign.

## Behavior to characterize

- Multiple type pages and multiple version pages are accumulated in service order.
- Request tokens and type ARNs are passed unchanged.
- Missing page arrays are empty and still follow a present token.
- Missing type name, type ARN, or version ARN reaches the configured error handler.
- Independent types can load versions concurrently without sharing pagination state.

Use a serial, fail-closed `CloudFormationClient.prototype.send` seam that rejects unexpected command classes, restores
on failure, and never reaches real AWS.

## Measured expectation

At prerequisite commit `febf7f59`, strict diagnostics are 2,145. The audit measured five direct SDK-manager
diagnostics plus one downstream registry-manager diagnostic. Expected result: 2,139, exactly six fewer diagnostics,
with none introduced.

## Gates

- Focused registry pagination tests in normal and concurrent modes.
- Both existing AWS prototype-stub suites together and full characterization.
- All six TypeScript projects.
- Exact strict before/after comparison.
- Oxfmt, Oxlint, `git diff --check`, and scan for casts/suppressions/unrelated AWS changes.
- Independent reviewer approval covering malformed-success handling, token/order preservation, concurrency, stub
  isolation, public type ownership, and conceptual complexity.
