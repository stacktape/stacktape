# Budgets

A budget sets a monthly spending limit for one connected AWS account. When the account's spend, or the month's forecast,
crosses a percentage of that limit, Stacktape sends an alert to the [alert channels](/observability/alert-channels) you
choose. AWS bills your account directly; the Stacktape subscription fee is separate.

Budgets alert you. They do not stop spend.

## Before you start

- You need the `org:manage-budgets` permission. By default, only owners and admins have it, and the **Budgets** item in
  the Console's Alerting group is hidden from other members.
- The AWS account must be [connected](/stacktape-console/connecting-your-aws-account) with deployment access. Accounts
  connected as read-only cannot be selected.
- Create at least one [alert channel](/observability/alert-channels). A budget needs a channel to send to.

## Creating a budget

1. Open **Budgets** in the Console and click **New budget**.
2. Fill in the form:

| Field | What it does |
|-------|--------------|
| **Name** | A label for the budget, for example "Production account". |
| **Monthly limit (USD)** | The spend limit for the calendar month. The minimum is $1. |
| **Alert at percentages** | Percentages of the limit that trigger an alert, separated by commas. Use up to five whole numbers from 1 to 100, in ascending order. The default is `80, 100`. |
| **Also alert when the month's forecast goes over a percentage** | Also alerts when AWS forecasts that this month's spend will cross one of the percentages. On by default. |
| **AWS account** | The connected account whose spend the budget watches. |
| **Alert channels** | Where the alerts go. Choose one or more. |

3. Click **Create budget**.

Stacktape creates a monthly AWS cost budget in the selected account. It counts the account's whole spend, not only
spend from Stacktape stacks. Credits and refunds are not subtracted.

You cannot edit a budget after creating it. To change the limit, percentages, account or channels, delete the budget and
create a new one.

## When alerts arrive

AWS updates budget data a few times a day, so an alert can arrive hours after spend crosses a percentage. Do not rely
on budgets for real-time cost control.

Each percentage alerts at most once a month for actual spend and, with forecast alerts on, once for the forecast. For
example, with `80, 100` you can get up to four alerts in a month: spend reached 80%, spend reached 100%, forecast
reaches 80%, forecast reaches 100%. A new month starts again with no alerts.

AWS needs some usage history before it can forecast. On a newly created account, forecast alerts may not arrive until
AWS has enough data.

## Checking budgets

The **Budgets** page lists every budget with its state this month, monthly limit, alert percentages and what it applies
to. The state is the most serious alert of the month: **Over limit**, **Forecast over**, **Reached 80%**,
**Forecast 80%**, or **No alerts this month**.

Click a budget to open its page. It shows the alert percentages, whether forecast alerts are on, the alert channels, a
link to this month's costs per stage for the account, and the alerts the budget sent.

The **Alerts sent** section on the Budgets page lists the alerts all budgets sent. The same alerts also appear in
[Sent alerts](/observability/alert-history). Deleting a budget removes its AWS budget and stops its alerts; its past
alerts stay in Sent alerts.

The **Budgets** row on the Console Overview turns red when a budget is over its limit or forecast to go over it this
month.

## Budgets in Slack

When a budget sends to a [Slack app channel](/observability/alert-channels), each budget gets one card per month. The
card is updated as higher percentages are crossed and shows the spending pace and the days left in the month.

- **Show drivers** replies privately with the stacks behind the month's spend and how each changed since the previous
  month.
- **Snooze until month end** stops all alerts from that budget until the month is over. It needs the
  `org:manage-budgets` permission. The budget's page in the Console shows the snooze and has a **Resume alerts** button.

## Budgets created before v4

Stacktape v3 could filter a budget by project and stage. Stacktape v4 cannot create these budgets. If an older one
still exists, its **Applies to** column shows the projects and stages instead of **Whole AWS account**. Delete it and
create a budget for the AWS account instead.

## Recommended setup

- Create one budget for each AWS account that runs production stages. Set the limit to your expected monthly bill and
  keep the default 80% and 100% alerts.
- Keep forecast alerts on. They give you warning before the spend actually crosses the limit.
- To separate production and development spend, run them in separate AWS accounts and give each account its own
  budget. A budget cannot filter by project or stage.

Budgets work with the other cost tools in the Console:

| Tool | Use it to |
|------|-----------|
| [Dashboards](/managing-costs/dashboards) | See spending trends over time. |
| **Budgets** (this page) | Get alerted when an account's spend crosses a limit. |
| [Per-resource breakdown](/managing-costs/per-resource-breakdown) | Find the projects, stages and resources that drive costs. |
| [Optimization tips](/managing-costs/optimization-tips) | Lower your baseline spend. |

## FAQ

### Do budget alerts stop AWS from charging me?

No. A budget sends alerts; AWS does not shut down or throttle anything when a limit is crossed. To prevent expensive
deployments, use [guardrails](/guardrails/overview) to restrict resource sizes, instance types and regions.

### Can I set a budget for one stage, project or database?

No. A budget watches a whole AWS account. To see spend per project, stage or resource, use the
[per-resource breakdown](/managing-costs/per-resource-breakdown). To alert on one stage's spend, deploy that stage to its
own AWS account and create a budget for that account.

### How much do AWS Budgets cost?

AWS may charge for AWS Budgets depending on your account and usage. Check the
[AWS Budgets pricing page](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/) for current rates.

### Why isn't my forecast alert arriving?

Check that the budget's page says it alerts "when the forecast goes over one of them". If it does, AWS probably does
not have enough usage history for this account yet. Forecasts become available as usage data accumulates.

### Should I use budgets, guardrails, or both?

Both. Budgets tell you when spend crosses a limit so you can investigate. [Guardrails](/guardrails/overview) block
deployments that break your rules, such as oversized instances or unapproved regions.
