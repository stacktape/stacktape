# Issues

Stacktape Issues is a built-in error inbox available in the [Stacktape Console](/stacktape-console/console-overview) and the [CLI](/cli/issues-list). It displays recorded runtime errors with each issue's status, error message, error type, occurrence count, function name, and originating project and stage. Manage issues without integrating a third-party error tracking service.

## When to use

Stacktape Issues gives you structured error tracking with no additional SDK or external service. Enable it when:

- You want to see which runtime errors are recurring across projects and stages without scanning raw log lines.
- You need a lightweight triage workflow — open, resolve, or ignore issues — without leaving Stacktape.
- You want occurrence counts and error classification grouped per issue, not scattered across individual log entries.

Issues works well as a first line of error visibility. For most teams shipping APIs and background workers on Stacktape, it replaces the need for a separate error tracking tool during early and mid-stage development.

## When NOT to use

Stacktape Issues displays recorded runtime errors in the Console and CLI without requiring you to add an SDK to your application. It does not instrument your application process directly. If you need breadcrumbs, custom tags, user session tracking, release tracking, or performance profiling, use a dedicated APM tool like Sentry or Datadog alongside or instead of Issues. Issues is best for triaging recurring runtime failures — not for full-stack observability.

## Enabling issue monitoring

Issue monitoring is off by default for new projects. Configure it from the Issues page in the Stacktape Console by clicking **Configure Issues**. Displaying the configure button requires the `projects:update-settings` permission in your organization.

Clicking **Configure Issues** opens a setup modal pre-populated with the organization's current settings: organization-wide enablement, the list of enabled stages, the event sampling rate (defaulting to 100 when no organization-level rate is set), and per-project issue-enabled state for every project in the organization.

After enabling monitoring, matching stages need to be deployed with Stacktape CLI 3.8.0 or newer before AWS log subscriptions are added.


> **Warning:** Stages deployed with CLI versions older than 3.8.0 do not report issues. Redeploy after enabling monitoring so the AWS log subscriptions are added.


### Event sampling rate

The setup modal includes an event sampling rate setting (`issuesEventSamplingRate`), which defaults to `100` when no organization-level value is set. Consider adjusting the rate for high-traffic stages where you want to tune issue event volume while maintaining trend visibility.


> **Info:** Issues remain visible in the Console even after monitoring is turned off for a project. Existing issues are not deleted when monitoring is disabled.


## Error types

The Console and CLI display error type labels for recorded issues. The Console maps known error types to the friendly labels listed below, while the CLI includes the raw `errorType` value. Known labels displayed in the Console:

| Error type label |
|---|
| **Uncaught** |
| **Caught** |
| **Unhandled Rejection** |
| **Exit Error** |
| **Handler Not Found** |
| **Panic** |

If an error type does not match one of these known labels, the Console and CLI display the raw `errorType` value as-is. Use the label to recognize similar errors at a glance. The Console supports filtering by status, search text, project, and stage; the CLI [`issues:list`](/cli/issues-list) command supports filtering by project name, stage, issue status, and result limit.

## Issue statuses

Every issue has one of three statuses. The Console displays summary cards at the top of the Issues page with the count for each:

| Status | Color in Console | Meaning |
|---|---|---|
| **Open** | Red | Active error that needs attention |
| **Resolved** | Green | Marked as fixed |
| **Ignored** | Gray | Intentionally suppressed |

The CLI has separate commands for resolving, ignoring, and reopening issues: [`issues:resolve`](/cli/issues-resolve), [`issues:ignore`](/cli/issues-ignore), and [`issues:reopen`](/cli/issues-reopen). Clicking a row in the Console navigates to the selected issue.

## Viewing issues in the Console

The Issues page in the Stacktape Console provides a filterable, paginated view of all recorded issues across your organization. Three summary cards at the top show the count of Open, Resolved, and Ignored issues at a glance.

### Issue table

Below the summary cards, a table lists issues with these columns:

| Column | Shows |
|---|---|
| **Last seen** | Timestamp of the most recent occurrence |
| **Error** | The error message (truncated in the table row) |
| **Type** | The error type label |
| **Resource** | The function name that produced the error, when available |
| **Project / Stage** | The originating project and stage |
| **Count** | Total occurrences of this error |
| **Status** | Current status with color coding |

Clicking a row navigates to the selected issue.

### Filtering

The Console provides four combinable filters that let you narrow the issue list:

- **Status** — All, Open, Resolved, or Ignored. Defaults to Open so you see active errors first.
- **Search** — Substring match against error messages. Useful for finding a specific exception type or message pattern.
- **Project** — Narrow results to a single project.
- **Stage** — Narrow results to a single stage. The dropdown includes stages from your deployed and undeployed projects plus stages found in existing issues.

The table shows 20 items per page by default and uses Last seen as the default sort column. Changing any filter resets to the first page.


> Screenshot: Stacktape Console Issues page showing three summary cards for Open, Resolved, and Ignored counts, filter controls for status, search, project, and stage, and a paginated table listing runtime errors with columns for last seen, error, type, function, project/stage, count, and status Caption: Issues page with summary cards, filters, and the error table


## Managing issues from the CLI

The Stacktape CLI provides commands for working with issues. The [`issues:list`](/cli/issues-list) command initializes the Stacktape API client with your configured [API key](/stacktape-console/api-keys). In agent mode, it prints raw JSON for programmatic use in CI/CD pipelines and AI coding assistants.

### Listing issues

[`stacktape issues:list`](/cli/issues-list) displays issues as a formatted table. The default limit is 25.

```bash
stacktape issues:list
```

Filter by project, stage, or status:

```bash
stacktape issues:list --projectName my-api --stage production --issueStatus OPEN
```

Set a custom limit:

```bash
stacktape issues:list --limit 50
```

In agent mode (used by AI coding assistants), the command outputs the raw `listIssues` response as JSON. The table view displays ID, status, error message, error type, function name, project, stage, occurrence count, and last seen.

### Changing issue status

The CLI has separate commands for changing issue status:

- [`stacktape issues:resolve`](/cli/issues-resolve)
- [`stacktape issues:ignore`](/cli/issues-ignore)
- [`stacktape issues:reopen`](/cli/issues-reopen)

## Issues vs logs vs alarms

Issues, [logs](/observability/logs), and [alarms](/observability/alarms) serve different observability purposes. See the dedicated pages for full details on each; the summary below highlights how they complement each other:

| | Issues | [Logs](/observability/logs) | [Alarms](/observability/alarms) |
|---|---|---|---|
| **Purpose** | Track and triage runtime errors | View raw output from functions and workloads | Alert on metric thresholds |
| **Grouping** | Errors grouped with occurrence counts | Individual log lines | One alarm per rule |
| **Action model** | Resolve, ignore, or reopen | Search and filter via [`debug:logs`](/cli/debug-logs) | Triggers [notifications](/observability/notifications) |
| **Best for** | Error triage and regression tracking | Debugging specific requests | Proactive threshold monitoring |

Issues complement [alarms](/observability/alarms): alarms tell you *something is wrong* (high error rate, elevated latency), while issues tell you *what specific errors are happening*. Configure [alert channels](/observability/alert-channels) for alarm notifications, then use the Issues page to diagnose which errors are driving the spike.

## Limitations

- **No in-process instrumentation.** Stacktape Issues does not use an in-process SDK. Errors that are silently swallowed, produce no output, or result in silent data corruption are not captured.
- **False positives possible.** Log lines that match error patterns but aren't actual application errors (for example, error messages logged at info level for diagnostic purposes) may be recorded as issues. Review unexpected entries before acting on them.

## FAQ

### How do I enable issue monitoring for my projects?

Open the Issues page in the [Stacktape Console](/stacktape-console/console-overview) and click **Configure Issues**. You can enable monitoring organization-wide or for individual projects, and optionally restrict it to specific stage names. After enabling, matching stages need to be deployed with Stacktape CLI 3.8.0 or newer before AWS log subscriptions are added.

### What types of errors does Stacktape detect?

The Console maps known error types to friendly labels — including Uncaught, Caught, Unhandled Rejection, Exit Error, Handler Not Found, and Panic. The CLI output includes the raw `errorType` value. If an error type does not match a known label, the raw value is displayed. Use these labels to group similar errors during triage.

### Does issue monitoring add cost?

The setup modal receives an `issuesEventSamplingRate` setting that you can adjust for high-traffic stages. See [Managing Costs](/managing-costs/overview) for broader cost guidance across Stacktape features.

### Can I manage issues from CI/CD pipelines?

Yes. The [`issues:list`](/cli/issues-list) command supports filtering by project, stage, and status, and emits JSON in agent mode for programmatic consumption. See the CLI reference pages for [`issues:resolve`](/cli/issues-resolve), [`issues:ignore`](/cli/issues-ignore), and [`issues:reopen`](/cli/issues-reopen) for the supported status-change commands.

### What permissions do I need to configure issue monitoring?

Configuring monitoring settings — enabling per project, setting the sampling rate, choosing stages — requires the `projects:update-settings` permission. See [team and access control](/stacktape-console/team-and-access-control) for managing organization permissions.

### How is Stacktape Issues different from Sentry or Bugsnag?

Stacktape Issues is built in and does not require adding a Sentry or Bugsnag SDK to your application. Because it does not use in-process instrumentation, it provides less context than a dedicated APM tool — no breadcrumbs, no custom tags, no user session tracking, no performance traces. Use Issues for straightforward error triage; consider a dedicated APM tool if you need deep debugging context, release tracking, or performance monitoring.

### Do I need to redeploy after enabling issue monitoring?

Yes. Enabling monitoring in the Console configures the platform to process incoming errors, but AWS log subscriptions are added to your resources during deployment. Matching stages need to be deployed with Stacktape CLI 3.8.0 or newer before those subscriptions are in place.

### What happens to existing issues when I disable monitoring?

Existing issues remain visible in the Console after monitoring is turned off. Previously recorded issues are not deleted when monitoring is disabled. You can still filter and search them.

### Can I filter issues to only production stages?

Yes, at two levels. The setup modal accepts `issuesEnabledStages`, letting you control which stages are monitored. The Console page has a Stage filter for narrowing displayed issues by stage after capture.

### When should I use issues vs alarms for error monitoring?

Use both — they answer different questions. [Alarms](/observability/alarms) fire when a metric crosses a threshold (e.g., error rate above 5%), telling you *something is wrong*. Issues tell you *what specific errors are happening* and how often. Set up alarms with [alert channels](/observability/alert-channels) for real-time notification, then use the Issues page to identify which errors caused the spike and decide how to fix them.
