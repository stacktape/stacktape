# Notifications

Stacktape notification rules alert your team when specific events happen — like a deployment succeeding, failing, or being canceled. Each rule maps one or more event types to an [alert channel](/observability/alert-channels) and can be scoped to specific projects and stages, so the right people get notified about the right events.


> **Info:** Notifications cover **selected operational events** shown in the Console — such as deployments succeeding, failing, or being canceled. For **metric-based alerts** on running resources (CPU, error rates, latency), use [alarms](/observability/alarms). Both features deliver through the same [alert channels](/observability/alert-channels).


## When to use notifications

Notification rules are most valuable when your team needs visibility into deployment activity without watching the CLI or Console. Common scenarios:

- **Production deploy alerts** — notify a Slack channel whenever a production deploy succeeds or fails, so the on-call engineer sees it immediately.
- **Automated deploy visibility** — when deployments happen automatically (e.g., via [GitOps](/ci-cd-and-gitops/gitops-with-console)), notification rules ensure failures are surfaced immediately.
- **Multi-team coordination** — scope notifications per project so each team receives only their own deployment events.
- **Delivery record for deployment events** — send an email or webhook for selected deployment events, then use notification history to confirm whether alerts were sent.

## When NOT to use notifications

If you only deploy occasionally and watch the CLI output yourself, you may not need notification rules. They become important once deployments happen automatically (via [GitOps](/ci-cd-and-gitops/gitops-with-console)) or across multiple projects and stages where manual tracking breaks down.

Notifications are also not the right tool for runtime health monitoring. If you need alerts when error rates spike, CPU saturates, or latency crosses a threshold, use [alarms](/observability/alarms) instead — those watch CloudWatch metrics on running resources, not deployment lifecycle events.

## Event types

Each notification rule specifies which events to watch — for example, a deployment succeeding, failing, or being canceled. A single rule can store multiple event types at once, so you can consolidate related alerts into one rule and one channel. The Notifications page displays each rule's event types as sentence-cased labels.

## Managing notification rules

Notification rules are managed in the Stacktape Console on the Notifications page. The page lists existing rules with the following information:

| Column | Description |
|---|---|
| **Event types** | The event types this rule watches for, displayed as sentence-cased labels |
| **For projects** | Which projects this rule applies to, or "All projects" |
| **For stages** | Which stages this rule applies to, or "All stages" |
| **Sent to** | The [alert channel](/observability/alert-channels) that receives notifications |
| **Created** | The rule's `createdAt` timestamp |

To create a new rule, click **Create new notification** on the Notifications page. Each notification rule delivers to an [alert channel](/observability/alert-channels).

To delete a rule, use the delete action on the rule's row.


> Screenshot: Stacktape Console Notifications page showing a table of notification rules with event types, project scope, stage scope, destination channel, and creation date columns, plus a Create new notification button Caption: The Notifications page lists notification rules for the selected organization


## Scoping notifications

Notification rules can be scoped to specific projects and stages. When a scope is left empty, the Notifications page displays it as "All projects" or "All stages".

- **Project scoping** — restrict the rule to specific projects. Only events from those projects trigger a notification. The Notifications page shows the selected projects in the "For projects" column, or "All projects" when the rule applies organization-wide.
- **Stage scoping** — restrict the rule to specific stages (e.g., only `production`). This prevents noise from dev and staging deploys while keeping production alerts active. The "For stages" column shows the selected stages or "All stages".

Project and stage scoping can be combined.


> **Tip:** Create separate rules for different severity levels. For example, route failure events to a high-urgency Slack channel and success events to a low-noise logging webhook. This keeps critical alerts visible without drowning in routine notifications.


## Notification history

Notification history is a log of all notification alerts that were sent, including their delivery status. Access it from the Console to confirm whether a specific alert was delivered. If a notification wasn't delivered, review the destination [alert channel](/observability/alert-channels) configuration — an expired webhook URL or misconfigured Slack integration is the most common cause.

## Notifications vs. alarms vs. budgets

Notifications, alarms, and budgets serve different purposes but all deliver through [alert channels](/observability/alert-channels). [Alert history](/observability/alert-history) is a unified log across all three.

| Feature | Watches for | Defined in |
|---|---|---|
| **Notifications** | Specific events (e.g. deployment succeeding, failing, or being canceled) | Console — Notifications page |
| **[Alarms](/observability/alarms)** | CloudWatch metric thresholds (error rates, CPU, latency, queue depth) | Console — applied on next deploy |
| **[Budgets](/managing-costs/budgets)** | AWS spending thresholds | Console — Budgets page |

Use notifications for operational awareness ("did the deploy finish?"), alarms for runtime health ("is the API throwing errors?"), and budgets for cost control ("are we overspending?"). Most production setups use all three.

Notification rules are created and managed in the Console. Organization-wide budget alerts are created in the selected AWS account when saved, while stack-scoped budget alerts depend on deployment metadata — deploy matching stacks after creating or changing them. [Alarm rules](/observability/alarms) are different — they create or update CloudWatch alarms and EventBridge notification routing on the next deployment of each matching project and stage.

## FAQ

### Can I route different events to different channels?

Yes — create multiple notification rules, each with its own event types, scope, and [alert channel](/observability/alert-channels). For example, send all deployment events to a low-noise logging webhook with one rule, and route only `production` deployment failures to a high-urgency Slack channel with another. Use separate rules whenever different teams or severity levels need different destinations.

### Why didn't my notification get delivered?

Check the notification history in the Console, which logs every alert that was sent along with its delivery status. If a notification wasn't delivered, the cause is almost always the destination [alert channel](/observability/alert-channels) — an expired webhook URL or a misconfigured Slack integration is the most common culprit.

### What is the difference between notifications and alarms?

Notifications watch for selected operational events such as a deployment succeeding, failing, or being canceled. [Alarms](/observability/alarms) watch CloudWatch metrics on running resources — CPU usage, error rates, latency, queue depth. Use notifications for awareness of deployment outcomes; use alarms to know when something is wrong at runtime.

### Do I need a separate alert channel for notifications vs. alarms?

No. You can use the same [alert channel](/observability/alert-channels) in notification rules, alarm rules, and budget alerts. Send deploy notifications and alarm alerts to the same Slack channel, or route them to different channels for different severity levels. Create channels once, then reference them from any rule type.

### Can I get notified only for production deploys?

Yes. Use stage scoping when creating a notification rule to select the stage names it applies to, such as `production`. This keeps dev and staging deploys from generating noise while production alerts stay active. Combine it with project scoping when only some project-stage pairs should send notifications — useful for giving each team alerts on only the projects it owns.
