# Console Overview

The Stacktape Console is a web application for managing AWS deployments, teams, and infrastructure. It provides deployment tracking, cost visibility, alarm and budget configuration, an error inbox, secrets management, guardrails, and role-based team access control. Everything deploys to your own AWS account — the Console is the management layer on top.

## What the Console does

The Console organizes features into organization management (Projects, Activity, Users, Costs), monitoring (Channels, Notifications, Alarms, Budgets, Issues), and configuration (Guardrails, Secrets, SSM Params, AWS Accounts, Domains). Projects represent your applications — typically one per Git repository. Each project can have multiple stages (isolated deployments like `production`, `staging`, or `dev`), each with its own resources. To deploy a stage, you need a Stacktape configuration describing which resources should be created.

From the Console you can:

- Track deployment activity and AWS costs across projects and stages
- Create and manage alarm rules, budget alerts, and notification channels
- Track runtime errors through the [Issues](/observability/issues) error inbox
- Store secrets and SSM parameters used by your workloads
- Set [guardrails](/guardrails/overview) that enforce deployment policies across the organization
- Connect [AWS accounts](/stacktape-console/connecting-your-aws-account) and [custom domains](/resources/networking/custom-domains)
- Edit Stacktape configuration with a Monaco-based [visual config editor](/stacktape-console/visual-config-editor)
- Manage [team members](/stacktape-console/team-and-access-control) with role-based access control

The Console does not replace the [Stacktape CLI](/cli/deploy) — it complements it. Deployments run through the CLI (or through [GitOps](/ci-cd-and-gitops/gitops-with-console)), while the Console gives you visibility and control over what's been deployed. To view logs from your workloads, use [`stacktape debug:logs`](/cli/debug-logs) from the CLI.

## Console navigation

The Console sidebar organizes features into four groups. Navigation items are permission-gated — users only see sections their role allows. The sidebar displays badge counts on the Issues and Alarms navigation items when the user has the relevant permissions and data is available.

| Group | Pages | What it covers |
|---|---|---|
| **Top-level** | Overview, Config editor | Default dashboard and the [visual config editor](/stacktape-console/visual-config-editor) |
| **Organization** | Projects, Activity, Users, Costs | Project and stage management, deployment history, [team access](/stacktape-console/team-and-access-control), [cost tracking](/managing-costs/dashboards) |
| **Monitoring** | Channels, Notifications, Alarms, Budgets, Issues | [Alert channels](/observability/alert-channels), [notification rules](/observability/notifications), [alarm rules](/observability/alarms), [budget alerts](/managing-costs/budgets), [runtime issues](/observability/issues) |
| **Configuration** | Guardrails, Secrets, SSM Params, AWS Accounts, Domains | [Guardrails](/guardrails/overview), [secrets](/configuration/secrets), SSM parameters, [AWS account connections](/stacktape-console/connecting-your-aws-account), [custom domains](/resources/networking/custom-domains) |


> **Info:** The Config editor is hidden for users with the **Viewer** role. Other navigation items are hidden based on specific permissions — for example, the Users page requires `members:view` and the Costs page requires `org:view-billing`. See [Team and access control](/stacktape-console/team-and-access-control) for the full permissions matrix.


## The Overview route

The Overview page (`/overview`) is the default landing page after login. It serves as the entry point to the Console for the selected organization. From the sidebar, navigate to specific areas — Projects, Costs, Issues, Alarms, and others — for detailed views of each feature.

## Walkthrough: first login to deployed stage

This walkthrough covers the path from first login to viewing a deployed stage.

1. **Sign up and log in.** Create an account or sign in. You land on the Overview page.
2. **Connect an AWS account.** Navigate to **AWS Accounts** under the Configuration section. Follow the guided setup to connect your AWS account via a cross-account IAM role. See [Connecting your AWS account](/stacktape-console/connecting-your-aws-account) for details.
3. **Create a project.** Navigate to **Projects** under the Organization section and create a new project. A project represents your application and typically maps 1:1 to a Git repository.
4. **Deploy a stage.** Use the CLI ([`stacktape deploy`](/cli/deploy)) or set up [GitOps](/ci-cd-and-gitops/gitops-with-console) for push-to-deploy. The Console tracks the deployment automatically.
5. **View your stage.** Open the project in the Console and select the stage. To view logs, use [`stacktape debug:logs`](/cli/debug-logs) from the CLI.

## Common tasks

### Viewing deployment activity

Navigate to **Activity** under the Organization section. This page shows a log of Stacktape CLI operations across your organization — deploys, deletes, scripts, bucket syncs, and other recorded commands. Use it to track who ran what and when.

### Managing secrets

Navigate to **Secrets** under the Configuration section to create, update, or delete secrets stored in AWS Secrets Manager. Secrets created here can be referenced in your Stacktape configuration and are injected into your workloads at runtime. This page requires the `secrets:view` permission. See [Secrets](/configuration/secrets) for configuration details.

### Managing SSM parameters

Navigate to **SSM Params** under the Configuration section to manage configuration values stored in AWS Systems Manager Parameter Store. Use parameters for non-sensitive configuration your workloads need at runtime, such as feature flags or endpoint URLs. This page requires the `ssm-params:view` permission.

### Setting up alarm rules

Navigate to **Alarms** → **Rules** under the Monitoring section. Alarm rules monitor AWS CloudWatch metrics for your resources — Lambda error rates, database CPU, API latency, and more. When a metric crosses the threshold you define, an alert is sent to the [channel](/observability/alert-channels) you specify. Creating or changing a rule saves it in the Console. The actual CloudWatch alarms and EventBridge notification routing are created, updated, or removed the next time each matching project and stage is deployed. See [Alarms](/observability/alarms) for full details.

### Tracking runtime issues

The **Issues** page under Monitoring is an error inbox for your deployed workloads. Stacktape groups repeated runtime errors by fingerprint, project, and stage — showing the error message, stack trace, resource, and occurrence count. Issues can be enabled for all projects, selected projects, and optionally specific stage names. Redeploy matching stages with CLI 3.8.0 or newer so Stacktape adds the CloudWatch Logs subscription filters for detection. This page requires the `issues:view` permission. See [Issues](/observability/issues) for detection details and supported languages.

### Inviting team members

Navigate to **Users** under the Organization section to invite members and assign roles. Each member can have a different role that determines what they can view and modify. The Users page requires the `members:view` permission. See [Team and access control](/stacktape-console/team-and-access-control) for role details.

### Setting budget alerts

Navigate to **Budgets** → **Rules** under the Monitoring section. Budget alerts can be scoped to specific projects or applied organization-wide. Organization-wide budget alerts are created in the selected AWS account when saved. Stack-scoped budgets depend on Stacktape deployment metadata, so deploy matching stacks after creating or changing stack-scoped alerts. See [Budgets](/managing-costs/budgets).

### Configuring notification channels and rules

Navigate to **Channels** under the Monitoring section to create alert destinations — a Slack channel, an email address, a webhook, or another supported target. Then navigate to **Notifications** → **Rules** to define which events trigger alerts (deployment succeeded, failed, or canceled) and which channel delivers them. The Notifications page requires the `org:manage-notifications` permission. The Channels page is visible to all authenticated users.

## Permission-gated navigation

The Console uses role-based access control. Sidebar items are hidden when the current user lacks the required permission. The following table lists navigation items with specific permission requirements:

| Navigation item | Required permission |
|---|---|
| Config editor | Hidden for Viewer role |
| Users | `members:view` |
| Costs | `org:view-billing` |
| Issues | `issues:view` |
| Alarms | `org:manage-alarms` |
| Notifications | `org:manage-notifications` |
| Budgets | `org:manage-budgets` |
| Guardrails | `org:manage-guardrails` |
| Secrets | `secrets:view` |
| SSM Params | `ssm-params:view` |

Pages not listed above — Overview, Projects, Activity, Channels, AWS Accounts, and Domains — are visible to all authenticated organization members.


> **Warning:** If a sidebar item is missing, your role may not include the required permission. Contact your organization's owner or admin to adjust your access. See [Team and access control](/stacktape-console/team-and-access-control) for role details.


## Troubleshooting

### Cost data is not appearing

AWS Cost and Usage Reports can take up to 24 hours to propagate. If the Costs page shows no data, wait a day after your first deployment. The cost breakdown requires an active [AWS account connection](/stacktape-console/connecting-your-aws-account).

### Alarms not firing after creating rules

Alarm rules saved in the Console are materialized as CloudWatch alarms on the next deployment of each matching stage. If you create a rule but don't redeploy, the alarm won't exist in AWS yet. Run [`stacktape deploy`](/cli/deploy) for the target stage to activate the alarm.

### Issues page is empty despite errors in logs

Issues must be enabled for your projects and stages in the Console. Redeploy matching stages with CLI 3.8.0 or newer so Stacktape adds the CloudWatch Logs subscription filters for detection. Detection is log-pattern based — it looks for common runtime error markers (Lambda invoke errors, unhandled promise rejections, exceptions, tracebacks, panics, stack-trace lines) for supported languages: TypeScript/JavaScript, Python, Go, Java, .NET, Ruby, and PHP. Errors that don't match those patterns won't be detected.

### Sidebar items are missing

Navigation items are permission-gated. If you don't see a section (for example, Guardrails or Alarms), your role may not include the required permission. See the [permission-gated navigation](#permission-gated-navigation) table above or contact your organization admin.

## Related features

- [Connecting your AWS account](/stacktape-console/connecting-your-aws-account) — required before any deployment
- [Organizations, projects, and stages](/stacktape-console/organizations-projects-and-stages) — how the Console organizes your work
- [Visual config editor](/stacktape-console/visual-config-editor) — Monaco-based editor with IntelliSense
- [API keys](/stacktape-console/api-keys) — authenticate from the CLI and CI/CD
- [Team and access control](/stacktape-console/team-and-access-control) — invite users and manage roles
- [Billing and subscription](/stacktape-console/billing-and-subscription) — plans, invoices, and payment
- [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) — auto-deploy on push
- [Observability overview](/observability/overview) — alarms, issues, and notifications in depth

## FAQ

### What is the Stacktape Console?

The Stacktape Console is a web application that provides a management layer over your AWS deployments. It handles team access, deployment tracking, cost visibility, alarm and budget configuration, secret management, and guardrails — organized by organization, project, and stage. Deployments run through the CLI or GitOps; the Console is where you monitor and manage them.

### Do I need the Console to use Stacktape?

No. You can use the Stacktape CLI standalone with [API keys](/stacktape-console/api-keys) for authentication and deploy entirely from your terminal or CI pipeline. The Console provides the Overview route, team management, cost dashboards, alarm and budget rule configuration, the Issues error inbox, guardrails, and the visual config editor.

### Does Stacktape deploy into my own AWS account?

Yes. Stacktape deploys all infrastructure into your AWS account using a cross-account IAM role. The Console is the management interface; your resources, data, and costs stay in your AWS account. See [Connecting your AWS account](/stacktape-console/connecting-your-aws-account) for details on the required role.

### How do I connect multiple AWS accounts?

Navigate to **AWS Accounts** under the Configuration section. You can connect multiple AWS accounts to one organization. Each connection uses its own cross-account IAM role, and Stacktape manages temporary credentials automatically — you don't need to handle AWS credentials manually.

### What's the difference between the Console and the CLI?

The CLI is the deployment engine — it packages code, creates CloudFormation stacks, and manages infrastructure lifecycle. The Console is the management layer — it tracks deployments, manages team access, shows cost data, and configures monitoring rules. Most teams use both: the CLI (directly or via GitOps) for deploying, and the Console for visibility and operational control.

### How does Stacktape track AWS costs?

Stacktape uses AWS Cost and Usage Reports to attribute spend to your projects and stages. Cost data appears in the Console within 24 hours of incurring charges. The Costs page breaks down spending by project and stage. See [Managing costs](/managing-costs/overview) for budgets and optimization tips.

### What languages does the Issues error inbox support?

Issue detection is log-pattern based and supports TypeScript/JavaScript, Python, Go, Java, .NET, Ruby, and PHP. It looks for common runtime error markers — Lambda invoke errors, unhandled promise rejections, exceptions, tracebacks, panics, and stack-trace lines. Detection requires CLI version 3.8.0 or newer and a redeployment of matching stages.

### Can I restrict what team members can access?

Stacktape uses role-based access control. Each member can have a different role that determines what they can view and modify. Navigation items are permission-gated — users only see sections their role allows. See [Team and access control](/stacktape-console/team-and-access-control) for role details.

### How do alarm rules get applied to my AWS resources?

Alarm rules are saved in the Console immediately, but the actual CloudWatch alarms and EventBridge routing are created or updated during the next [`stacktape deploy`](/cli/deploy) of each matching stage. If you create a rule and don't redeploy, the alarm won't exist in AWS yet. This design keeps alarms in sync with your deployed infrastructure.

### Where do I manage billing and subscription?

See [Billing and subscription](/stacktape-console/billing-and-subscription) for current plan, invoice, and payment details. AWS infrastructure costs are billed separately by AWS and visible in the Console's Costs page under the Organization section.
