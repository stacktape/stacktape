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

### What is GitOps and how does it work?

GitOps is a deployment model where Git is the single source of truth for what gets deployed. When you push code to a branch, an automated system detects the change and triggers a deployment. With Stacktape Console, the Stacktape GitHub App handler receives webhook events from GitHub and starts deployments to your AWS account based on the GitOps configurations you define — no pipeline files needed in your repository.

### How do GitHub webhooks trigger CI/CD pipelines?

GitHub sends HTTP POST requests (webhooks) to a registered endpoint whenever events occur in a repository — pushes, PR opens, PR closes, and more. The Stacktape GitHub App handler receives these webhook events, matches them against your GitOps configurations using `getActionsToPerform`, and starts deployments or deletions for each matching configuration. A single webhook event can trigger multiple concurrent actions if multiple configurations match.

### How do PR preview environments get cleaned up?

When you create a PR preview configuration, you can enable auto-deletion on PR close. When enabled, the handler starts a stack deletion as soon as the PR is closed or merged. The temporary internal configuration that watches for pushes to the PR branch is also cleaned up automatically. Enable auto-delete to avoid accumulating unused AWS resources. See [Stacks per Git branch pattern](/ci-cd-and-gitops/stacks-per-git-branch-pattern) for more cleanup strategies.

### What happens if a GitOps action fails?

The GitHub App handler processes matching configurations through `Promise.all`. PR bookkeeping errors and PR-close deletion errors are captured individually — the handler response reports whether action processing failed (e.g. `Failed to process N actions`). The deployment start call is not wrapped in that same per-action error handler, so a deployment-start failure surfaces separately.

### How much does AWS CodeBuild cost for deployments?

AWS CodeBuild pricing is based on build minutes and compute type. The AWS free tier includes 100 build minutes per month on the smallest instance type. Beyond that, pricing varies by compute type and region. Deployment duration depends on stack complexity and packaging mode. See [Build runners](/ci-cd-and-gitops/build-runners) for runner type comparison.

### Can I deploy to multiple AWS accounts from the same repository?

Yes. Each GitOps configuration targets a specific connected AWS account and region. You can create multiple configurations for the same branch deploying to different accounts — for example, `main` → `prod` on your production AWS account and `main` → `staging` on a separate staging account. Each configuration is independent.

### How is GitOps with Console different from custom CI/CD?

GitOps with Console is a managed deployment pipeline. You configure triggers in the Console and the GitHub App handler reacts to matching events by starting deployments on your build runner. [Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) means you write your own pipeline files (GitHub Actions, GitLab CI, etc.) and call Stacktape CLI commands as steps. Custom CI/CD gives you full control over build steps, test suites, and approval gates. GitOps with Console is faster to set up but does not support pre-deployment testing or approval workflows.

### Can I run tests before deploying with GitOps?

GitOps with Console does not include a built-in test step. If you need to run tests, linting, or other checks before deploying, use [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) where you control every pipeline step. Alternatively, use GitHub's native CI for testing and rely on branch protection rules to prevent merging broken code into the branch that triggers GitOps deployment.

### When should I use GitOps with Console vs GitHub Actions?

Use GitOps with Console when you want zero-config push-to-deploy and PR previews without maintaining pipeline files. Use [GitHub Actions with custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) when you need pre-deployment test suites, approval gates, matrix builds, or multi-step workflows. GitHub Actions gives full pipeline control; GitOps with Console gives the fastest path from push to deployment with no pipeline maintenance. You can also use [Stacktape-managed GitHub Actions runners](/ci-cd-and-gitops/self-hosted-github-actions-runners) for cost-effective runner infrastructure if you go the GitHub Actions route.

### How does push-based GitOps compare to pull-based GitOps?

Stacktape Console uses push-based GitOps: GitHub sends a webhook on push, and the handler starts a deployment immediately. Pull-based GitOps (used by tools like ArgoCD or Flux) has an agent that periodically polls a Git repository for changes and reconciles the desired state. Push-based is simpler and lower-latency for most web application deployments. Pull-based suits Kubernetes-native workflows where continuous reconciliation and drift detection are priorities.

### Do I need to install anything in my repository to use GitOps?

GitOps is configured entirely in the Console rather than through pipeline files in your repository. The GitHub App handler receives webhook events from GitHub for repositories where the app is installed. Your repository must be deployable by Stacktape, and the project's Git URL must be set in the Console so the GitOps page can derive the repository owner and branches.

### Can a single push trigger multiple deployments?

Yes. The GitHub App handler calls `getActionsToPerform` for each incoming event and starts a deployment for every returned configuration through `Promise.all`. For example, if you have two configurations watching `main` — one deploying to `us-east-1` and another to `eu-west-1` — a single push to `main` starts both deployments concurrently.
