# Alert Channels

Alert channels are the destinations where Stacktape delivers alerts — a Slack channel, an email inbox, a Discord webhook, or a custom HTTP endpoint. You create channels in the Stacktape Console, then attach them to [alarm rules](/observability/alarms), [notification rules](/observability/notifications), and [budget alerts](/managing-costs/budgets) so every alert reaches the right people.

Stacktape supports five channel types: **Slack**, **Microsoft Teams**, **Discord**, **Email**, and **Webhook**.

## When to use alert channels

Alert channels are Console-managed destinations that can be reused across rules. Create a channel when you want a named target that [notification rules](/observability/notifications), [alarm rules](/observability/alarms), or [budget alerts](/managing-costs/budgets) can reference. Once a channel exists, rules across your organization can deliver to it without duplicating configuration.

## When NOT to use alert channels

If your alarm destinations live alongside your infrastructure code and you prefer version-controlled config, you can define notification targets inline in your [alarm configuration](/observability/alarms) instead. Console-managed channels and inline targets are complementary — use whichever fits your workflow, or both.

## Channel types

Stacktape supports five channel types. Each type has its own configuration fields in the Console's channel creation form. Some fields — such as webhook URLs, access tokens, and secrets — are treated as sensitive values and masked in the Console.

### Slack

Slack channels deliver alert messages to a Slack channel or direct message using the Slack API. Setting up Slack requires creating a Slack app with the appropriate OAuth scopes and inviting the bot to the target channel. You provide a conversation ID and an access token when creating the channel in the Console.

Slack is a good default for teams that already use Slack for communication — alerts appear in context alongside other team discussions, and threading keeps noise manageable.

### Microsoft Teams

Microsoft Teams channels deliver alerts to a Teams channel. Teams integration typically uses an Incoming Webhook connector, which you configure in the Teams channel settings. You provide the webhook URL when creating the channel in the Console.

Choose Teams when your organization standardizes on Microsoft 365 and team members already monitor Teams channels throughout the day.

### Discord

Discord channels deliver alerts to a Discord channel via a webhook. You create a webhook in the Discord channel's integration settings and provide the webhook URL when creating the channel in the Console.

Discord works well for small teams, open-source projects, or communities that already use Discord as their primary communication platform.

### Email

Email channels deliver alerts to one or more email addresses. No external service setup is required — you provide the recipient addresses and Stacktape handles delivery.

Use email when recipients are not on your chat platform, when you need a compliance-friendly paper trail, or when you want alerts to reach on-call individuals who check email more reliably than chat.

### Webhook

Webhook channels deliver alerts to any HTTP endpoint you control. This is the most flexible option — use it to integrate with PagerDuty, Opsgenie, custom dashboards, incident management tools, or any system that accepts HTTP callbacks. You provide the target URL when creating the channel.

The channel configuration also supports a `secret` field (treated as a sensitive value in the Console), which can be used for payload verification on the receiving end. Use a webhook channel when none of the built-in chat integrations fit your workflow, or when you need to route alerts into a custom pipeline.

## Choosing the right channel type

| Channel | Best for | Setup effort |
|---|---|---|
| **Slack** | Team-wide visibility, threaded discussion | Medium — requires a Slack app with OAuth scopes |
| **Microsoft Teams** | Organizations on Microsoft 365 | Low — Incoming Webhook connector |
| **Discord** | Small teams, open-source communities | Low — channel webhook |
| **Email** | Compliance trails, stakeholders outside chat | None — just enter addresses |
| **Webhook** | Custom integrations (PagerDuty, Opsgenie, Zapier, custom dashboards) | Low — any HTTP endpoint |

For most teams, start with **Slack** or **Teams** for real-time visibility, and add a **Webhook** channel if you need to integrate with an incident management tool. Use **Email** when you need a delivery trail or when recipients are not in your chat platform.

## Creating a channel in the Console

Alert channels are created and managed on the **Channels** page in the Stacktape Console. Click the **Alert channel** button to open the channel creation form, where you select a channel type and fill in the type-specific fields. The channel becomes available for use in rules immediately after creation.

Alert channels are a Console-only feature — there is no CLI command for creating or managing channels. Rules that reference channels (alarm rules, notification rules, budget alerts) are also configured in the Console.

## Using channels with rules

Channels serve as delivery targets for three types of rules in the Stacktape Console:

- **[Alarm rules](/observability/alarms)** monitor AWS metrics (Lambda error rates, database CPU, API latency) and deliver an alert to the configured channel when a threshold is breached. The underlying CloudWatch alarms and EventBridge routing are created or updated on the next deployment of each matching stage.
- **[Notification rules](/observability/notifications)** deliver alerts when deployment events happen — a deploy succeeds, fails, or is canceled. Each notification rule specifies which events to watch and which channel to deliver the alert to.
- **[Budget alerts](/managing-costs/budgets)** fire when AWS spending crosses a defined threshold.

When creating or editing a rule in the Console, you select the channel that should receive the alert. See each rule type's dedicated page for configuration details.

## Deleting a channel

You can delete a channel from the **Channels** page by clicking the delete button next to it. Deletion can fail when the channel is still referenced by existing rules — the Console displays an error listing which rules still use the channel. Remove the channel from all referencing rules first, then delete it.

## FAQ

### Can I use the same channel for alarms, notifications, and budgets?

Yes. A channel created in the Console can be referenced by alarm rules, notification rules, and budget alerts. Create the channel once and attach it to whichever rules need it. This reusability is the main advantage of Console-managed channels over inline notification targets defined in your Stacktape config.

### How do I test that my channel is working?

Create a notification rule for a deployment event (such as deploy succeeded) and run a deployment. Check the [alert history](/observability/alert-history) page in the Console to confirm whether the alert was delivered. For webhook channels, verify that your endpoint received the request.

### What happens if a channel's endpoint becomes unreachable?

Stacktape records alert delivery results in [alert history](/observability/alert-history). If a channel's target endpoint returns an error or is unreachable, the alert shows a failed delivery status. Fix the endpoint or update the channel configuration, then check alert history after the next alert fires to confirm delivery resumes.

### Can I send alerts to multiple Slack channels?

Create a separate alert channel for each Slack channel you want to target. Then attach each channel to the relevant alarm rules, notification rules, or budget alerts. This gives you fine-grained control over which alerts reach which Slack channels.

### When should I use inline notification targets instead of Console channels?

Use inline `notificationTargets` in your [alarm configuration](/observability/alarms) when the alert destination is tightly coupled to a specific resource and should live in version control alongside your code. Use Console channels when the destination is shared across multiple rules or when non-developers need to manage alert routing without touching config files.

### Are alert channels managed per-organization or per-project?

Channels are created within the context of your selected organization in the Console. Rules across your organization can reference them — you do not need to recreate channels for each project or stage.

### Can I route different alert severities to different channels?

Yes. Create separate alarm rules with different thresholds and attach each to a different channel. For example, a warning-level CPU alarm (threshold 70%) could send to a Slack channel, while a critical-level alarm (threshold 90%) sends to a PagerDuty webhook. Each rule independently selects its channel.

### Is there a CLI command for managing alert channels?

No. Alert channels are a Console-only feature. You create, view, and delete them from the **Channels** page in the [Stacktape Console](/stacktape-console/console-overview). The CLI provides observability commands like [`stacktape debug:logs`](/cli/debug-logs) and [`stacktape debug:alarms`](/cli/debug-alarms) for runtime debugging, but channel management is handled entirely in the Console.

### What is the difference between alert channels and inline notification targets?

Console-managed alert channels are reusable destinations that any rule in your organization can reference by name. Inline notification targets are defined directly in your Stacktape config's alarm definitions and deploy with your stack. Console channels are better for shared, organization-wide routing. Inline targets are better for resource-specific alerts that should be version-controlled. See [alarm configuration](/observability/alarms) for inline target details.
