# Alert History

The Stacktape Console's alert history page displays alert events for the selected organization — across [alarms](/observability/alarms), [notifications](/observability/notifications), [budget alerts](/managing-costs/budgets), and [issues](/observability/issues). Instead of checking separate history views for each system, use alert history to see what fired, when, and whether the alert reached its intended channel.

## What alert history tracks

Alert history displays **alert event** rows returned for the selected organization. These events can come from notifications, alarms, budgets, and issues. The table displays each event as a row with the following columns:

| Column | Description |
|---|---|
| **Time** | When the event occurred. Passed as the table's default sort column. |
| **Source** | Which system generated the event — Notification, Alarm, Budget, or Issue. Displayed as a color-coded badge. |
| **Event** | The specific trigger type (e.g. "Deploy failed", "Alarm triggered"). See the full list below. |
| **Severity** | The severity value for the event. WARNING, ERROR, and CRITICAL use distinct colors. INFO and unrecognized severity values render with the primary text color. |
| **Project** | The project associated with the event, when applicable. Shows "-" if not project-specific. |
| **Stage** | The stage associated with the event, when applicable. Shows "-" if not stage-specific. |
| **Title** | A human-readable summary of what happened. |
| **Delivery** | Per-channel delivery status for each [alert channel](/observability/alert-channels) the event was routed to. |

Alert history queries events at the organization level, so you see alerts from all projects and stages in one place.

## Event types

Alert events span four source categories. The alert history page displays these known event types.

| Source | Event types |
|---|---|
| **Notification** | Deploy started, Deploy succeeded, Deploy failed, Delete started, Delete succeeded, Delete failed, Deploy rolled back, Rollback succeeded, Rollback failed, Preview deploy succeeded, Preview deploy failed, Git push deploy succeeded, Git push deploy failed, Script run succeeded, Script run failed, Secret created, Secret updated, Secret deleted |
| **Alarm** | Alarm triggered, Alarm resolved |
| **Budget** | Budget threshold exceeded, Budget forecasted overspend |
| **Issue** | Issue detected, Issue resolved |

Notification events cover the broadest range — deployments, rollbacks, previews, Git push deploys, script runs, and secret lifecycle changes. Alarm, budget, and issue events are narrower, each tracking the trigger-and-resolve lifecycle for their respective system.

## Severity levels

The Console displays each alert event's severity using color-coded styling. The Console defines distinct colors for WARNING, ERROR, and CRITICAL:

| Severity | Color |
|---|---|
| **INFO** | Default text |
| **WARNING** | Orange |
| **ERROR** | Red |
| **CRITICAL** | Dark red |

The alert history page renders the severity value returned with each event. WARNING, ERROR, and CRITICAL are styled with the distinct colors shown above. INFO and any unrecognized severity values render with the primary text color.

## Filtering events

The alert history page includes a **source filter** dropdown at the top of the table. You can filter the view to show:

- **All sources** — the default view showing every event across all four categories.
- **Issues** — only issue detection and resolution events.
- **Alarms** — only alarm triggered and resolved events.
- **Notifications** — deployment, delete, rollback, preview deploy, Git push deploy, script, and secret events.
- **Budgets** — only budget threshold and forecasted overspend events.

Changing the filter resets the table back to the first page. Use the source filter to narrow down a noisy timeline — for example, filtering to "Alarms" when investigating a spike in alarm activity, or to "Notifications" when checking whether the team was notified about a recent deploy failure.

## Delivery tracking

The Delivery column renders the delivery records returned with each event. It serves as the audit trail that answers "did the team actually get notified?" Each delivery shows a status and channel summary.

Each delivery in the list shows two things:

- **Status** — displayed as a color-coded label: `SENT` (green), `FAILED` (red), or `PENDING` (orange).
- **Channel** — the [alert channel](/observability/alert-channels) the delivery targeted, rendered with the channel name and type.

When an event has multiple delivery records, the Delivery column lists each one separately with its own status and channel summary.

When an event has no delivery records, the table displays **"No rules matched"**. The event is still visible in the timeline.


> **Tip:** If you see "No rules matched" for events you care about, check that routing rules in [notifications](/observability/notifications), [alarms](/observability/alarms), or [budgets](/managing-costs/budgets) cover the event type and route to an [alert channel](/observability/alert-channels).


## Pagination

Alert history is paginated and loads on demand. You can control the number of events displayed per page and navigate through pages using the table's built-in pagination controls. The total count of matching events is passed to the table's pagination controls.

## When the table is empty

If no alert events have been recorded yet, the table shows the message: *"No alert events yet. Events will appear here when alarms trigger, issues are detected, or notifications are sent."*

Alert history displays alert events returned for the selected organization. Events appear after alarms trigger, issues are detected, or notifications are sent. Configure [alarm rules](/observability/alarms) for metric-based monitoring, [notification rules](/observability/notifications) for deployment and lifecycle events, [budget alerts](/managing-costs/budgets) for cost thresholds, and enable [issues](/observability/issues) for runtime error detection. Alert history can display Notification, Alarm, Budget, and Issue source kinds. Delivery information appears when delivery records exist for an event.

## Alert history vs. individual history views

The Console includes separate notification history, alarm history, and budget history pages — each a narrower log focused on a single source. Alert history is the unified table that combines events from all sources — including issues — on a single page.

Use **alert history** when you need a cross-cutting view — for example, correlating a failed deploy notification with the alarm that fired shortly after, or reviewing all alert activity over the last hour regardless of source. Use the source-specific history pages when investigating a single alert category in isolation.


> **Info:** Alert history is available in the Stacktape Console. For CLI-based alarm inspection, use [`stacktape alarms`](/cli/alarms) to check current CloudWatch alarm states.


## FAQ

### When should I use alert history vs. the source-specific history pages?

Alert history is a unified view combining events from all four sources — alarms, notifications, budgets, and issues — into a single paginated table. The separate notification, alarm, and budget history pages each show only one source. Use alert history for a cross-cutting picture (for example, correlating a failed deploy notification with an alarm that fired shortly after); use a source-specific page when troubleshooting a single alert category in isolation.

### Can I filter alert history by project or stage?

The source filter dropdown filters by event source (Alarm, Notification, Budget, Issue), not by project or stage. The table does display Project and Stage columns for every event, so you can identify which project and stage each event belongs to.

### What does "No rules matched" mean in the Delivery column?

The Console displays "No rules matched" when an event's delivery records are empty. The event is still visible in the timeline. If you expected a delivery, check your routing rules in [notifications](/observability/notifications), [alarms](/observability/alarms), or [budgets](/managing-costs/budgets) and verify they cover the event type and route to an [alert channel](/observability/alert-channels).

### What delivery statuses can an alert have?

The Console styles three delivery statuses with distinct colors: **SENT** (green), **FAILED** (red), and **PENDING** (orange). When an event has multiple delivery records — for example, because it matched rules pointing to different channels — each delivery is listed separately with its own independent status.

### Can I view alert history from the CLI?

No — alert history is a Console-only page. For CLI-based alarm inspection, use [`stacktape alarms`](/cli/alarms) to check current CloudWatch alarm states.
