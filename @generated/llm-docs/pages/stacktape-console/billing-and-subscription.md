# Billing and Subscription

Stacktape offers three subscription plans — Free, Flexible, and Enterprise — managed entirely through the Stacktape Console. The Subscription Plans page lets you compare and switch plans using Paddle for checkout. The Billing page renders billing details, an invoices list, and a Paddle checkout container. Choose a plan based on team size, AWS spend, and support needs.

## What this part of the Console does

The billing and subscription area covers two Console pages. The **Subscription Plans** page is where you choose or change your plan. The **Billing** page shows billing details, an invoices list, and a Paddle checkout container. Users with the VIEWER role are redirected away from both pages. On the Subscription Plans page, the **Upgrade now** and **Downgrade to FREE** buttons appear only when the current user has the `org:manage-billing` permission. The Billing page also checks this permission to determine which billing management options are available.

## Subscription plans

Stacktape bills based on the AWS infrastructure costs your stacks generate — not per seat, per deployment, or per request. The Free and Flexible plan cards both list unlimited deployments and unlimited stacks.


## Feature Comparison

| Feature | Free | Flexible | Enterprise |
| --- | --- | --- | --- |
| Price | $0 | % of AWS costs | Custom |
| Team members | 1 | Unlimited | Unlimited |
| AWS cost limit | $100/mo | — | — |
| Deployments | Unlimited | Unlimited | — |
| Stacks | Unlimited | Unlimited | — |
| Support | — | Hands-on | Up to 24x7 premium |
| SSO | no | no | yes |
| SOC 2 Compliance | no | no | yes |


### Free plan

The Free plan requires no credit card. It supports one team member and covers managed AWS infrastructure costs up to $100 per month. The Free plan price is $0 — Stacktape itself charges nothing on this tier. This is a good fit for individual developers, hobby projects, or evaluating Stacktape before committing to a paid plan.

### Flexible plan

The Flexible plan is priced as a percentage of AWS costs managed by Stacktape, with rate tiers shown on the Subscription Plans page. Stacktape does not charge for resources in your AWS account that exist outside Stacktape-managed stacks.

The Flexible plan includes unlimited team members and hands-on support. Choose this when your team is growing or your AWS costs exceed the Free plan's $100/month cap.

### Enterprise plan

The Enterprise plan shows custom pricing on the subscription page and includes a schedule-meeting button to connect with the Stacktape team. The Enterprise plan card lists unlimited members, SSO, SOC 2 compliance, and up to 24x7 premium support. Choose this when your organization requires compliance certifications, SSO integration, or dedicated support SLAs.

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

The Billing page checks the `org:manage-billing` permission to determine which billing management options are available. Users with the VIEWER role are redirected away before the page loads.

### Downgrading to the Free plan

Open the Subscription Plans page. Under the Free plan card, click **Downgrade to FREE**. The downgrade button triggers the Paddle subscription cancellation flow. On success, the Console updates your displayed plan. The Free plan card lists 1 team member and up to $100/month AWS costs.

### Viewing current plan status

The Subscription Plans page shows which plan is currently active. The active plan displays a "Currently active" indicator instead of an upgrade or downgrade button.

## Permissions

Billing access is gated in two ways:

- **VIEWER redirect** — Users with the VIEWER role are redirected away from both the Billing and Subscription Plans pages.
- **`org:manage-billing`** — The **Upgrade now** and **Downgrade to FREE** buttons on the Subscription Plans page appear only when the current user has this permission. The Billing page also checks this permission to determine which billing management options are available. Users without this permission can still view billing and subscription pages (except Viewers).

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

Stacktape charges based on the AWS infrastructure costs it manages for you. The Free plan covers up to $100/month with no fee. The Flexible plan is priced as a percentage of managed AWS costs, with rate tiers shown on the Subscription Plans page. Enterprise pricing is custom. Stacktape does not charge for AWS resources outside its management.

### Is there a per-deployment or per-request fee?

No. The Free and Flexible plan cards list unlimited deployments and unlimited stacks. Flexible pricing is shown as a percentage of AWS infrastructure costs managed by Stacktape.

### What counts as "managed AWS costs"?

Managed AWS costs are costs for AWS infrastructure that is managed by Stacktape. The Console tooltip confirms that Stacktape will not charge you for other resources within your AWS account.

### Can I use Stacktape without a credit card?

Yes. The Free plan requires no credit card and supports one team member with up to $100/month in managed AWS costs. The Free plan price is $0.

### Who can manage billing in my organization?

Users with the `org:manage-billing` permission see the upgrade and downgrade controls on the Subscription Plans page. The Billing page also checks this permission to determine which billing management options are available. Users without this permission can still view both pages (except Viewers, who are redirected). See [team and access control](/stacktape-console/team-and-access-control) for role management.

### Who processes Stacktape subscription payments?

The Stacktape Console uses Paddle for subscription checkout. Payment details are entered through the Paddle checkout flow shown on the Subscription Plans page when upgrading to a paid plan. For accepted payment methods, refer to Paddle's documentation.

### What happens if I exceed the Free plan's $100/month limit?

The Free plan card lists up to $100/month of AWS costs. For larger Stacktape-managed AWS spend, review the Flexible plan on the Subscription Plans page and upgrade from there.

### Can I downgrade from Flexible to Free?

Yes. Open the Subscription Plans page in the Console and click **Downgrade to FREE** under the Free plan card. This cancels your Paddle subscription. The Free plan card lists 1 team member and up to $100/month AWS costs.

### How do I get Enterprise pricing?

On the Subscription Plans page, click the schedule-meeting button under the Enterprise plan card. This connects you with the Stacktape team to discuss custom pricing, SSO, SOC 2 compliance, and premium support options.

### Where can I find my invoices?

Open the Billing page in the Stacktape Console. It shows billing details, an invoices list, and a Paddle checkout container. Users with the VIEWER role cannot access this page.
