# Connecting Your AWS Account

Stacktape deploys infrastructure into your own AWS account using a secure cross-account IAM role. You connect an AWS account once in the Stacktape Console, and Stacktape handles credential management from that point — no manual AWS access keys required. Your projects and stacks can be deployed to any region.

## Overview

The AWS Accounts page (`/aws-accounts`) in the Stacktape Console lets you establish and manage the trust relationship between Stacktape and your AWS accounts. When you connect an account, Stacktape generates a link to an AWS CloudFormation Quick Create Stack page. The CloudFormation stack creates a cross-account IAM role that Stacktape assumes to interact with your AWS account — perform deployments, list logs, fetch metrics, and manage resources on your behalf. Credentials are temporary and short-lived — no permanent AWS access keys are stored or exchanged.

Each connected account appears in a table showing its name, AWS account ID, connection status, creation date, and primary regions. You can connect multiple AWS accounts to a single organization — for example, separate accounts for production and development.

Connecting your account is free. You only pay for the AWS resources that Stacktape deploys into your account. For a detailed breakdown of what permissions the cross-account role includes, see [AWS permissions](/stacktape-console/aws-permissions).

## Walkthrough

You need the `org:manage-aws-accounts` permission in your Stacktape organization to connect an account.

1. **Open the modal** — In the Stacktape Console, open `/aws-accounts` and click **Connect AWS account**.
2. **Name the account** — Enter a label for the connection (e.g. "production" or "dev-account"). This name is for your reference only — the Console pre-fills a default like `aws-account-1`.
3. **Create the connection stack in AWS** — Click **Connect account in AWS console**. This opens the generated AWS connection link in a new tab. The modal shows an image of the AWS-side steps to follow.
4. **Wait for activation** — Return to the Stacktape Console. A newly created connection can appear as PENDING until the AWS CloudFormation stack finishes. While a PENDING account exists, the Console refetches account data every two seconds. When the backend returns the account as ACTIVE, the table shows ACTIVE.

> **Warning:** The connection CloudFormation stack must be created in the **eu-west-1** region. The Console opens a generated AWS link that targets the correct region. Your projects and stacks can be deployed to **any** region.

The connection modal contains two steps: an account name input field (Step 1) and an image illustrating the AWS-side steps to follow when creating the CloudFormation connection stack (Step 2).

## Connection States

Each connected AWS account has one of three states:

| State | Meaning | Action needed |
|-------|---------|---------------|
| **ACTIVE** (green) | Connection is working. Stacktape can deploy to this account. | None. |
| **PENDING** (orange) | The connection link was generated but the CloudFormation stack hasn't finished creating. | Use the "Finish the account connection" link shown in the Note column to complete stack creation in AWS. |
| **BLOCKED** (red) | The connection failed or was revoked. The status reason explains why. | Check the status reason in the Note column, fix the issue in AWS, and reconnect if needed. |

While a PENDING account exists on the AWS Accounts page, the Console refetches account data every two seconds. When the backend returns the account as ACTIVE, the table shows ACTIVE.

## Common Tasks

### Connecting multiple AWS accounts

Organizations commonly connect separate AWS accounts for different purposes — a production account with stricter controls and a development account for experimentation. Click **Connect AWS account** again and repeat the walkthrough for each additional account. Each connection is created through its own generated AWS CloudFormation flow.

### Revoking access

You can revoke Stacktape's access to your AWS account in two ways:

- **Delete the AWS account connection in the Stacktape Console** — removes the connection from Stacktape's side.
- **Delete the CloudFormation connection stack in the AWS Console** — removes the IAM role from your AWS account. If Stacktape later reports the connection as BLOCKED, check the status reason in the Note column.

### Checking which regions an account uses

The AWS Accounts table shows **Primary regions** for each connected account. The table displays the account's primary regions when checked, or "not checked" if regions haven't been evaluated yet. The connection modal also states that projects and stacks can be deployed to any region.

## Troubleshooting

### Account stuck in PENDING

If your account remains in PENDING state:

1. Use the **Finish the account connection** link in the Note column to reopen the generated AWS CloudFormation flow. If AWS reports a stack creation failure, inspect the failure in the AWS CloudFormation console.
2. Verify the stack is being created in the **eu-west-1** region — the Console's generated link targets the correct region automatically.
3. Users with the `org:manage-aws-accounts` permission see a delete control on connected-account rows. If you cannot complete the AWS-side stack, delete the account entry and start a new connection.

### Cannot delete a connected AWS account

Stacktape prevents deletion when projects reference the account in their GitOps deployment configurations. The error message lists the affected projects. Delete the GitOps deployment configurations from the listed projects, then retry the deletion.

### Account shows BLOCKED

A BLOCKED state means the connection is no longer usable. Read the status reason in the Note column — for example, the IAM role may have been modified or removed. Fix the underlying issue in AWS. You can remove the Stacktape-side connection from the table if you need to recreate it.

### "You do not have permission to manage AWS accounts"

This action requires the `org:manage-aws-accounts` permission. Ask your organization owner or admin to grant you the appropriate role. See [Team and access control](/stacktape-console/team-and-access-control) for details.

## Related Features

- [AWS permissions](/stacktape-console/aws-permissions) — details on what the cross-account role can do
- [Organizations, projects, and stages](/stacktape-console/organizations-projects-and-stages) — how connected accounts relate to your project structure
- [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) — auto-deploy to connected accounts on push
- [Deploy your first stage](/getting-started/deploy-your-first-stage) — uses a connected account to run your first deployment

## FAQ

### Do I need to create AWS access keys for Stacktape?

No. Stacktape uses cross-account IAM role assumption, not static access keys. The connection CloudFormation stack creates an IAM role that Stacktape assumes with temporary credentials. You never need to generate, rotate, or store AWS access keys for Stacktape to work.

### Can I deploy to any AWS region after connecting?

Yes. The connection stack must be created in `eu-west-1`, but that only controls where the connection CloudFormation stack is created. Your projects and stacks can be deployed to any region.

### Is connecting my AWS account free?

Connecting the account is free. You pay only for the AWS resources that Stacktape later deploys into your account.

### How should I organize AWS accounts across Stacktape organizations?

Connected AWS accounts are stored per Stacktape organization. If you need stronger isolation, connect separate AWS accounts and choose the appropriate account in your deployment setup.

### What happens if I delete the CloudFormation connection stack in AWS?

Deleting the CloudFormation connection stack in AWS removes the IAM role, which revokes Stacktape's access. Deployments to that account stop working. If Stacktape reports the connection as BLOCKED, check the status reason in the Note column. You can remove the connection from the AWS Accounts table and create a new connection to restore access.

### How do I revoke Stacktape's access to my AWS account?

You can revoke access by deleting the AWS account connection in the Stacktape Console or by deleting the CloudFormation connection stack in the AWS Console. Both are documented revocation paths.

### What is the `org:manage-aws-accounts` permission?

The Console uses `org:manage-aws-accounts` to enable the **Connect AWS account** button and the delete control on connected-account rows. If the button is disabled, you do not currently have the required organization permission. See [Team and access control](/stacktape-console/team-and-access-control) for organization access management.

### What does the PENDING state mean?

PENDING means the connection link was generated in Stacktape but the CloudFormation stack in AWS has not yet completed. While a PENDING account exists on the AWS Accounts page, the Console refetches account data every two seconds. When the backend returns the account as ACTIVE, the table shows ACTIVE. If the account stays PENDING, use the "Finish the account connection" link in the Note column to complete the stack creation in AWS.

### How does cross-account AssumeRole work?

AWS cross-account AssumeRole is a standard AWS mechanism where one AWS account is granted permission to temporarily assume an IAM role in another AWS account. The role defines what actions are allowed. Stacktape uses the assumed role to interact with your AWS account — you do not need to manage AWS credentials manually. Under standard AWS AssumeRole mechanics, credentials are temporary — no permanent credentials are stored or shared. This is the most commonly used approach for secure third-party AWS access.

### Can I restrict what Stacktape can do in my account?

The Console creates the connection with `connectionMode: 'PRIVILEGED'`. See [AWS permissions](/stacktape-console/aws-permissions) for the full list of permissions the role includes and guidance on the operational impact of restricting them.
