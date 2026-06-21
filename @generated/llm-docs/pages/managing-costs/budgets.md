# Budgets

Stacktape budget alerts notify you before AWS spending exceeds a threshold you define. Created and managed in the Stacktape Console, budget alerts track actual and forecasted spend at the whole-organization scope in the selected AWS account, or filtered by project and stage for per-stack budgets. When costs cross a percentage of your configured threshold, alerts are delivered through your configured [alert channels](/observability/alert-channels). AWS infrastructure costs are billed directly to your AWS account; the Stacktape subscription fee is separate. Budgets help you catch runaway AWS spend before it becomes a surprise invoice.

## Creating a budget alert

Budget alerts are created in the Stacktape Console on the Budgets page. The list shows name, scope, threshold, alert percentages, project/stage filters, and created date. Click the Show details icon on any row to open a detail modal that additionally shows the Include forecast setting and attached alert channels. Budget alerts in the Console include these properties:

| Property | Description |
|----------|-------------|
| **Name** | A descriptive label for the budget (e.g. "Production spend limit"). |
| **Scope** | **Whole organization** (monitors the entire AWS account) or **Per stack** (filtered by specific projects and stages). |
| **Threshold** | The dollar amount and currency that defines your spending threshold. |
| **Alert at percentages** | One or more percentage values. An alert fires when actual (or forecasted) spend crosses each percentage of the threshold. |
| **Include forecast** | When enabled, also alerts when AWS predicts spend will exceed the threshold. |
| **For projects** | When scope is Per stack, which projects to monitor — individual project names or all projects. |
| **For stages** | When scope is Per stack, which stages to monitor — individual stage names or all stages. |
| **Alert channels** | Where alerts are delivered, using channels configured on the [alert channels](/observability/alert-channels) page. |


> Screenshot: Stacktape Console Budgets page showing a list of budget alerts with columns for name, scope, threshold, alert percentages, projects, stages, and created date Caption: The Budgets page lists all budget alerts with their scope, threshold, and alert configuration.


> **Info:** Organization-wide budget alerts are created in the selected AWS account when you save them. Stack-scoped budget alerts depend on Stacktape deployment metadata — deploy matching stacks after creating or changing a stack-scoped alert so the Console can track their spend.


## Scoping

Stacktape budget alerts support two scope levels. Choosing the right scope depends on whether you need a single cost ceiling or per-team accountability.

| Scope | Monitors | Project/stage filters | Best for |
|-------|----------|----------------------|----------|
| **Whole organization** | Total AWS account spend | Not applicable — covers everything | A single safety net across all stacks |
| **Per stack** | Spend attributed to matching stacks | Filter by specific projects and/or stages, or select all | Separate budgets for production vs. development, or per-team cost tracking |

**Whole organization** is the simpler option. It catches any spike regardless of which project caused it. Start here if you want a single ceiling for your AWS account.

**Per stack** gives you granular control. Select individual project names or all projects, and individual stage names or all stages. For example, you can create one budget for your production stage across all projects and a separate, lower budget for development stages. When scope is "Whole organization", the project and stage filter columns display "Whole organization" and are not configurable.


> **Tip:** Most teams benefit from having both: one Whole organization budget as a safety net, plus Per stack budgets for production stacks where cost accountability matters.


## Forecast alerts

When "Include forecast" is enabled on a budget alert, Stacktape delivers an additional alert when AWS predicts spend will exceed your threshold — even if actual spend is still below it. This gives you lead time to investigate and react before costs actually cross the limit.

Enable forecast alerts on production budgets where early warning matters. For development or short-lived stages, threshold-exceeded alerts on actual spend are usually sufficient.

AWS Budgets forecasts are produced by AWS based on historical usage patterns. For newly created accounts or recently deployed stacks, there may not be enough usage history for AWS to generate a meaningful forecast. As usage data accumulates over time, forecast predictions become available and more accurate. If your forecast alert isn't firing on a new stack, this is the most likely reason.

## Managing budgets

The Budgets page in the Console shows all budget alerts in a table. Use the Show details icon on any row to inspect a budget's full configuration. Each row also includes a delete button to remove the budget alert.

## Budget history

Budget history in the Console is a log of budget alert events, including threshold-exceeded and forecasted-overspend events. Check budget history to see when budget alerts were triggered.

## When to use

Set up at least one budget alert before going to production. AWS spend can increase quickly when traffic spikes, a runaway process loops, or someone deploys a resource larger than intended. Budgets are the fastest way to detect cost anomalies early.

- **Start with a Whole organization budget** at 80% and 100% of your expected AWS bill. This catches any stack that misbehaves.
- **Add Per stack budgets** for production stacks where you need tighter accountability per team or project.
- **Enable forecast alerts** on production budgets so you get advance warning before overruns.
- **Connect alert channels** such as Slack, email, or a webhook so budget alerts reach the tools your team already monitors.

Budgets complement other cost management tools in the Console:

| Tool | Purpose | When to use |
|------|---------|-------------|
| [Dashboards](/managing-costs/dashboards) | View spending trends over time | Understanding what you're spending |
| **Budget alerts** (this page) | Get notified when spend crosses a threshold | Controlling and reacting to spend |
| [Per-resource breakdown](/managing-costs/per-resource-breakdown) | Attribute costs to individual resources | Identifying which resources drive costs |
| [Optimization tips](/managing-costs/optimization-tips) | Reduce baseline spend | Lowering costs proactively |

## When NOT to use

Budget alerts notify you — they do not stop spend. AWS Budgets cannot automatically scale down or terminate resources when a threshold is crossed. If you need preventive cost controls that block expensive deployments, use [guardrails](/guardrails/overview) to restrict resource sizes, instance types, and regions.

Budget alerts are also not a substitute for right-sizing resources. If baseline spend is already higher than it should be, the [per-resource breakdown](/managing-costs/per-resource-breakdown) helps identify which specific resources are driving costs, and [optimization tips](/managing-costs/optimization-tips) offers concrete ways to reduce spend directly.

## FAQ

### Do budget alerts stop AWS from charging me?

No. AWS Budgets is an alerting mechanism, not a spending cap. When a threshold is crossed, you receive a notification — AWS does not automatically shut down or throttle resources. You need to respond to the alert by scaling down, removing unused resources, or adjusting your configuration. For preventive cost controls, combine budgets with [guardrails](/guardrails/overview) that restrict what can be deployed.

### How quickly do budget alerts fire after a threshold is crossed?

Budget alerts are not real-time — AWS Budgets evaluates spend periodically, so there can be a delay between crossing a threshold and receiving an alert. A fast-burning workload could overshoot between evaluation cycles. For more cost context, check the [cost dashboards](/managing-costs/dashboards) in the Console alongside your budget alerts.

### What is the difference between threshold-exceeded and forecasted-overspend alerts?

Threshold-exceeded alerts fire when cumulative spend has already passed a configured percentage of your limit. Forecasted-overspend alerts fire when AWS predicts you will exceed the threshold, even though actual spend has not reached it yet. Enable both on production budgets for maximum lead time — the forecast alert often fires earlier than the actual threshold is crossed.

### Can I set a budget alert for a single resource like one database?

Stacktape budget alerts scope to projects and stages (stacks), not individual resources within a stack. For per-resource cost visibility, use the [per-resource breakdown](/managing-costs/per-resource-breakdown) in the Console.

### How much do AWS Budgets cost?

AWS may charge for AWS Budgets depending on your account and usage — check the [AWS Budgets pricing page](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/) for current rates.

### Can I send budget alerts to Slack, email, or a webhook?

Yes. Alert channels — such as a Slack channel, an email address, or a webhook — are destinations used by notification rules, alarm rules, and budget alerts. Configure them on the [alert channels](/observability/alert-channels) page, then select the channels you need when creating a budget alert.

### Why isn't my forecast alert firing?

AWS Budgets forecasts rely on historical usage data. For newly created AWS accounts or recently deployed stacks, there may not be enough usage history for AWS to generate a meaningful forecast yet. As usage data accumulates over time, forecast-based alerts become available and more accurate. Verify that "Include forecast" is enabled on the budget alert in question, and that the budget's scope matches the stacks generating spend.

### Should I use budgets, guardrails, or both for cost control?

Use both — they serve different purposes. Budget alerts are reactive: they notify you when spend crosses a threshold so you can investigate. [Guardrails](/guardrails/overview) are preventive: they block deployments that violate your rules (e.g. oversized instances, unauthorized regions, restricted resource types). Start with budget alerts for cost visibility, then layer in guardrails once you know which constraints protect your team from common mistakes.

### Where can I see how much each stack is costing me?

The [cost dashboards](/managing-costs/dashboards) in the Console show spend over time, and the [per-resource breakdown](/managing-costs/per-resource-breakdown) attributes costs to individual projects, stages, and resources. Budget alerts complement these views by adding proactive notification — dashboards show what happened, budget alerts tell you when it is happening.
