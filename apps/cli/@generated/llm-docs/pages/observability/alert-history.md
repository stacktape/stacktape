# Sent Alerts

**Sent alerts** (under Alerting in the Stacktape Console) lists every alert Stacktape sent to your
[alert channels](/observability/alert-channels): incidents, deploys and changes covered by a channel's
[notification rules](/observability/notifications), [alarms](/observability/alarms#notification-targets) from your
stack configuration, and [budget alerts](/managing-costs/budgets). Use it to check what
was sent and whether it arrived.

## Columns

| Column | Description |
|---|---|
| **Time** | When the alert was sent. Hover it for the exact time. |
| **Alert** | What happened, for example an opened incident or a failed deploy. |
| **Project / stage** | Where it happened, or "Organization" for organization-wide alerts such as budgets and secret changes. |
| **Sent to** | The channels that received it. A channel that did not accept it is shown in red. |
| **Delivery** | **Sent** when every channel accepted it, **Failed** when none did, **1 of 3 failed** when some did not, and **Sending** while a delivery is in progress. |

An event that no channel receives is not sent, so it does not appear here.

## Delivery details

Click a row to see, for each channel, whether the provider accepted the alert ("Accepted by Slack", "Accepted by the
email service", "Accepted by the webhook endpoint"), every attempt with its time, and the error when it failed. A
failed channel links to its page, where **Send test** checks the channel after you fix it. An incident alert links to
the incident.

"Accepted" means the provider took the message. Stacktape does not see whether a person read it.

## Filters

Filter by **source** (incidents, deploys and changes, budgets) and by **channel**. A channel's page links here already
filtered to that channel. The old `/notifications/history` address opens this page filtered to deploys and changes.

## Other history pages

An alarm's own history shows its CloudWatch state changes, and **Budgets → History** shows budget alerts only. Sent
alerts is the one place that shows everything sent to your channels.

## FAQ

### An alert shows "1 of 3 failed". Did my team get it?

The channels that accepted it got it. Open the row to see which channel failed and why, then open that channel and send
a test once its settings are fixed.

### Why is an event I expected missing?

Only events a channel receives are sent. Open the channel under **Channels** and check its rules: which events they
cover and for which projects and stages.

### Can I see sent alerts from the CLI?

No. Sent alerts is a Console page. For CloudWatch alarm states, use [`stacktape alarm list`](/cli/alarms).
