# Billing and Subscription

The Stacktape Console billing and subscription area is where you choose, compare, and switch between the Free, Flexible, and Enterprise plans. The Subscription Plans page handles plan selection using Paddle for checkout. The Billing page shows billing details, invoices, and a Paddle checkout container. Choose a plan based on team size, managed AWS spend, and support needs.

## What this part of the Console does

The billing and subscription area covers two Console pages. The **Subscription Plans** page is where you choose or change your plan. The **Billing** page shows billing details, an invoices list, and a Paddle checkout container. Users with the VIEWER role are redirected away from both pages. On the Subscription Plans page, the **Upgrade now** and **Downgrade to FREE** buttons appear only when the current user has the `org:manage-billing` permission. Payment management controls on the Billing page appear only when you have the `org:manage-billing` permission.

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

Payment management controls appear only when you have the `org:manage-billing` permission; otherwise the Billing page is read-only. Users with the VIEWER role are redirected away before the page loads.

### Downgrading to the Free plan

Open the Subscription Plans page. Under the Free plan card, click **Downgrade to FREE**. The button calls the Console's cancellation flow and refreshes your organization data on success. The Free plan card lists 1 team member and up to $100/month AWS costs.

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

Stacktape charges based on the AWS infrastructure costs it manages for you — not per seat, per deployment, or per request. The Free plan covers up to $100/month of managed AWS costs with no fee. The Flexible plan is priced as a percentage of managed AWS costs, with rate tiers shown on the Subscription Plans page, and includes unlimited deployments and stacks. Enterprise pricing is custom.

### What counts as "managed AWS costs"?

Managed AWS costs are costs for AWS infrastructure that Stacktape manages through your stacks. Stacktape does not charge for other AWS resources in your account that exist outside Stacktape-managed stacks.

### Who can manage billing in my organization?

Users with the `org:manage-billing` permission see the upgrade and downgrade controls on the Subscription Plans page. Payment management controls on the Billing page appear only when you have this permission. Users without this permission can still view both pages (except Viewers, who are redirected). See [team and access control](/stacktape-console/team-and-access-control) for role management.

### What happens if I exceed the Free plan's $100/month limit?

The Free plan covers up to $100/month of managed AWS costs. For larger Stacktape-managed AWS spend, upgrade to the Flexible plan on the Subscription Plans page, which has no AWS cost limit.

### Can I downgrade from Flexible to Free?

Yes. Open the Subscription Plans page and click **Downgrade to FREE** under the Free plan card. This calls the Console's cancellation flow and refreshes your organization data on success. You need the `org:manage-billing` permission to see the button.

### How do I get Enterprise pricing?

On the Subscription Plans page, click the schedule-meeting button under the Enterprise plan card. This connects you with the Stacktape team to discuss custom pricing, SSO, SOC 2 compliance, and premium support options.

### Where can I find my invoices?

Open the Billing page in the Stacktape Console. It shows billing details, an invoices list, and a Paddle checkout container. Users with the VIEWER role cannot access this page.
