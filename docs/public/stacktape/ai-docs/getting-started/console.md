---
docType: getting-started
title: Console
tags:
  - console
  - getting-started
source: docs/_curated-docs/getting-started/console.mdx
priority: 2
---

# Console

The Stacktape Console is a web-based interface for managing your infrastructure. It complements the CLI with visual tools for deployments, monitoring, and team collaboration.

**URL:** [console.stacktape.com](https://console.stacktape.com)

## Key Features

### GitOps Deployments

Connect your GitHub, GitLab, or Bitbucket repository and deploy automatically:

- **Push-to-deploy**: Automatically deploy when you push to a branch
- **Preview environments**: Create temporary environments for pull requests
- **PR comments**: Deployment status and links posted directly to your PRs

`[IMAGE PLACEHOLDER: console-gitops-setup]`

### Live Deployment Logs

Watch your deployments in real-time with streaming logs from AWS CodeBuild or EC2 runners.

`[IMAGE PLACEHOLDER: console-deployment-logs]`

### Logs Browser

Browse and search CloudWatch logs with an intuitive interface:

- Filter by time range
- Search with patterns
- Live tail for real-time debugging

`[IMAGE PLACEHOLDER: console-logs-browser]`

### Metrics Dashboard

Visualize metrics for all your resources:

- Lambda invocations, duration, errors
- ECS CPU and memory utilization
- RDS connections, IOPS, latency
- API Gateway requests and latency
- And more...

`[IMAGE PLACEHOLDER: console-metrics-dashboard]`

### Cost Management

Track AWS spending across all your stacks:

- Per-stack cost breakdown
- Monthly trends and comparisons
- Service-level cost attribution
- Multi-account aggregation

`[IMAGE PLACEHOLDER: console-costs-page]`

### S3 File Browser

Browse, upload, and manage files in your S3 buckets directly from the console:

- Folder navigation
- File upload and download
- In-browser text editor
- Delete operations

`[IMAGE PLACEHOLDER: console-s3-browser]`

### Remote Sessions

Open a terminal inside your running containers without SSH keys:

- Secure SSM-based connections
- No port exposure required
- Works with private containers

`[IMAGE PLACEHOLDER: console-remote-session]`

### Secrets Management

Create and manage secrets stored in AWS Secrets Manager:

- Create, view, and delete secrets
- Works across all connected AWS accounts
- Reference secrets in your configurations with `$Secret('name')`

`[IMAGE PLACEHOLDER: console-secrets-manager]`

### Monitoring & Alarms

Set up alerts for your infrastructure:

- Lambda error rate thresholds
- Database CPU and storage alerts
- API latency warnings
- Notifications via Slack, Teams, or email

## Getting Started with the Console

### Step 1: Create an Account

Visit [console.stacktape.com](https://console.stacktape.com) and sign up with:

- Email and password
- GitHub OAuth
- Google OAuth

### Step 2: Connect Your AWS Account

The console needs access to your AWS account to deploy and manage resources.

1. Go to **Settings** → **AWS Accounts**
2. Click **Connect AWS Account**
3. You'll be redirected to AWS to create a CloudFormation stack
4. This stack creates:
   - An IAM role for Stacktape to assume
   - An S3 bucket for cost reports
5. Wait about 1 minute for the stack to complete
6. Your account shows as "Active"

`[IMAGE PLACEHOLDER: console-aws-account-connection]`

### Step 3: Create Your First Project

1. Click **New Project**
2. Choose your deployment source:
   - **From Git repository**: Connect to GitHub, GitLab, or Bitbucket
   - **From template**: Start with a pre-built example
3. Configure your project settings:
   - Project name
   - Default stage and region
   - Build settings

### Step 4: Deploy

For Git-connected projects:

1. Push code to your repository
2. The console automatically detects changes
3. Watch the deployment progress in real-time

Or trigger a manual deployment from the console.

## Console vs CLI

Both tools deploy to the same infrastructure. Choose based on your workflow:

| Feature                   | CLI                | Console     |
| ------------------------- | ------------------ | ----------- |
| Local development         | ✅                 | ❌          |
| GitOps/CI-CD              | Via GitHub Actions | ✅ Built-in |
| Log browsing              | Basic              | ✅ Advanced |
| Metrics visualization     | ❌                 | ✅          |
| Cost tracking             | ❌                 | ✅          |
| Team collaboration        | ❌                 | ✅          |
| S3 file management        | ❌                 | ✅          |
| Remote container sessions | ✅                 | ✅          |

**Typical workflow:**

- Use the **CLI** for local development and quick iterations
- Use the **Console** for production deployments, monitoring, and team collaboration

## Pricing

The Stacktape CLI is **free and open source**. The Console has the following tiers:

| Feature              | Free      | Flexible  | Enterprise                   |
| -------------------- | --------- | --------- | ---------------------------- |
| CLI deployments      | ✅        | ✅        | ✅                           |
| Console deployments  | Limited   | ✅        | ✅                           |
| GitOps               | ❌        | ✅        | ✅                           |
| Preview environments | ❌        | ✅        | ✅                           |
| Logs browser         | Limited   | ✅        | ✅                           |
| Metrics              | Limited   | ✅        | ✅                           |
| Cost tracking        | ❌        | ✅        | ✅                           |
| Team members         | 1         | Unlimited | Unlimited                    |
| Support              | Community | Standard  | Premium (8-min avg response) |

See [stacktape.com/pricing](https://stacktape.com/pricing) for current pricing.

## Team Collaboration

### Invite Team Members

1. Go to **Settings** → **Team**
2. Click **Invite Member**
3. Enter their email address
4. Choose a role:
   - **Owner**: Full access, billing management
   - **Admin**: Full access, no billing
   - **Member**: Deploy and view access

### Multi-Factor Authentication

Enable MFA for additional security:

1. Go to your profile settings
2. Enable MFA
3. Choose TOTP (authenticator app) or SMS

## API Keys

Generate API keys for programmatic access:

```bash
# Set your API key for CLI authentication
stacktape login --apiKey YOUR_API_KEY
```

Or use in CI/CD environments:

```bash
export STACKTAPE_API_KEY=your-api-key
stacktape deploy --stage production --region us-east-1
```

## Next steps

- [Intro](/getting-started/intro) - Get started with Stacktape
- [Workflow](/getting-started/workflow) - Understand the development workflow
- [Dev Mode](/getting-started/dev-mode) - Local development
