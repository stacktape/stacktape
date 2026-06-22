# Console Overview

The Stacktape Console is a web application for managing organizations, projects, stages, team access, AWS account connections, costs, alerts, issues, secrets, and guardrails around Stacktape deployments. It provides deployment tracking, cost visibility, alarm and budget configuration, an error inbox, secrets management, guardrails, and role-based team access control.

## What the Console does

The Console organizes features into organization management (Projects, Activity, Users, Costs), monitoring (Channels, Notifications, Alarms, Budgets, Issues), and configuration (Guardrails, Secrets, SSM Params, AWS Accounts, Domains). Projects represent your applications — typically one per Git repository. Each project can have multiple stages (isolated deployments like `production`, `staging`, or `dev`), each with its own resources. To deploy a stage, you need a Stacktape configuration describing which resources should be created.

From the Console you can:

- Track deployment activity and AWS costs across projects and stages
- Create and manage alarm rules, budget alerts, and notification channels
- Track runtime errors through the [Issues](/observability/issues) error inbox
- Manage sensitive values in AWS Secrets Manager and configuration values in AWS Systems Manager Parameter Store
- Set [guardrails](/guardrails/overview) that enforce deployment policies across the organization
- Connect [AWS accounts](/stacktape-console/connecting-your-aws-account) and [custom domains](/resources/networking/custom-domains)
- Edit Stacktape configuration with the [visual config editor](/stacktape-console/visual-config-editor)
- Manage [team members](/stacktape-console/team-and-access-control) with role-based access control

The Console complements the [Stacktape CLI](/cli/deploy). The documented deploy path is [`stacktape deploy`](/cli/deploy), and [Git provider connections](/ci-cd-and-gitops/gitops-with-console) can enable automatic deployments from repositories. The Activity page tracks recorded CLI operations — deploys, deletes, scripts, bucket syncs, and other commands. To view logs from your workloads, use [`stacktape logs`](/cli/logs) from the CLI.

## Console navigation

The Console sidebar organizes features into four groups. Some sidebar items are permission-gated — Overview, Projects, Activity, Channels, AWS Accounts, and Domains are always visible, while items such as Users, Costs, Issues, Alarms, Notifications, Budgets, Guardrails, Secrets, and SSM Params are shown only when the current role has the required permission. The sidebar displays badge counts on the Issues and Alarms navigation items when the user has the relevant permissions and data is available.

| Group | Pages | What it covers |
|---|---|---|
| **Top-level** | Overview, Config editor | Default dashboard and the [visual config editor](/stacktape-console/visual-config-editor) |
| **Organization** | Projects, Activity, Users, Costs | Project and stage management, deployment history, [team access](/stacktape-console/team-and-access-control), [cost tracking](/managing-costs/dashboards) |
| **Monitoring** | Channels, Notifications, Alarms, Budgets, Issues | [Alert channels](/observability/alert-channels), [notification rules](/observability/notifications), [alarm rules](/observability/alarms), [budget alerts](/managing-costs/budgets), [runtime issues](/observability/issues) |
| **Configuration** | Guardrails, Secrets, SSM Params, AWS Accounts, Domains | [Guardrails](/guardrails/overview), [secrets](/configuration/secrets), SSM parameters, [AWS account connections](/stacktape-console/connecting-your-aws-account), [custom domains](/resources/networking/custom-domains) |


> **Info:** The Config editor is hidden for users with the **Viewer** role. Other navigation items are hidden based on specific permissions — for example, the Users page requires `members:view` and the Costs page requires `org:view-billing`. See [Team and access control](/stacktape-console/team-and-access-control) for role details.


## The Overview route

The Overview page (`/overview`) is marked as the Console's default route in the navigation. It serves as the entry point to the Console for the selected organization. From the sidebar, navigate to specific areas — Projects, Costs, Issues, Alarms, and others — for detailed views of each feature.

## Getting started

This walkthrough covers the path from first login to viewing a deployed stage.

1. **Sign in.** After signing in, the Overview page (`/overview`) is the default route in the Console navigation.
2. **Connect an AWS account.** Navigate to **AWS Accounts** under the Configuration section. Stacktape uses a cross-account IAM role so you do not need to manage AWS credentials manually. See [Connecting your AWS account](/stacktape-console/connecting-your-aws-account) for details.
3. **Create a project.** Navigate to **Projects** under the Organization section to work with projects. A project represents your application and typically maps 1:1 to a Git repository; each project can have multiple isolated stages.
4. **Deploy a stage.** Use the CLI ([`stacktape deploy`](/cli/deploy)) or set up [GitOps](/ci-cd-and-gitops/gitops-with-console) for push-to-deploy. Use the Activity page to review recorded CLI operations.
5. **View your stage.** Navigate to **Projects** under the Organization section. Projects can have multiple isolated stages — select your project to see its stages and deployment activity. To view logs, use [`stacktape logs`](/cli/logs) from the CLI.

## Common tasks

### Viewing deployment activity

Navigate to **Activity** under the Organization section. This page shows a log of Stacktape CLI operations across your organization. Use it to track who ran deploys, deletes, scripts, bucket syncs, and other recorded commands.

### Managing secrets

Navigate to **Secrets** under the Configuration section for sensitive values stored in AWS Secrets Manager. Secrets created here can be referenced in your Stacktape configuration. This page requires the `secrets:view` permission. See [Secrets](/configuration/secrets) for configuration and usage details.

### Managing SSM parameters

Navigate to **SSM Params** under the Configuration section to manage configuration values stored in AWS Systems Manager Parameter Store. Use parameters for non-sensitive configuration your workloads need at runtime, such as feature flags or endpoint URLs. This page requires the `ssm-params:view` permission.

### Setting up alarm rules

Navigate to **Alarms** → **Rules** under the Monitoring section. Alarm rules monitor AWS CloudWatch metrics for your resources — Lambda error rates, database CPU, API latency, and more. When a metric crosses the threshold you define, an alert is sent to the [channel](/observability/alert-channels) you specify. Creating or changing a rule saves it in the Console. The actual CloudWatch alarms and EventBridge notification routing are created, updated, or removed the next time each matching project and stage is deployed. See [Alarms](/observability/alarms) for full details.

### Tracking runtime issues

The **Issues** page under Monitoring is an error inbox for your deployed workloads. Stacktape groups repeated runtime errors by fingerprint, project, and stage — showing the error message, stack trace, resource, project, stage, and occurrence count. Issues can be enabled for all projects, selected projects, and optionally specific stage names. Redeploy matching stages with CLI 3.8.0 or newer so Stacktape adds the CloudWatch Logs subscription filters for detection. This page requires the `issues:view` permission. See [Issues](/observability/issues) for detection details and supported languages.

### Inviting team members

The **Users** page under the Organization section is for managing organization access: inviting team members, assigning roles, and controlling permissions. Each member can have a different role that determines what they can view and modify. This page requires the `members:view` permission. See [Team and access control](/stacktape-console/team-and-access-control) for role details.

### Setting budget alerts

Navigate to **Budgets** → **Rules** under the Monitoring section. Budget alerts can be scoped to specific projects or applied organization-wide. Organization-wide budget alerts are created in the selected AWS account when saved. Stack-scoped budgets depend on Stacktape deployment metadata, so deploy matching stacks after creating or changing stack-scoped alerts. See [Budgets](/managing-costs/budgets).

### Configuring notification channels and rules

Channels are the destinations where alerts get delivered — for example, a Slack channel, an email address, or a webhook. Navigate to **Channels** under the Monitoring section to create channels, then use them in notification rules, alarm rules, and budget alerts. Navigate to **Notifications** → **Rules** to define which events trigger alerts (deployment succeeded, failed, or canceled) and which channel delivers them. The Notifications page requires the `org:manage-notifications` permission.

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

The sidebar does not apply additional permission filtering to Overview, Projects, Activity, Channels, AWS Accounts, or Domains.


> **Warning:** If a sidebar item is missing, your role may not include the required permission. Contact your organization's owner or admin to adjust your access. See [Team and access control](/stacktape-console/team-and-access-control) for role details.


## Troubleshooting

### Cost data is not appearing

Reports are generated daily from AWS Cost and Usage Reports and may take up to a day to appear. If the Costs page shows no data, ensure you have a connected [AWS account](/stacktape-console/connecting-your-aws-account) and allow up to 24 hours for data to propagate.

### Alarms not firing after creating rules

Alarm rules saved in the Console are materialized as CloudWatch alarms on the next deployment of each matching stage. If you create a rule but don't redeploy, the alarm won't exist in AWS yet. Run [`stacktape deploy`](/cli/deploy) for the target stage to activate the alarm.

### Issues page is empty despite errors in logs

Issues must be enabled for your projects and stages in the Console. Redeploy matching stages with CLI 3.8.0 or newer so Stacktape adds the CloudWatch Logs subscription filters for detection. Detection is log-pattern based — it looks for common runtime error markers (Lambda invoke errors, unhandled promise rejections, exceptions, tracebacks, panics, fatal errors, and stack-trace lines) for supported languages: TypeScript/JavaScript, Python, Go, Java, .NET, Ruby, and PHP. Errors that don't match those patterns won't be detected.

### Sidebar items are missing

Some sidebar items are permission-gated. If you don't see a section (for example, Guardrails or Alarms), your role may not include the required permission. See the [permission-gated navigation](#permission-gated-navigation) table above or contact your organization admin.

## Related features

- [Connecting your AWS account](/stacktape-console/connecting-your-aws-account) — required before any deployment
- [Organizations, projects, and stages](/stacktape-console/organizations-projects-and-stages) — how the Console organizes your work
- [Visual config editor](/stacktape-console/visual-config-editor) — interactive editor with IntelliSense
- [API keys](/stacktape-console/api-keys) — authenticate from the CLI and CI/CD
- [Team and access control](/stacktape-console/team-and-access-control) — invite users and manage roles
- [Billing and subscription](/stacktape-console/billing-and-subscription) — subscription details
- [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) — auto-deploy on push
- [Observability overview](/observability/overview) — alarms, issues, and notifications in depth

## FAQ

### Do I need the Console to use Stacktape?

No. [API keys](/stacktape-console/api-keys) let you authenticate with Stacktape from the CLI or CI/CD pipelines, and `stacktape deploy` does the actual deploying. The Console is the management layer on top — it adds team access, cost visibility, alarms, budgets, issues, guardrails, and the visual config editor. Most teams use both: the CLI (directly or via GitOps) for deploying, and the Console for visibility and operational control.

### Does Stacktape deploy into my own AWS account?

Yes. Stacktape uses a cross-account IAM role to manage resources in your AWS account on your behalf, so you never hand over long-lived AWS credentials. Connect more accounts from **AWS Accounts** under the Configuration section. See [Connecting your AWS account](/stacktape-console/connecting-your-aws-account) for the required role.

### Why aren't my alarm rules firing after I created them?

Alarm rules saved in the Console are not live in AWS until the next [`stacktape deploy`](/cli/deploy) of each matching stage — that deploy materializes the CloudWatch alarms and EventBridge routing. If you create a rule but don't redeploy, the alarm doesn't exist in AWS yet. The same applies to stack-scoped budget alerts. This design keeps alerts in sync with your deployed infrastructure.

### Why is the Issues page empty even though there are errors in my logs?

Issues must be enabled for the relevant projects and stages, and matching stages must be redeployed with CLI 3.8.0 or newer so Stacktape adds the CloudWatch Logs subscription filters. Detection is log-pattern based — it supports TypeScript/JavaScript, Python, Go, Java, .NET, Ruby, and PHP, matching markers like Lambda invoke errors, unhandled promise rejections, exceptions, tracebacks, panics, and stack-trace lines. Errors that don't match those patterns won't be detected. See [Issues](/observability/issues).

### How does Stacktape track AWS costs, and why is the Costs page empty?

The Costs page breaks down AWS costs by project and stage, generated daily from AWS Cost and Usage Reports. New data can take up to a day to appear, so an empty page usually means a recently connected [AWS account](/stacktape-console/connecting-your-aws-account) or that reports haven't propagated yet. See [Managing costs](/managing-costs/overview) for budgets and optimization tips.

### Why is a sidebar item missing for me?

The Console uses role-based access control, and several sidebar items are permission-gated. Core routes like Overview, Projects, and Activity are always visible, while items such as Users (`members:view`), Costs (`org:view-billing`), Alarms, Guardrails, Secrets, and SSM Params require specific permissions; the Config editor is also hidden for the Viewer role. If a section is missing, ask your organization's owner or admin to adjust your role. See [Team and access control](/stacktape-console/team-and-access-control).
