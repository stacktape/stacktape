# Managing Costs Overview

AWS infrastructure costs are billed directly to your AWS account, separate from Stacktape's subscription fee. The Stacktape Console provides cost dashboards, cost attribution by project and stage, and budget alerts to help you understand and control your AWS spend. This section also covers optimization strategies to reduce costs.

Managing costs involves three activities, each covered in a dedicated page:

| Activity | Question it answers | Details |
|----------|---------------------|---------|
| **Viewing costs** | What am I spending and where? | [Dashboards](/managing-costs/dashboards), [Per-resource breakdown](/managing-costs/per-resource-breakdown) |
| **Controlling costs** | How do I prevent overspend? | [Budgets](/managing-costs/budgets) |
| **Reducing costs** | How do I spend less? | [Optimization tips](/managing-costs/optimization-tips) |


> **Tip:** If you are new to cost management, start by checking the overview dashboard for your current month-to-date spend, then set up an organization-wide budget alert as a safety net. Those two steps cover most teams.


## Stacktape charges vs. AWS charges

Stacktape costs and AWS costs are independent charges on separate invoices. AWS infrastructure costs are charges in your connected AWS account. Stacktape subscription and billing are managed separately.

| Charge | Billed by | What it covers |
|--------|-----------|----------------|
| AWS infrastructure costs | AWS (to your AWS account) | Compute, storage, networking, databases — everything your resources use |
| Stacktape subscription | Stacktape (to your organization) | [Stacktape platform subscription and plan features](/stacktape-console/billing-and-subscription) |

AWS bills your account directly — the Stacktape Console displays AWS cost report data for connected AWS accounts but does not process AWS charges. Subscription plans and billing are managed on the [Billing page](/stacktape-console/billing-and-subscription).

## Viewing costs

The Stacktape Console shows AWS cost data in two places: the organization overview dashboard and the dedicated costs per stack page.

The **overview dashboard** displays a month-to-date AWS costs KPI with a trend comparison against the previous month and a cost trend sparkline, an AWS Costs by Project chart (top 10 projects, with the remainder grouped as "Other" when there are more than 10), and an AWS Costs by Resource chart. These give you a quick spending snapshot without navigating away from the main dashboard. Budget alert status also appears on the overview dashboard, showing each configured budget with its name, scope, alert percentages, and threshold.

The **costs per stack page** lets you select a connected AWS account and a time range (month), then shows a table of every attributed stack with its project name, stage, region, and month-to-date costs — sortable by cost and paginated at 10 rows per page. Clicking a row navigates to the per-stage cost detail view. This is where you go to compare spend across stages or find your most expensive stack for a given month.


> **Info:** New stacks may take up to a day to appear in cost data after their first deployment.


For the full walkthrough of these views, see [Dashboards](/managing-costs/dashboards). The overview dashboard includes an AWS Costs by Resource chart — see [Per-resource breakdown](/managing-costs/per-resource-breakdown) for the dedicated cost-breakdown page.

### Cost attribution

The costs-per-stack view shows AWS costs broken down by project and stage, generated daily from AWS Cost and Usage Reports. Stack attribution is based on Stacktape deployment metadata attached during deploy operations.

## Controlling costs with budgets

Budget alerts let you set spending thresholds and get alerted before your AWS costs exceed them. Stacktape supports two scopes:

- **Organization-wide budgets** — applied across your organization and created in the selected AWS account when saved.
- **Stack-scoped budgets** — scoped to specific projects. Stack-scoped budget status depends on Stacktape deployment metadata, so deploy matching stacks after creating or changing stack-scoped alerts.

The overview budget panel displays each budget's name, scope, alert percentages, and threshold. Budget history records threshold-exceeded and forecasted-overspend events. Budget alerts can be scoped to specific projects or applied across the organization.

Organization-wide budgets are the simpler option. Organization-wide budget alerts are created in the selected AWS account when saved. Most teams start with an organization-wide budget and add stack-scoped budgets for production stages as they grow.


> **Tip:** Start with a single organization-wide budget at a comfortable monthly cap. Add stack-scoped budgets later for production stages that you want to monitor individually.


For setup details, see [Budgets](/managing-costs/budgets).

## Reducing costs

The largest cost-reduction levers in a typical Stacktape deployment are:

1. **Right-sizing compute** — matching memory, CPU, and instance types to actual workload needs rather than over-provisioning. Right-size [Lambda function](/resources/compute/lambda-function) memory so functions do not pay for capacity they do not use. The same principle applies to container-based workloads — match CPU and memory to observed usage, not worst-case estimates.
2. **Using Lambda functions for intermittent traffic** — Lambda's pay-per-invocation model is often cheaper than always-on containers for bursty or idle-heavy workloads.
3. **Choosing the right database tier** — using serverless database engines for variable workloads and provisioned instances only when sustained throughput justifies the cost. See [relational databases](/resources/databases/relational-database) for engine options and their tradeoffs.
4. **CDN caching** — offloading repetitive responses to [CDN](/resources/networking/cdn) edge locations to reduce origin compute. If your API returns the same response for the same request, caching it at the edge avoids hitting your backend entirely.
5. **Cleaning up unused stages** — [deleting](/deployment-and-lifecycle/destroying-stacks) preview and dev stages that are no longer needed. Every running stage incurs costs for its databases, containers, and other always-on resources, even if no traffic is hitting them.

For concrete, actionable guidance on each of these, see [Optimization tips](/managing-costs/optimization-tips).

## FAQ

### How long does it take for cost data to appear?

Cost reports are generated daily from AWS Cost and Usage Reports. New and changed stacks follow the same daily refresh cadence.

### Are AWS costs billed through Stacktape?

No. AWS bills your AWS account directly — the Stacktape Console displays AWS cost report data for connected AWS accounts but does not process AWS charges. Stacktape's own subscription is a separate charge billed by Stacktape to your organization. See [Billing and subscription](/stacktape-console/billing-and-subscription) for subscription details.

### How do budget alerts work?

You define a spending threshold and one or more percentage triggers. Budget alerts can be scoped to specific projects or applied across the organization. Organization-wide budget alerts are created in the selected AWS account when saved. Stack-scoped budget status depends on Stacktape deployment metadata, so deploy matching stacks after creating or changing stack-scoped alerts. Budget history records both threshold-exceeded and forecasted-overspend events. See [Budgets](/managing-costs/budgets) for setup steps.

### Can I set budgets per stage?

Budget alerts can be applied across the organization or scoped to specific projects. There is no separate per-stage budget scope — use the costs-per-stack view for per-stage cost visibility. Organization-wide budgets are the simpler option for a single safety net.

### What AWS services typically cost the most in Stacktape deployments?

For most deployments, the top cost drivers are compute (ECS Fargate tasks or Lambda invocations), databases (RDS or Aurora instances), and data transfer. The exact breakdown depends on your architecture. The overview dashboard includes an AWS Costs by Resource chart that shows your actual cost distribution across AWS service categories.

### How can I reduce Lambda function costs?

Reduce Lambda costs by right-sizing memory so functions do not pay for unused capacity and reducing execution duration through code optimization. For high-throughput functions that run continuously, evaluate whether a container-based [web service](/resources/compute/web-service) would be cheaper at sustained load. See [Optimization tips](/managing-costs/optimization-tips) for detailed guidance on these and other levers like ARM/Graviton instances.

### How often are cost reports updated?

Cost reports are generated daily from AWS Cost and Usage Reports. Sub-daily spend monitoring is not available through the Stacktape Console cost views.

### What is the difference between the overview dashboard and the costs page?

The overview dashboard shows a spending summary — month-to-date total with a trend comparison against the previous month, a cost trend sparkline, AWS Costs by Project (top 10), and AWS Costs by Resource. The dedicated costs per stack page shows attributed stacks in a table, paginated at 10 rows per page and initially sorted by month-to-date costs, with AWS account and time range selectors and navigation to per-stage detail views. See [Dashboards](/managing-costs/dashboards) for a walkthrough of both.

### How does Stacktape cost tracking compare to AWS Cost Explorer?

The Stacktape Console shows attributed costs by project and stage. Use AWS Cost Explorer when you need broader account-level analysis outside Stacktape's stack view — it offers custom reports, forecasting, savings plan recommendations, and full-account visibility across all services. Use the Stacktape Console for day-to-day stack-level cost awareness, and AWS Cost Explorer when you need advanced analysis or custom report exports.

### Can I see costs for resources not created by Stacktape?

The costs-per-stack table shows attributed stack cost data by project and stage. Use AWS Cost Explorer for full-account cost analysis, including resources not managed by Stacktape.
