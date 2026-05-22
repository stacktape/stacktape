# Notifications

Stacktape notification rules alert your team when deployment lifecycle events occur — deploys, deletes, rollbacks, and more. Each rule maps one or more event types to an [alert channel](/observability/alert-channels) and can be scoped to specific projects and stages, so the right people get notified about the right events.


> **Info:** Notifications cover **operational events** (deployments, deletions, cancellations). For **metric-based alerts** on running resources (CPU, error rates, latency), use [alarms](/observability/alarms). Both features deliver through the same [alert channels](/observability/alert-channels).


## When to use notifications

Notification rules are most valuable when your team needs visibility into deployment activity without watching the CLI or Console. Common scenarios:

- **Production deploy alerts** — notify a Slack channel whenever a production deploy succeeds or fails, so the on-call engineer sees it immediately.
- **GitOps visibility** — alert the team when a [GitOps](/ci-cd-and-gitops/gitops-with-console) push-deploy or PR preview deploy fails, so broken builds don't go unnoticed.
- **Multi-team coordination** — scope notifications per project so each team receives only their own deployment events.
- **Audit trail for sensitive operations** — send an email or webhook when specific operations happen, giving you a record of deployment activity across the organization.

## When NOT to use notifications

If you only deploy occasionally and watch the CLI output yourself, you may not need notification rules. They become important once deployments happen automatically (via [GitOps](/ci-cd-and-gitops/gitops-with-console)) or across multiple projects and stages where manual tracking breaks down.

Notifications are also not the right tool for runtime health monitoring. If you need alerts when error rates spike, CPU saturates, or latency crosses a threshold, use [alarms](/observability/alarms) instead — those watch CloudWatch metrics on running resources, not deployment lifecycle events.

## Event types

Notification rules watch for specific event types. Event types cover deployment lifecycle events such as deploys succeeding or failing, deletions, rollbacks, and cancellations. When creating a rule in the Console, select from the available event types shown in the creation dialog. A single rule can watch for multiple event types at once — for example, one rule can alert on both deploy failures and rollback failures, so you get a single channel for all failure conditions.


> **Tip:** The full list of available event types is visible in the Console when creating a notification rule. Event types span deploy, delete, rollback, script, and related operations.


## Managing notification rules

Notification rules are managed in the Stacktape Console on the Notifications page. The page lists existing rules with the following information:

| Column | Description |
|---|---|
| **Event types** | The event types this rule watches for, displayed as sentence-cased labels |
| **For projects** | Which projects this rule applies to, or "All projects" |
| **For stages** | Which stages this rule applies to, or "All stages" |
| **Sent to** | The [alert channel](/observability/alert-channels) that receives notifications |
| **Created** | When the rule was created |

To create a new rule, click **Create new notification** on the Notifications page. You must have at least one [alert channel](/observability/alert-channels) configured before creating a notification rule — channels are the destinations (Slack, Microsoft Teams, Discord, Email, or Webhook) where alerts get delivered.

To delete a rule, use the delete action on the rule's row. Deleting a rule stops future notifications for the matching events but does not affect notification history.


> Screenshot: Stacktape Console Notifications page showing a table of notification rules with event types, project scope, stage scope, destination channel, and creation date columns, plus a Create new notification button Caption: The Notifications page lists all notification rules in your organization


## Scoping notifications

Notification rules can be scoped to specific projects and stages, or left broad to cover the entire organization.

- **Project scoping** — restrict the rule to specific projects. Only events from those projects trigger a notification. The Notifications page shows the selected projects in the "For projects" column, or "All projects" when the rule applies organization-wide.
- **Stage scoping** — restrict the rule to specific stages (e.g., only `production`). This prevents noise from dev and staging deploys while keeping production alerts active. The "For stages" column shows the selected stages or "All stages".

Project and stage scoping can be combined. A rule scoped to project `api` and stage `production` only fires when that exact project-stage combination emits a matching event.


> **Tip:** Create separate rules for different severity levels. For example, route failure events to a high-urgency Slack channel and success events to a low-noise logging webhook. This keeps critical alerts visible without drowning in routine notifications.


## Notification history

Notification history shows a log of all notification alerts that were sent, including their delivery status. Check the history if you are not sure whether a notification was delivered. This is useful for troubleshooting — if a team member didn't receive an expected alert, the history confirms whether Stacktape attempted delivery and what the outcome was.

If a notification appears to have failed, verify the [alert channel](/observability/alert-channels) configuration. Common causes include expired Slack tokens, changed webhook URLs, or email delivery issues. Fix the channel configuration and future notifications will use the updated settings.

## Notifications vs. alarms vs. budgets

Stacktape has three alert systems that serve different purposes. All three deliver through the same [alert channels](/observability/alert-channels), and all three appear in the unified [alert history](/observability/alert-history).

| Feature | Watches for | Defined in |
|---|---|---|
| **Notifications** | Deployment lifecycle events (deploys, deletes, rollbacks, cancellations) | Console — Notifications page |
| **[Alarms](/observability/alarms)** | CloudWatch metric thresholds (error rates, CPU, latency, queue depth) | Console — applied on next deploy |
| **[Budgets](/managing-costs/budgets)** | AWS spending thresholds | Console — Budgets page |

Use notifications for operational awareness ("did the deploy finish?"), alarms for runtime health ("is the API throwing errors?"), and budgets for cost control ("are we overspending?"). Most production setups use all three.

Notifications and budgets take effect without a deployment. [Alarm rules](/observability/alarms) are different — they create or update CloudWatch alarms on the next deployment of each matching project and stage.

## FAQ

### Can I create notification rules from the CLI or config file?

Notification rules are managed exclusively in the Stacktape Console. There is no CLI command or `stacktape.ts` property for notification rules. The CLI fires the events that notifications watch for (deploys, deletes, rollbacks), but the rules themselves are created and managed in the Console.

### Can one event trigger multiple notification rules?

Yes. If an event matches multiple rules — for example, one rule watching all deploy events for all projects and another watching deploy failures for `production` only — the event triggers all matching rules. Each rule delivers independently to its configured channel. This lets you layer broad monitoring with targeted alerting without conflict.

### How do I know if a notification was delivered?

Check the notification history in the Console. It shows a log of all notification alerts that were sent, including their delivery status. If a notification wasn't delivered, verify the [alert channel](/observability/alert-channels) configuration — expired tokens or changed webhook URLs are common causes.

### What is the difference between notifications and alarms?

Notifications watch for deployment lifecycle events — things that happen when you run `stacktape deploy`, `stacktape delete`, or when [GitOps](/ci-cd-and-gitops/gitops-with-console) triggers a deploy. [Alarms](/observability/alarms) watch CloudWatch metrics on running resources — CPU usage, error rates, latency, queue depth. Use notifications to know when a deploy happened; use alarms to know when something is wrong at runtime.

### Do I need a separate alert channel for notifications vs. alarms?

No. [Alert channels](/observability/alert-channels) are shared across notifications, alarms, and budgets. You can send deploy notifications and alarm alerts to the same Slack channel, or route them to different channels for different severity levels. Create channels once, then reference them from any alert system.

### How should I set up notifications for a multi-team organization?

Use project scoping. Create separate notification rules per team, each scoped to the projects that team owns. This way, the frontend team gets notified about frontend deploys and the backend team about backend deploys, without cross-team noise. Each team can also choose their preferred channel — Slack for one team, email for another.

### Can I get notified only for production deploys?

Yes. Use stage scoping when creating a notification rule. Scope the rule to the `production` stage (or whatever you name your production stage), and it will ignore events from dev, staging, and other stages. Combine with project scoping if you want production alerts only for specific projects.

### Where can I see all alerts across notifications, alarms, and budgets?

The [alert history](/observability/alert-history) page in the Console shows a unified log of all alerts across notifications, alarms, and budgets. This gives you a single view of every alert your organization has received, regardless of which system generated it.

### How much do notifications cost?

Stacktape notifications are a platform feature — there is no per-notification AWS charge. The cost is part of your Stacktape subscription. The [alert channels](/observability/alert-channels) themselves may have costs on the receiving end (e.g., Slack, email infrastructure), but Stacktape does not charge per notification event. For cost monitoring, see [managing costs](/managing-costs/overview).
