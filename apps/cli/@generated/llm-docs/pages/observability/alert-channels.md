# Alert Channels

Alert channels are the destinations where Stacktape delivers alerts — a Slack channel, an email inbox, a Discord webhook, or a custom HTTP endpoint. You create channels in the Stacktape Console, then use them in [alarm rules](/observability/alarms), [notification rules](/observability/notifications), and [budget alerts](/managing-costs/budgets) so every alert reaches the right people.

Stacktape supports six channel types: **Slack (Stacktape app)**, **Slack** (your own bot token), **Microsoft Teams**, **Discord**, **Email**, and **Webhook**.

## When to use alert channels

Alert channels are Console-managed destinations that can be reused across rules. Create a channel when you want a named target that [notification rules](/observability/notifications), [alarm rules](/observability/alarms), or [budget alerts](/managing-costs/budgets) can reference. Once a channel exists, rules across your organization can deliver to it without duplicating configuration.

## When NOT to use alert channels

Alert channels are a Console-only feature. If your team does not use the Stacktape Console for alert management, you may not need to create channels. See [alarm configuration](/observability/alarms) for alarm options that deploy with your stack.

## Channel types

Stacktape supports five channel types. When a channel has properties named `webhookUrl`, `accessToken`, or `secret`, the details modal masks them as sensitive values.

### Slack (Stacktape app)

Connect your Slack workspace once with the **Connect Slack** button on the **Channels** page, then pick channels from a list. No bot token is stored anywhere. Messages posted this way are cards that Stacktape keeps up to date: an incident is one message that changes as the incident is acknowledged or resolved, with later events in its thread. A new Slack-app channel starts with default rules: incidents from every stage, failed deployments from every stage, successful deployments from production stages only, and new security findings. Mark a channel as a preview channel to receive pull-request preview deployments there instead.

The app asks only for what it uses: posting and editing messages, uploading evidence images, listing channels, and reading member names and emails to match Slack users to Console users. It never reads message history. Public channels are joined automatically; invite the app to a private channel first (`/invite @Stacktape`).

Deployments are one card per deployment as well: it appears when the deployment starts (if your rules include "deployment started") or when it finishes, and shows who triggered it and how, the commit and branch, the duration, a link to what changed since the previous successful deployment, the stack's endpoints on success, and the failure text on failure. The outcome is added to the card's thread and shown in the channel. Pull-request previews get one card per pull request with the preview URLs, edited on every redeploy of that pull request.

Incident cards have buttons. **Acknowledge** works for anyone in the workspace and shows the Slack name of the person who clicked. **Mute 1 hour**, **Mute 24 hours** and **Resolve** run as your Console user, so they need the same `incidents:manage` permission and project access as in the Console. The first time you click one, Stacktape matches your Slack email to your Console account; if they differ, you get a private link that connects the two in one click (valid for 15 minutes), and after that every click is attributed to you. Resolve asks for confirmation inside the card before it does anything.

In your configuration, reference a channel of the connected workspace with the `slack-app` type and a channel name or ID. The name is resolved to the channel ID when you deploy, so renaming the channel later does not break delivery:

```yaml
notificationChannels:
  - type: slack-app
    properties:
      channel: '#alerts'
```

### Slack

Slack is one of the supported alert channel types. Slack is a good default for teams that already use Slack for communication — alerts appear in context alongside other team discussions. This type uses a bot token you create yourself; prefer **Slack (Stacktape app)** unless you need your own app.

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

Yes — this is the main reason to use Console-managed channels. Create a channel once and reference it from [alarm rules](/observability/alarms), [notification rules](/observability/notifications), and [budget alerts](/managing-costs/budgets). Channels are scoped to the selected organization, so you don't recreate them per project or stage.

### When should I use a Console channel instead of config-level alarm options?

Use Console-managed channels when the destination is shared across multiple rules, or when non-developers need to manage alert routing without touching config files. If you'd rather define alarms that deploy alongside your stack from your Stacktape config, see [alarm configuration](/observability/alarms) instead.

### Can I send alerts to multiple Slack channels?

Yes, but you create a separate alert channel for each Slack channel you want to target, then select each one in the relevant rules. This lets a warning-level alarm rule deliver to one Slack channel while a critical rule targets another channel (or a webhook for your incident-management tool).

### How do I tell whether an alert was actually delivered?

Check [alert history](/observability/alert-history) in the Console — a unified log across notifications, alarms, and budgets. The notification and alarm history views include delivery status, so you can confirm an alert was sent. If history shows it was sent but the destination never received it, open the channel details in the Console and check the receiving system's own logs.

### Why can't I delete a channel?

The delete fails when the channel is still referenced by a rule — the API returns an error starting with "Can't delete this channel yet," and the Console lists the referencing rule lines. Remove those references from the relevant alarm rules, notification rules, or budget alerts, then retry the deletion.

### Is there a CLI command for managing alert channels?

No. Alert channels are a Console-only feature — they are created, viewed, and deleted from the **Channels** page in the [Stacktape Console](/stacktape-console/console-overview). The CLI's observability commands like [`stacktape logs`](/cli/logs) and [`stacktape alarms`](/cli/alarms) are for runtime debugging, not channel management.
