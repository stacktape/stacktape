# Alert Channels

Alert channels are the destinations where Stacktape delivers alerts — a Slack channel, an email inbox, a Discord webhook, or a custom HTTP endpoint. You create channels in the Stacktape Console, then use them in [alarm rules](/observability/alarms), [notification rules](/observability/notifications), and [budget alerts](/managing-costs/budgets) so every alert reaches the right people.

Stacktape supports five channel types: **Slack**, **Microsoft Teams**, **Discord**, **Email**, and **Webhook**.

## When to use alert channels

Alert channels are Console-managed destinations that can be reused across rules. Create a channel when you want a named target that [notification rules](/observability/notifications), [alarm rules](/observability/alarms), or [budget alerts](/managing-costs/budgets) can reference. Once a channel exists, rules across your organization can deliver to it without duplicating configuration.

## When NOT to use alert channels

Alert channels are a Console-only feature. If your team does not use the Stacktape Console for alert management, you may not need to create channels. See [alarm configuration](/observability/alarms) for alarm options that deploy with your stack.

## Channel types

Stacktape supports five channel types. When a channel has properties named `webhookUrl`, `accessToken`, or `secret`, the details modal masks them as sensitive values.

### Slack

Slack is one of the supported alert channel types. Slack is a good default for teams that already use Slack for communication — alerts appear in context alongside other team discussions.

### Microsoft Teams

Microsoft Teams is one of the supported alert channel types. Choose Teams when your organization standardizes on Microsoft 365 and team members already monitor Teams channels throughout the day.

### Discord

Discord is one of the supported alert channel types. Discord works well for small teams, open-source projects, or communities that already use Discord as their primary communication platform.

### Email

Email is one of the supported alert channel types. Use email when recipients are not on your chat platform, when you need a compliance-friendly paper trail, or when you want alerts to reach on-call individuals who check email more reliably than chat.

### Webhook

Webhook is the flexible channel type for HTTP-based integrations. Use a webhook channel when none of the built-in chat integrations fit your workflow, or when you need to route alerts into a custom pipeline such as an incident management tool or a custom dashboard.

## Choosing the right channel type

| Channel | Best for |
|---|---|
| **Slack** | Team-wide visibility, threaded discussion |
| **Microsoft Teams** | Organizations on Microsoft 365 |
| **Discord** | Small teams, open-source communities |
| **Email** | Compliance trails, stakeholders outside chat |
| **Webhook** | Custom integrations (incident tools, custom dashboards) |

For most teams, start with **Slack** or **Teams** for real-time visibility, and add a **Webhook** channel if you need to integrate with an incident management tool. Use **Email** when you need a delivery trail or when recipients are not in your chat platform.

## Creating a channel in the Console

Alert channels are listed on the **Channels** page in the Stacktape Console. The page has an **Alert channel** button that opens the channel creation modal. Create channels here, then use them in [notification rules](/observability/notifications), [alarm rules](/observability/alarms), and [budget alerts](/managing-costs/budgets).

Alert channel management is available in the Stacktape Console. The Console uses channels in [notification rules](/observability/notifications), [alarm rules](/observability/alarms), and [budget alerts](/managing-costs/budgets).

## Using channels with rules

Channels are used by notification rules, alarm rules, and budget alerts to deliver alerts. They serve as delivery targets for three types of rules in the Stacktape Console:

- **[Alarm rules](/observability/alarms)** monitor AWS metrics (Lambda error rates, database CPU, API latency) and deliver an alert to the configured channel when a threshold is breached. The underlying CloudWatch alarms and EventBridge routing are created or updated on the next deployment of each matching stage.
- **[Notification rules](/observability/notifications)** deliver alerts when deployment events happen — a deploy succeeds, fails, or is canceled. Each notification rule specifies which events to watch and which channel to deliver the alert to.
- **[Budget alerts](/managing-costs/budgets)** fire when AWS spending crosses a defined threshold.

See each rule type's dedicated page for configuration details.

## Deleting a channel

The Channels page includes a delete action for each listed channel. When the delete API returns an error starting with "Can't delete this channel yet," the Console renders the referenced rule lines from that error. Remove those references before retrying the deletion.

## FAQ

### Can I use the same channel for alarms, notifications, and budgets?

Yes. A channel created in the Console can be referenced by alarm rules, notification rules, and budget alerts. Create the channel once and select it in whichever rules need it. This reusability is the main advantage of Console-managed channels — you define the destination once and select it across multiple rules.

### How do I test that my channel is working?

Check [alert history](/observability/alert-history) in the Console to see a unified log of alerts across notifications, alarms, and budgets. The notification history and alarm history pages include delivery status, so you can confirm whether an alert was sent. If the history indicates the alert was sent but the destination did not receive it, inspect the channel details in the Console and check the receiving system.

### What happens if a channel's endpoint becomes unreachable?

Check [alert history](/observability/alert-history) in the Console for a log of alerts sent through your channels. The notification history and alarm history pages include delivery status. Correct the channel configuration as needed, then verify alert history after the next alert fires to confirm delivery resumes. Outside of Stacktape, you may also want to check the receiving system's own logs as a general troubleshooting step.

### Can I send alerts to multiple Slack channels?

Create a separate alert channel for each Slack channel you want to target. Then select each channel in the relevant alarm rules, notification rules, or budget alerts. This gives you fine-grained control over which alerts reach which Slack channels.

### When should I use Console channels vs config-level alarm options?

Use Console-managed alert channels when the destination is shared across multiple rules or when non-developers need to manage alert routing without touching config files. For alarm options configured directly in your Stacktape config, see [alarm configuration](/observability/alarms).

### Are alert channels managed per-organization or per-project?

The Console loads alert channels for the selected organization and uses them when configuring notification rules, alarm rules, and budget alerts. You do not need to recreate channels for each project or stage.

### Can I route different thresholds to different channels?

Alarm rules monitor metrics and send alerts to a specified channel when a threshold is breached. To reach different destinations for different conditions, configure each alarm rule with the appropriate channel. For example, a warning-level rule could target a Slack channel while a critical rule targets a webhook for your incident management system.

### Is there a CLI command for managing alert channels?

Alert channels are created, viewed, and deleted from the **Channels** page in the [Stacktape Console](/stacktape-console/console-overview). The CLI provides observability commands like [`stacktape debug:logs`](/cli/debug-logs) and [`stacktape debug:alarms`](/cli/debug-alarms) for runtime debugging.

### What is the difference between alert channels and alarm configuration in Stacktape config?

Console-managed alert channels are reusable destinations that any rule in your organization can reference by name. They are created and managed entirely in the Console. Console channels are best for shared, organization-wide routing managed by non-developers. See [alarm configuration](/observability/alarms) for alarm options that deploy with your stack.
