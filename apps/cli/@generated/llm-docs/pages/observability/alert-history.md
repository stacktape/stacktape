# Sent alerts

**Alerting → Sent alerts** in the Stacktape Console lists every alert the Console sent to your
[alert channels](/observability/alert-channels): incidents, deploys and other events covered by a channel's
[notification rules](/observability/notifications), [alarms](/observability/alarms#notification-targets) that deliver
through the Console, and [budget alerts](/managing-costs/budgets). Use it to check what was sent and whether it arrived.

## Find an alert that didn't arrive

1. Open **Alerting → Sent alerts** and set **Delivery** to **Failed**.
2. Open the alert. For each channel it shows whether the provider accepted it, every attempt with its time, and the
   error when it failed.
3. Follow the link to the failed channel, fix its settings, and click **Send test** on its page.

"Accepted" means the provider took the message, for example "Accepted by Slack". Stacktape doesn't see whether someone
read it. If an alert shows as accepted but never showed up, check the receiving system.

An event that no channel receives is not sent and doesn't appear here. If you expected one, open the channel under
**Alerting → Channels** and check which events and which projects and stages its rules cover.

## Columns

| Column | Shows |
|---|---|
| **Time** | When the alert was sent. Hover for the exact time. |
| **Alert** | What happened, for example an opened incident or a failed deploy. |
| **Project / stage** | Where it happened, or "Organization" for organization-wide alerts such as budgets and secret changes. |
| **Sent to** | The channels it went to. A channel that didn't accept it is shown in red. |
| **Delivery** | **Sent** when every channel accepted it, **Failed** when none did, **1 of 3 failed** when some didn't, and **Sending** while it is being delivered. |

## Filters

- **Alert**: incidents, deploys and changes, or budgets.
- **Channel**: one channel. A channel's page links here with this filter set.
- **Delivery**: **Failed** shows only alerts with a failed delivery.

An incident's page links here filtered to that incident.

## Other history

- An alarm's own history, opened from the alarm on **Alerting → Alarms**, shows its CloudWatch state changes.
- **Alerting → Budgets** lists each budget's alerts in its **Alerts sent** section.

Sent alerts is a Console page with no CLI command. For CloudWatch alarm states in the terminal, use
[`stacktape alarm list`](/cli/alarm-list).
