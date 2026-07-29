# Strict typing: observable CloudFormation stack events

## Goal

Normalize `DescribeStackEvents` pages into the resource-event shape the deployment monitor can actually observe.

Preserve CloudFormation's newest-first page order; the monitor remains responsible for its single reversal before
processing. This slice may fix the existing cutoff bug where the terminal page is appended without applying `since`,
but must not redesign polling, progress accounting, stack-status handling, or the AWS manager.

## Owned files

- `apps/cli/shared/aws/sdk-manager/index.ts`
- `apps/cli/src/domain/cloudformation-stack-manager/index.ts`
- `apps/cli/shared/aws/ecs-deployment-monitoring.ts`, only to give
  `isEcsServiceCreateOrUpdateCloudformationEvent` a type-predicate return for the `PhysicalResourceId` check it
  already performs. Its runtime expression must not change, and `PhysicalResourceId` must not become a required
  member of `MonitoredStackEvent`: it is genuinely absent on events for resources that have no physical identity yet.
- the smallest existing/new characterization file needed for no-AWS event pagination and monitor typing
- this dossier
- `architecture/v4/DEFERRED-ISSUES.md` only for newly discovered debt

Do not change `getStackDetails` nullability or private registry pagination in this slice.

## Intended contract

Export a narrow `MonitoredStackEvent` from the AWS SDK manager. It is a `StackEvent` whose deployment-monitor fields
are present:

- finite `Timestamp`
- string `EventId`
- string `LogicalResourceId`
- string `ResourceStatus`

CloudFormation hook and other non-resource events may legitimately omit resource fields. Ignore them rather than
crashing deployment monitoring. Keep optional fields optional unless a downstream operation has an independently
checked guard.

Normalize every page:

- absent `StackEvents` means an empty page;
- filter every fetched page by `since`, including the final page;
- preserve page and event order;
- continue when `NextToken` exists, including after an empty/omitted event page;
- stop after a page whose oldest usable raw timestamp is before `since`;
- when a page has no usable boundary timestamp but has a token, continue.

Use the configured AWS error handler for request failures exactly as before. Do not add casts, non-null assertions, or
generic pagination machinery.

In the poll batch, replace the boolean short-circuit `condition && getStackDetails()` with the equivalent ternary that
returns `null` when no details request is scheduled. This expresses the existing fallback state without allowing
`false` into the Promise result.

## Behavior to characterize

- Multiple pages preserve newest-first order, filter all pages at the cutoff, and stop without an extra request.
- Empty and omitted event pages with a next token continue pagination.
- Incomplete/hook events are excluded from monitorable output.
- Pagination request tokens and the initial stack name are unchanged.
- The monitor's one reversal still produces oldest-first processing.
- Existing monitoring/progress tests remain green.

Use a serial, fail-closed `CloudFormationClient.prototype.send` seam. It must restore on failure, refuse un-stubbed
calls, and never reach real AWS.

## Measured expectation

At prerequisite commit `eef77024`, strict diagnostics are 2,174.

An independent compiler probe measured:

- six direct event-page diagnostics removed in `shared/aws/sdk-manager/index.ts`;
- 21 downstream event-field diagnostics removed in `cloudformation-stack-manager/index.ts`;
- two `false | StackDetails` polling-result diagnostics removed by the explicit `null` fallback.

Expected total: 2,145, exactly 29 fewer diagnostics, with no new diagnostic.

## Compatibility note

The existing implementation filters only the first page by `since` and appends later pages wholesale. A stale event
from the terminal page can therefore seed monitoring state even though it is older than the requested cutoff.
Filtering every page is an intentional bug fix. Everything at or after the cutoff retains its original order and
identity.

## Gates

- Focused no-AWS stack-event pagination characterization in normal and concurrent modes.
- Relevant stack-monitoring tests and full characterization.
- All six TypeScript projects.
- Exact strict before/after comparison normalized by file and diagnostic code.
- Oxfmt, Oxlint, `git diff --check`, and scan for casts, suppressions, and unrelated stack logic.
- Independent reviewer approval covering page cutoff semantics, empty-page continuation, event-field validation,
  Promise fallback equivalence, global stub isolation, runtime ordering, and conceptual complexity.
