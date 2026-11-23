# Billing and subscription

The Stacktape CLI is open source and free, and it works without a Stacktape account; see [Use the CLI without an account](/getting-started/open-source-cli). This page covers the plans of the Stacktape Console: Free, Flexible and Enterprise. AWS bills you for your infrastructure as before; the Stacktape fee is a separate invoice from Stacktape.

You compare and change plans on **Subscription plans**, and see the fee estimate and invoices on **Organization → Billing**. Owners and Admins can change the plan. Developers can compare plans but don't see Billing, and Viewers see neither.

## Plans

Stacktape charges a share of the AWS costs of the stacks it manages, not per seat, deployment or request.


## Feature Comparison

| Feature | Free | Flexible | Enterprise |
| --- | --- | --- | --- |
| Price | $0 | 19–25% of managed AWS spend | Custom |
| Managed AWS spend | Up to $200/mo | No limit | No limit |
| Team members | Unlimited | Unlimited | Unlimited |
| Deployments and stacks | Unlimited | Unlimited | Unlimited |
| Single sign-on and SCIM | no | yes | yes |
| Shared Slack channel with the founders | no | yes | yes |
| Your feature requests come first | no | yes | yes |
| Single-tenant Console in your AWS account | no | no | yes |
| Support | — | Shared Slack channel | Up to 24x7 premium |


### Free plan

The Free plan is the whole Console except single sign-on and SCIM provisioning. It costs $0, needs no credit card and has no member limit. It covers managed AWS spend up to $200 a calendar month (UTC). When an organization passes $200, deploys keep working for 7 days the first time, then pause until it upgrades or the next month starts. See [Free plan cost limit](#free-plan-cost-limit).

### Flexible plan

The Flexible plan has no spend limit. Its fee is one rate applied to the whole month's managed AWS spend. The rate depends on how large that spend is:

| Monthly managed AWS spend | Rate |
|---|---|
| Up to $2,000 | 25% |
| $2,000.01 to $5,000 | 23% |
| $5,000.01 to $10,000 | 21% |
| $10,000.01 to $25,000 | 20% |
| Above $25,000 | 19% |

For example:

| Managed AWS spend in a month | Stacktape fee |
|---|---|
| $500 | $125 (25%) |
| $1,000 | $250 (25%) |
| $2,000 | $500 (25%) |
| $3,000 | $690 (23%) |
| $8,000 | $1,680 (21%) |

Managed spend is what the resources in Stacktape stacks cost, summed over all AWS accounts connected to the organization. Everything else in those accounts doesn't count. Say your two accounts cost $1,400 in a month: $1,000 for your Stacktape stacks and $400 for AWS Support and an old EC2 instance. You pay AWS $1,400 and Stacktape $250 (25% of $1,000), plus tax where it applies. The [Costs](/managing-costs/dashboards) page shows the same split: your projects, and costs outside projects.

The fee for a month is charged on the 7th of the next month (UTC), after AWS finishes the month's cost reports. The Subscription plans page shows what Flexible would cost your organization, in dollars, from its own costs.

On top of the Free plan, Flexible adds [single sign-on](/stacktape-console/single-sign-on) (SAML or OIDC) with SCIM provisioning, a shared Slack channel with the founders, and priority for your feature requests. Priority means your requests are worked on first; it comes with no SLA or delivery dates.

### Enterprise plan

The Enterprise plan runs a single-tenant Console in your own AWS account and region, for data residency. It includes single sign-on and SCIM and up to 24x7 premium support, and its price is agreed with you. Click **Schedule a meeting** on the Subscription plans page to talk to the Stacktape team.

## Free plan cost limit

A Free organization can deploy while its managed AWS spend for the current calendar month (UTC) is $200 or less.

- **What counts.** The same managed spend the Flexible fee is based on, from the AWS billing data Stacktape reads.
- **Grace, once per organization.** The first time the organization is over the limit, Stacktape emails its Owners and Admins and starts a 7-day grace period. Deploys keep working during it, but only within the calendar month (UTC) it started in: a grace period that starts on November 29 doesn't cover December. In any later month, deploys pause as soon as the organization passes the limit, with no new grace period.
- **What pauses.** After the grace period, every new deploy: `stacktape deploy`, including code-only (fast) deploys, remote and runner deploys, deploys after a Git push and deploys started from the Console. `stacktape dev` does not start either, because it deploys a dev stack. A deploy that already started finishes normally.
- **What keeps working.** Your running infrastructure is never touched. Deleting stages, rolling back, running scripts and the rest of the Console keep working.
- **How it lifts.** Upgrading to Flexible lifts it immediately. Without an upgrade, deploys resume when the next calendar month starts.
- **Missing cost data.** AWS delivers billing data a few times a day, and a new connection has none at first. Until Stacktape has this month's costs, deploys are not limited.

The Console shows where you are. The sidebar shows this month's managed spend against the limit, and from $150 on it adds what Flexible would cost this month. During the grace period every page has a banner, for example "Day 3 of 7 over the Free limit. Flexible would cost about $53 this month." While deploys are paused, every page opens with an upgrade notice, which you can close to keep reading. Members who can't change the plan see which Owners and Admins can.

The CLI tells you too. From $150 on, and during the grace period, a successful deploy prints one line with the month's spend or the days left and what Flexible would cost. A refused deploy or dev session stops before it changes anything in AWS. [`deploy`](/cli/deploy#free-plan-cost-limit) shows both messages.

The limit applies to the Console only. The open-source CLI without an account has no limit.

## Change your plan

1. Open **Subscription plans**. From Billing, click **Compare plans**. The card of your plan says **Current plan**.
2. Click **Upgrade to Flexible**. Paddle's checkout opens; enter your payment details there.
3. When Paddle accepts the payment, the page shows **Confirming your Flexible plan** until Paddle confirms it to Stacktape, usually within seconds. Don't start the checkout again. If the confirmation takes more than a minute, the page shows **Not confirmed yet** with a **Check again** button.

To go back, click **Downgrade to Free** on the Free card. If this month's managed spend is already above $200, the [Free plan cost limit](#free-plan-cost-limit) applies right after the downgrade. An Enterprise plan is changed through your agreement.

The buttons are disabled, with the reason, for members who can't change the plan.

## Billing page

**Organization → Billing** shows:

- **Next charge, estimated**: the Flexible fee so far for this month, or for last month until it is charged on the 7th, with the managed spend it is based on. A fee is estimated only when your AWS cost reports are in US dollars, because the rates are set on dollar amounts. On Free, this tile shows this month's spend against the $200 limit instead.
- **Plan and payment**: the plan, who is billed, the invoice email and currency, and the Paddle subscription ID to quote when you contact support. Paddle stores the card, address and tax ID. **Update payment details** opens Paddle.
- **Invoices**: one row per charged month with the fee, tax and total, and **View invoice**.

The estimate uses the cost reports Stacktape has so far, and AWS keeps finishing a month's reports for a few days after it ends. The invoice charges the final amount.

## Billing FAQ

### Why is my plan still Free after paying?

Paddle confirms the payment to Stacktape separately, usually within seconds. While it does, Subscription plans shows **Confirming your Flexible plan**. If it says **Not confirmed yet**, click **Check again**, and contact support if it stays that way.

### Can I calculate the fee before connecting anything?

Yes, from the table above and your expected AWS bill for the stacks Stacktape would manage. For a stack you haven't deployed yet, [`stacktape init`](/cli/init) shows a monthly AWS estimate before the first deploy. See [Costs overview](/managing-costs/overview) for what drives an AWS bill.
