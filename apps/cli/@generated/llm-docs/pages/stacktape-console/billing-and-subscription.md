# Billing and Subscription

The Stacktape CLI is open source and free, and it works without a Stacktape account; see [Use the CLI without an account](/getting-started/open-source-cli). This page covers the plans of the Stacktape Console: Free, Flexible and Enterprise. You choose and switch plans on the Subscription Plans page, which uses Paddle for checkout. The Billing page shows billing details and invoices.

## What this part of the Console does

The billing and subscription area covers two Console pages. The **Subscription Plans** page is where you choose or change your plan. The **Billing** page shows billing details, an invoices list, and a Paddle checkout container. Users with the VIEWER role are redirected away from both pages. On the Subscription Plans page, the **Upgrade now** and **Downgrade to FREE** buttons appear only when the current user has the `org:manage-billing` permission. Payment management controls on the Billing page appear only when you have the `org:manage-billing` permission.

## Subscription plans

Stacktape bills based on the AWS costs of the stacks it manages — not per seat, per deployment, or per request. AWS bills you for the infrastructure; the Stacktape fee is a separate line.


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

The Free plan is the whole Console except single sign-on and SCIM provisioning. It costs $0, needs no credit card and has no member limit. It covers managed AWS spend up to $200 a calendar month (UTC). The first time an organization passes $200, it gets [up to seven days of grace in that month](#free-plan-cost-limit).

### Flexible plan

The Flexible plan has no spend limit. Its fee is one rate applied to the whole month's managed AWS spend. The rate depends on how large that spend is:

| Monthly managed AWS spend | Rate |
|---|---|
| Up to $2,000 | 25% |
| $2,000 to $5,000 | 23% |
| $5,000 to $10,000 | 21% |
| $10,000 to $25,000 | 20% |
| Above $25,000 | 19% |

For example:

| Managed AWS spend in a month | Stacktape fee |
|---|---|
| $500 | $125 (25%) |
| $1,000 | $250 (25%) |
| $3,000 | $690 (23%) |
| $8,000 | $1,680 (21%) |

The Subscription Plans page estimates the Flexible fee in dollars using your organization's managed AWS spend. On the 7th of each month, Stacktape checks which organizations are on Flexible and uses their reported managed AWS spend for the previous calendar month. Payments go through Paddle, with tax where applicable.

On top of the Free plan, Flexible adds [single sign-on](/stacktape-console/single-sign-on) (SAML or OIDC) with SCIM provisioning, a shared Slack channel with the founders, and priority for your feature requests. Priority means your requests are worked on first; it comes with no SLA or delivery dates.

### Enterprise plan

The Enterprise plan runs a single-tenant Console in your own AWS account and region, for data residency. It includes single sign-on and SCIM and up to 24x7 premium support, and its price is agreed with you. The Subscription Plans page has a schedule-meeting button to talk to the Stacktape team.

## Free plan cost limit

A Free organization can deploy while its managed AWS spend for the current calendar month (UTC) is $200 or less.

- **What counts.** The same managed AWS costs the Flexible fee is based on: the costs of the resources in Stacktape-managed
  stacks, summed over all AWS accounts connected to the organization, from the AWS billing data Stacktape reads. Other
  resources in your AWS accounts do not count. The Costs page shows the same numbers.
- **Grace, once per organization.** The first time the organization is over the limit, Stacktape emails its Owners and
  Admins and shows a banner in the Console. Deploys keep working for seven days from that point or until the UTC
  month ends, whichever comes first. In any later month, deploys pause as soon as the organization passes the limit.
- **What pauses.** After the grace period, every new deploy: `stacktape deploy`, including code-only (fast) deploys,
  remote and runner deploys, deploys after a Git push and deploys started from the Console. `stacktape dev` does not
  start either, because it deploys and updates a dev stack. A deploy that already started finishes normally.
- **What keeps working.** Your running infrastructure is never touched. Deleting stages, rolling back, running scripts
  and the rest of the Console keep working.
- **How it lifts.** Upgrading to the Flexible plan lifts it immediately. Without an upgrade, deploys resume when the next
  calendar month starts and its costs begin again from zero.
- **Missing cost data.** AWS delivers billing data a few times a day, and a new connection has none at first. Until
  Stacktape has this month's costs, deploys are not limited.

Every Free organization sees this month's managed AWS spend against the limit in the sidebar of the Console. Once the
month's spend passes $150, the Console also shows what Flexible would cost this month in dollars, for example "Day 3 of
7 over the Free limit. Flexible would cost about $62 this month." While deploys are paused, every Console page opens
with an upgrade notice, which you can close to keep reading. Members who cannot change the plan see which Owners and
Admins can.

The CLI tells you too. After a successful deploy, it prints one line when the organization is close to or over the
limit, such as how far into the grace period it is and what Flexible would cost. It stops a refused deploy or dev session
before it touches AWS and prints the costs, the limit and the link to the Subscription Plans page.

The limit applies to the Console only. The open-source CLI without an account has no limit; see
[Use the CLI without an account](/getting-started/open-source-cli).

## Walkthrough: upgrading to the Flexible plan

1. **Open subscription plans** — In the Stacktape Console, navigate to the Subscription Plans page.
2. **Review plan details** — Compare the three plans and their included features.
3. **Click Upgrade now** — Under the Flexible plan card, click the **Upgrade now** button. This starts the Paddle checkout flow. The page includes a Paddle checkout container for payment processing.
4. **Complete payment** — Enter your payment details in the Paddle checkout.
5. **Confirm activation** — On success, the Console refetches your organization data and updates the displayed plan status.


> **Info:** Only users with the `org:manage-billing` permission see the Upgrade and Downgrade buttons. If you don't see them, ask someone with the `org:manage-billing` permission to handle the billing change or adjust your role. See [team and access control](/stacktape-console/team-and-access-control) for role management.


## Common tasks

### Viewing invoices

In the Stacktape Console, open the Billing page. It shows a billing details section, an invoices list, and a Paddle checkout container.

### Reviewing billing details

Payment management controls appear only when you have the `org:manage-billing` permission; otherwise the Billing page is read-only. Users with the VIEWER role are redirected away before the page loads.

### Downgrading to the Free plan

On the Subscription Plans page, click **Downgrade to Free** to open Paddle's cancellation flow. The Console switches your organization to Free when it receives Paddle's cancellation confirmation. The [Free plan cost limit](#free-plan-cost-limit) applies from then, including if this month's managed spend is already above $200.

### Viewing current plan status

The Subscription Plans page shows which plan is currently active. The Free and Flexible cards show a "Currently active" indicator instead of an upgrade or downgrade button when their plan is active.

## Permissions

Billing access is gated in two ways:

- **VIEWER redirect** — Users with the VIEWER role are redirected away from both the Billing and Subscription Plans pages.
- **`org:manage-billing`** — The **Upgrade now** and **Downgrade to FREE** buttons on the Subscription Plans page appear only when the current user has this permission. Payment management controls on the Billing page appear only when you have this permission. Users without this permission can still view billing and subscription pages (except Viewers).

For details on permissions and how to change a user's role, see [team and access control](/stacktape-console/team-and-access-control).


> **Warning:** Users with the VIEWER role are automatically redirected away when attempting to access billing or subscription pages.


## Troubleshooting

### Cannot see the Upgrade or Downgrade button

You need the `org:manage-billing` permission. Ask someone with this permission to handle the billing change or adjust your role. See [team and access control](/stacktape-console/team-and-access-control) for role management.

### Plan not updating after payment

After completing the Paddle checkout, the Console updates your organization data. If the plan still shows the old state, refresh the page manually.

### Free plan shows as current but no subscription exists

On the Subscription Plans page, the Free plan displays a "Currently active" indicator when the plan type is `FREE`. This is normal — no Paddle subscription is needed for the Free tier. Open the Subscription Plans page and click **Upgrade now** under the Flexible plan card if you need a paid subscription.

## Related features

- [Team and access control](/stacktape-console/team-and-access-control) — manage roles and permissions for your organization members.
- [Organizations, projects, and stages](/stacktape-console/organizations-projects-and-stages) — understand how billing relates to organization structure.
- [Managing costs overview](/managing-costs/overview) — monitor and control your AWS infrastructure spend.
- [Cost dashboards](/managing-costs/dashboards) — visualize per-resource cost breakdown.
- [Budgets](/managing-costs/budgets) — set spending alerts before costs escalate.

## FAQ

### How does Stacktape pricing work?

The CLI is open source and free. The Console charges based on the AWS costs of the stacks it manages — not per seat, per deployment, or per request. The Free plan covers up to $200 a month of managed AWS spend with no fee. The Flexible plan charges one rate on the whole month's managed AWS spend: 25% up to $2,000, falling to 19% above $25,000. For example, $1,000 of AWS costs $250. Enterprise pricing is custom.

### What counts as "managed AWS costs"?

Managed AWS costs are costs for AWS infrastructure that Stacktape manages through your stacks. Stacktape does not charge for other AWS resources in your account that exist outside Stacktape-managed stacks.

### Who can manage billing in my organization?

Users with the `org:manage-billing` permission see the upgrade and downgrade controls on the Subscription Plans page. Payment management controls on the Billing page appear only when you have this permission. Users without this permission can still view both pages (except Viewers, who are redirected). See [team and access control](/stacktape-console/team-and-access-control) for role management.

### What happens if I exceed the Free plan's $200/month limit?

The first time, deploys keep working for up to seven days in that UTC month. Owners and Admins are told by email and in the Console. When the organization is over the limit without grace, Stacktape pauses new deploys and `stacktape dev` sessions until it upgrades or the next month starts. Work already in progress can finish. See [Free plan cost limit](#free-plan-cost-limit).

### Can I downgrade from Flexible to Free?

Yes. You need the `org:manage-billing` permission. See [Downgrading to the Free plan](#downgrading-to-the-free-plan).

### How do I get Enterprise pricing?

On the Subscription Plans page, click the schedule-meeting button under the Enterprise plan card. This connects you with the Stacktape team to discuss a single-tenant Console, custom pricing, and premium support options.

### Where can I find my invoices?

Open the Billing page in the Stacktape Console. It shows billing details, an invoices list, and a Paddle checkout container. Users with the VIEWER role cannot access this page.
