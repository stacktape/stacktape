# AWS Permissions Needed

Stacktape connects to your AWS account by creating a CloudFormation stack that provisions a cross-account IAM role. Stacktape assumes this role to perform deployments and read logs and metrics through the connected account. This page explains what that connection grants and how to control it. For the setup flow, see [Connecting your AWS account](/stacktape-console/connecting-your-aws-account).

## Overview

When you connect an AWS account through the Stacktape Console, a CloudFormation stack is created in your AWS account (in the **eu-west-1** region). This stack provisions an IAM role that Stacktape assumes via cross-account `sts:AssumeRole`. The Console connection uses cross-account AssumeRole access through this IAM role.

The connection is **free**. No Stacktape charges apply for connecting an AWS account, and the IAM role itself incurs no AWS cost. You only pay for the AWS resources that Stacktape deploys into your account.

Although the connection stack is created in eu-west-1, your projects and stacks can be deployed to **any** AWS region. The IAM role is a global resource — once created, it works across all regions.

## What Stacktape does in your account

Stacktape uses the assumed role to interact with your AWS account. Based on the Console source, the role is used to:

- **Perform deployments** — deploy and manage infrastructure in your AWS account, including resources such as [Lambda functions](/resources/compute/lambda-function), [containers](/resources/compute/web-service), [databases](/resources/databases/relational-database), and others
- **List logs and metrics** — fetch CloudWatch data for display in the Stacktape Console and CLI ([`stacktape debug:logs`](/cli/debug-logs), [`stacktape debug:metrics`](/cli/debug-metrics))

The connection role is intended to let Stacktape perform deployments and list logs and metrics through the connected AWS account. The exact AWS actions used depend on the Stacktape features and resources you deploy.


> **Info:** The connection is created through a CloudFormation stack in eu-west-1. You can audit the role and its attached policies in AWS using normal CloudFormation and IAM tooling in your account.


## Connection mode

The Stacktape Console creates connected AWS accounts with `connectionMode: 'PRIVILEGED'`. The Console source does not expose the generated IAM policy directly; inspect the CloudFormation connection stack in your AWS account to see the exact permissions granted to the role.

The connection mode is set automatically when you initiate the connection from the Console — there is no mode selection step. The CloudFormation quick-create link that opens in the AWS Console is pre-configured with the correct mode.

## Security model

The cross-account connection follows AWS security best practices for third-party access.

### Cross-account role assumption

Stacktape uses cross-account AssumeRole access through the IAM role created by the CloudFormation stack. Cross-account role assumption is the standard AWS-recommended pattern for granting third-party services access to your account. The CloudFormation stack creates the AWS-side resources used for this access. Inspect the generated stack and IAM role trust policy in your AWS account to see the exact principal and conditions.

### CloudFormation-managed lifecycle

The role is provisioned through a CloudFormation stack, so you can inspect the stack resources in the AWS Console and delete the AWS-side connection resources together by deleting the stack.

## Restricting permissions

If your organization requires tighter controls than what the connection role provides, you have two options.

### AWS Service Control Policies (SCPs)

Apply SCPs at the AWS Organizations level to restrict what any role — including Stacktape's — can do in the account. For example, you can block access to specific regions, prevent deletion of certain resource types, or deny actions on tagged resources. SCPs act as a permissions ceiling regardless of what the role's own policy allows.


> **Warning:** Narrowing permissions via SCPs may prevent certain Stacktape features from working. If a deployment fails with an `AccessDenied` error, check whether an SCP is blocking the required action.


### Separate accounts per stage

The most common approach is to connect separate AWS accounts — a production account with stricter SCPs and a development account with fewer restrictions. This provides blast-radius isolation without limiting developer velocity. Each account gets its own connection and its own IAM role.

## Revoking access

You can revoke Stacktape's access to your AWS account at any time through two paths:

- **Delete the AWS account connection in the Stacktape Console** — the Console provides a delete action for the connected account entry.
- **Delete the CloudFormation connection stack in the AWS Console** — deleting the connection stack in AWS removes the AWS-side IAM role and related resources, preventing Stacktape from assuming credentials for that account.

If you need to fully remove both the Stacktape connection record and the AWS-side IAM resources, use both paths. After removing the connection stack, the connected account may appear in a **BLOCKED** state in the Console (see [Connection states](#connection-states) below).


> **Info:** If a connected AWS account is referenced by GitOps deployment configurations, the Console blocks deletion and lists the projects whose GitOps configurations must be removed first.


## Connection states

Each connected AWS account in the Stacktape Console has one of three states:

| State | Meaning |
|-------|---------|
| **PENDING** | The connection was initiated but the CloudFormation stack has not yet finished creating in your AWS account. The Console polls connected AWS accounts while in this state and reflects the state returned by the backend. PENDING accounts show a "Finish the account connection" link. |
| **ACTIVE** | The connection is established and Stacktape can assume the role. Deployments, logs, metrics, and other operations work normally. |
| **BLOCKED** | The Console has marked the connection unusable and displays the status reason. Re-create the connection to restore access. |

## Auditing Stacktape activity

Use AWS CloudTrail to audit AWS API activity for the IAM role created by the connection stack. You can filter CloudTrail events by the role ARN to see what actions were performed and when. CloudTrail event shape and coverage are standard AWS behavior; consult AWS CloudTrail documentation for details on audit trail configuration and retention in your account.

## Related features

- [Connecting your AWS account](/stacktape-console/connecting-your-aws-account) — the setup walkthrough for establishing a connection
- [Team and access control](/stacktape-console/team-and-access-control) — connecting AWS accounts requires the `org:manage-aws-accounts` permission; users without it see the connect action disabled
- [Managing costs](/managing-costs/overview) — cost features in the Stacktape Console
- [Guardrails](/guardrails/overview) — organization-wide controls that layer on top of AWS permissions

## FAQ

### How does Stacktape access my AWS account?

Stacktape uses cross-account AssumeRole access through an IAM role created by the CloudFormation stack in your AWS account. Cross-account role assumption is the standard AWS-recommended pattern for granting third-party services deployment access. The IAM role lives in your account, and you control its lifecycle.

### Why does Stacktape need broad AWS permissions?

Stacktape deploys infrastructure-as-code through CloudFormation. A typical deployment creates and manages resources across many AWS services — Lambda, ECS, RDS, S3, CloudFront, API Gateway, IAM, VPC, and others. The exact services depend on your configuration. A narrow, service-specific policy would break unpredictably depending on which resources you define. Broad permissions ensure any valid Stacktape configuration deploys without permission errors.

### Is connecting my AWS account free?

Yes. The CloudFormation stack creates an IAM role and supporting resources at no AWS cost for the resources themselves. Stacktape does not charge for the connection. You only pay for the AWS resources that Stacktape deploys into your account (Lambda invocations, ECS tasks, database instances, etc.).

### Can I restrict what Stacktape can do in my account?

Yes. Apply AWS Service Control Policies (SCPs) at the AWS Organizations level to set a permissions ceiling. SCPs restrict what any principal — including Stacktape's role — can do in the account, regardless of the role's own policy. Be aware that overly restrictive SCPs may cause deployment failures if they block actions Stacktape needs.

### What happens to my resources if I revoke access?

Revoking the connection removes Stacktape's ability to assume the connection role. Deployed AWS resources are managed through their own CloudFormation stacks, which are separate from the connection stack. To remove deployed resources, delete the application stacks before or after revoking the connection. Without a valid connection, you can still manage CloudFormation stacks directly in the AWS Console.

### Can Stacktape access other AWS accounts I own?

No. The cross-account role is scoped to the specific AWS account where the connection stack was created. Stacktape can only assume the role in that one account. Each additional AWS account requires its own separate connection setup through the Console.

### How do I audit what Stacktape does in my account?

Enable AWS CloudTrail in your account. You can filter CloudTrail events by the role ARN to see what actions were performed and when. CloudTrail event shape and coverage are standard AWS behavior; refer to AWS CloudTrail documentation for details on audit trail configuration and retention in your account.

### Why is the connection stack created in eu-west-1?

The connection stack provisions global AWS resources (primarily an IAM role). IAM roles are global — once created in any region, they work across all regions. The eu-west-1 requirement is a deployment convention for the connection infrastructure. After the connection is established, your projects deploy to whichever region you specify in your Stacktape configuration.

### Is this the same approach other IaC tools use?

Yes. Cross-account IAM role assumption is the standard AWS-recommended pattern for granting third-party services access to your account. AWS documents this pattern for any service that needs to perform actions in your account on your behalf. The IAM role lives in your account, you control its lifecycle, and you can delete it at any time.

### What permission do I need to connect an AWS account?

In the Stacktape Console, connecting an AWS account requires the `org:manage-aws-accounts` permission within your organization. Users without this permission see the connect action disabled. See [team and access control](/stacktape-console/team-and-access-control) for details on organization permissions. On the AWS side, you need sufficient IAM permissions to create the CloudFormation connection stack in your account.
