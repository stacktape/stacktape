# GitOps with Console

Stacktape Console can automatically deploy your stack whenever you push to a branch or open a pull request. You connect GitHub via the Stacktape GitHub App, map branches to stages, and every matching push triggers a deployment on your AWS account — no CI pipeline to maintain. PR preview environments get their own isolated stage and can be automatically torn down when the PR closes.

## When to use

GitOps with Console is the fastest path from "code pushed" to "stack deployed" for most teams. Use it when:

- You want push-to-deploy without writing CI/CD pipeline files. The Console stores your GitOps configurations and the GitHub App handler reacts to matching GitHub events by starting deployments.
- You need per-PR preview environments so reviewers can test changes against a real stack before merging.
- You want a managed deployment flow triggered directly from Git events without maintaining pipeline configuration.

## When NOT to use

GitOps with Console triggers a deployment for every matching Git event. If your workflow requires custom build steps, test suites, approval gates, or multi-step pipelines before deploying, use [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) instead. You can call Stacktape CLI commands as steps inside any CI/CD pipeline. See the [CI/CD overview](/ci-cd-and-gitops/overview) for a comparison of all options.

If you only need to deploy occasionally or manually, running [`stacktape deploy`](/cli/deploy) from the CLI or a one-off CI job is simpler than setting up GitOps.

## Prerequisites

Before creating a GitOps configuration, you need:

1. **The Stacktape GitHub App connected to your repository.** The GitHub App handler receives webhook events from GitHub and starts deployments. The GitOps page derives repository owner and repository name from the project's Git URL. Connect the GitHub App through the [Stacktape Console](/stacktape-console/console-overview).
2. **A connected AWS account.** Each GitOps configuration deploys to a specific [AWS account and region](/stacktape-console/connecting-your-aws-account). You must have at least one AWS account connected before creating deployment rules.
3. **A deployable Stacktape project.** The repository must be deployable by Stacktape — the GitHub App handler starts a deployment using the project's configuration.

## Push-to-deploy

Push-to-deploy is the most common GitOps pattern. Every push to a specified branch triggers a deployment to a fixed stage name. This is how most teams set up continuous deployment for staging and production environments.

### Setting up push-to-deploy

On the GitOps screen, click **New GitOps configuration** to open the creation modal. Saved configurations appear in a list showing their deployment trigger (either **Push to Branch** or **PR Opened**), branch, stage name, AWS region, and connected AWS account.

You can create multiple push-to-deploy configurations for the same project — for example, `main` → `prod` and `develop` → `staging`, each targeting different AWS accounts or regions.

### Multiple configurations per branch

When the handler receives multiple deployment configurations from `getActionsToPerform`, it starts them through `Promise.all`. If you have two configurations watching `main` that deploy to different regions or accounts, both deployments are started concurrently. This is useful for multi-region setups where a single merge to `main` deploys to both `us-east-1` and `eu-west-1`.

## PR preview environments

PR preview environments give every pull request its own isolated stage. Reviewers can test the exact changes in a real AWS environment before merging — no shared staging environment, no merge conflicts on a review stage.

### Setting up PR previews

PR preview configurations are created from the GitOps page using the **PR Opened** trigger. When a PR is opened against the configured branch, the handler starts a deployment to a new stage. In the Console's configuration list, the stage name column shows `pr-{#number}` as a placeholder when no explicit stage name is set.

The GitHub App handler also creates a temporary internal configuration that watches for subsequent pushes to the PR branch, so the preview stays current with the latest code. This temporary configuration is filtered out of the GitOps configuration list in the Console — you only see the configurations you explicitly created.

### Auto-delete on PR close

When configuring PR previews, you can enable deletion of the preview stack after the PR is merged or closed. When this option is set and the GitHub App receives a PR close event, the handler starts a stack deletion on the preview stage. This prevents preview stages from accumulating and incurring ongoing AWS costs.

When auto-delete is not enabled, the handler does not start deletion on PR close. You would need to remove the stage separately using [`stacktape delete`](/cli/delete). Enable auto-delete unless you have a specific reason to keep preview stages around after merge (e.g. post-merge QA).


> **Tip:** For a deeper look at the per-PR stage pattern — including naming conventions, cost management, and cleanup strategies — see [Stacks per Git branch pattern](/ci-cd-and-gitops/stacks-per-git-branch-pattern).


## Build runners

GitOps deployments run through Stacktape's deployment execution infrastructure. For runner types, configuration, compute sizing, and cost tradeoffs, see [Build runners](/ci-cd-and-gitops/build-runners).

## Webhook flow

Understanding the event flow helps with debugging when a push doesn't trigger a deployment.


## Flow
1. **Git push or PR event**: GitHub sends a webhook to the Stacktape GitHub App handler.
2. **Event matching**: The handler calls getActionsToPerform to determine deployment and deletion actions for the incoming GitHub event. A single event can yield multiple actions.
3. **Deployment or deletion started**: For each matching configuration, the handler starts a deployment. For PR close events where auto-delete is enabled, it starts a stack deletion instead.
4. **PR bookkeeping**: On PR open: creates a temporary configuration for pushes to the PR branch. On PR close: removes the temporary configuration.


The handler processes all matching configurations through `Promise.all`. PR bookkeeping errors and PR-close deletion errors are captured individually and summarized in the response. The deployment start call is not wrapped in that same per-action error handler in the GitHub App handler source.


> **Info:** The GitHub App handler also processes `workflow_job` events for [self-hosted GitHub Actions runners](/ci-cd-and-gitops/self-hosted-github-actions-runners). These events are handled separately from GitOps deployment triggers.


## Managing configurations

The GitOps page in the Console lists all active configurations for a project. Each row shows:

| Column | Description |
|--------|-------------|
| **Deployment trigger** | Either **Push to Branch** or **PR Opened**. |
| **From branch** | The branch being watched. |
| **Stage name** | The target stage name, or `pr-{#number}` for PR preview configurations. |
| **Region** | The AWS region for deployments. |
| **AWS Account** | The connected AWS account (name and account ID). |

From this page you can create new configurations and delete existing ones.


> **Warning:** Deleting a GitOps configuration removes that auto-deployment rule from the list. It does not affect any currently deployed stages — those continue running independently. To remove a deployed stage, use [`stacktape delete`](/cli/delete).


## Typical setup

A common multi-environment GitOps setup for a single project:

| Configuration | Trigger | Branch | Stage | Purpose |
|---------------|---------|--------|-------|---------|
| Production | Push to Branch | `main` | `prod` | Deploys on every merge to main |
| Staging | Push to Branch | `develop` | `staging` | Deploys on every push to develop |
| PR Previews | PR Opened | `main` | `pr-{#number}` | Creates a preview for every PR targeting main, auto-deletes on close |

This gives you continuous deployment to staging on every push, production deployment on merge to main, and isolated preview environments for every PR — all without a single pipeline file.

## FAQ

### How is GitOps with Console different from custom CI/CD?

GitOps with Console is a managed deployment flow: you configure triggers in the Console and the GitHub App handler reacts to matching Git events by starting deployments on your build runner — no pipeline files in your repo. [Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) means you write your own pipeline (GitHub Actions, GitLab CI, etc.) and call Stacktape CLI commands as steps, giving you full control over build steps, test suites, and approval gates. GitOps with Console is faster to set up but does not support pre-deployment testing or approval workflows; if you need those, use custom CI/CD.

### Can I run tests before deploying with GitOps?

No — GitOps with Console deploys on every matching Git event and has no built-in test or approval step. If you need to run tests, linting, or other checks first, use [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) where you control every pipeline step. Alternatively, run tests in GitHub's native CI and use branch protection rules so broken code never reaches the branch that triggers a GitOps deployment.

### How are PR preview environments cleaned up?

When creating a PR preview configuration, enable auto-deletion on PR close. With it enabled, the handler starts a stack deletion as soon as the PR is closed or merged, and the temporary internal configuration that keeps the preview current with pushes is removed automatically. If you do not enable auto-delete, preview stages keep running (and incurring AWS cost) until you remove them manually with [`stacktape delete`](/cli/delete). See [Stacks per Git branch pattern](/ci-cd-and-gitops/stacks-per-git-branch-pattern) for more cleanup strategies.

### Can a single push deploy to multiple accounts or regions?

Yes. For each incoming event the handler starts a deployment for every matching configuration concurrently (via `Promise.all`). Each configuration targets a specific connected AWS account and region, so you can have two configurations watching `main` — one deploying to `us-east-1` and another to `eu-west-1`, or to entirely separate accounts — and a single merge to `main` starts both deployments at once.

### How much does it cost to run GitOps deployments?

GitOps deployments run on Stacktape's build runners — see [Build runners](/ci-cd-and-gitops/build-runners) for the runner types, compute sizing, and their cost tradeoffs. Beyond the runner cost, PR preview environments also incur the AWS cost of whatever resources each preview stack provisions, and that cost continues until the stage is deleted — another reason to enable auto-delete on PR close.

### A push isn't triggering a deployment — what should I check?

Confirm the Stacktape GitHub App is installed on the repository (the handler only receives webhooks for installed repos), that the project's Git URL is set in the Console so the GitOps page can derive the repo owner and branches, and that you have a GitOps configuration whose watched branch matches the branch you pushed to. The handler matches incoming events against your configurations to decide what to deploy — if nothing matches, nothing happens.
