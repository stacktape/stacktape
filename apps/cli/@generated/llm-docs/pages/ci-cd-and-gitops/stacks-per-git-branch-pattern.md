# Stacks per Git Branch Pattern

The stacks-per-branch pattern maps git branches and pull requests to Stacktape stages so each line of development gets its own deployed infrastructure. By deriving the stage name from a branch or PR number, teams get isolated environments for production, staging, PR reviews, and feature development — with automated lifecycle management through [GitOps](/ci-cd-and-gitops/gitops-with-console) or [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) pipelines.

## How the pattern works

A Stacktape deployment is identified by a combination of project name, stage name, AWS account, and AWS region. Within the same project, AWS account, and region, the stage name (e.g. `prod`, `staging`, `pr-42`) separates one deployed stack from another. By deriving the stage name from a git branch or PR number, you get a 1:1 mapping between code branches and live infrastructure.

The pattern has three common shapes:

| Shape | Git event | Stage name | Lifecycle |
|-------|-----------|-----------|-----------|
| **Long-lived branches** | Push to `main`, `develop` | Fixed name like `prod`, `staging` | Permanent — updated on every push |
| **PR previews** | PR opened against `main` | `pr-{number}` (e.g. `pr-42`) | Ephemeral — cleaned up when the PR closes |
| **Feature branches** | Push to `feat/auth` | Short name like `auth` | Medium-lived — destroyed when feature merges |

All three shapes use the same underlying mechanism: deploy with a derived `--stage` value. The differences are how you derive the name, how long the stage lives, and how cleanup happens.

## Long-lived branch stages

Long-lived branch stages are the backbone of most deployment setups. They map permanent branches to permanent stages that are updated on every push.

A typical mapping:

| Branch | Stage | Purpose |
|--------|-------|---------|
| `main` | `prod` | Production — receives code after merge |
| `develop` | `staging` | Pre-production integration and QA |
| `release-v2` | `release` | Release candidate testing |

The stage name does not have to match the branch name. Most teams use short, meaningful names (`prod`, `staging`) rather than the literal branch name. The mapping is configured either in the [Stacktape Console's GitOps settings](/ci-cd-and-gitops/gitops-with-console) or in your [custom CI/CD pipeline](/ci-cd-and-gitops/custom-ci-cd). The GitHub App handler matches configurations by the stored branch value from the event. For pattern-based branch routing, use [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) where you control the branch-matching logic.

### Setting up with GitOps

The [GitOps page](/ci-cd-and-gitops/gitops-with-console) in the Stacktape Console lists configurations by deployment trigger, branch, stage name, AWS region, and AWS account, with a **New GitOps configuration** action for adding entries. Existing configurations use one of two deployment triggers — **PR Opened** or **Push to Branch**. For Push to Branch configurations, the handler requires a branch ref and a commit SHA, so branch-deletion events and pushes missing a commit SHA are ignored.


> **Info:** The managed GitOps flow shown here is implemented through the GitHub App integration. For GitLab, Bitbucket, and other providers, use [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) for this pattern.


### Setting up with custom CI/CD

In your pipeline file, derive the stage name from the branch or use a static mapping. For most pipelines, the branch name is available as an environment variable.

GitHub Actions example deploying `main` to `prod` (see [`deploy` CLI reference](/cli/deploy) for full syntax):

```bash
npx stacktape deploy --stage prod --region eu-west-1
```

Or dynamically from the branch:

```bash
npx stacktape deploy --stage "${GITHUB_REF_NAME}" --region eu-west-1
```

Stacktape [build runners](/ci-cd-and-gitops/build-runners) include CodeBuild-based and EC2-based options for running deployments from your custom pipeline. See [Build Runners](/ci-cd-and-gitops/build-runners) for the detailed tradeoffs.


> **Warning:** When using the branch name directly as the stage name, sanitize it first. Branch names can be long and include separators such as `/`. Use a short normalized identifier, because stage names are passed into deployment operations and may appear in generated AWS names.


## PR preview environments

PR previews give every pull request a dedicated stage. Reviewers test changes against real AWS resources before merging — no shared staging environment, no risk of one PR overwriting another's state.

### How PR previews work with GitOps

When you configure a **PR Opened** trigger in the Console's GitOps settings, the GitHub App handler automates the preview lifecycle:

1. **PR opened** — The handler starts a deployment to stage `pr-{number}` (e.g. `pr-42`). For preview deployments, the GitHub App creates a comment on the PR with pending deployment details.
2. **Temporary configuration** — A temporary GitOps configuration is created for the PR branch, linking it to the `pr-{number}` stage. The temporary configuration stores the `deleteStackAfterPrClose` preference and is removed by the PR cleanup flow.
3. **PR closed or merged** — On PR close, the handler finds temporary PR configurations by branch and PR number. The `startDeletion` utility orchestrates a Stacktape delete operation, and `deleteGitConfigurationForPR` removes the temporary GitOps configuration.

For preview deployments and deletions, if orchestration fails after a PR number is available, the handler attempts to update the PR comment with failure details.


> **Info:** For PR Opened events, the handler derives the preview stage as `pr-{number}` — for example, PR #42 deploys to stage `pr-42`. For PR Opened configurations, the Console shows `pr-{#number}` as the stage placeholder when no fixed stage is stored.


### How PR previews work with custom CI/CD

In custom pipelines, you control the naming and lifecycle explicitly. Most CI systems expose the PR number as an environment variable.

Deploy on PR open (GitHub Actions — see [`deploy` CLI reference](/cli/deploy)):

```bash
npx stacktape deploy --stage "pr-${{ github.event.pull_request.number }}" --region eu-west-1
```

Deploy on merge request open (GitLab CI):

```bash
npx stacktape deploy --stage "pr-${CI_MERGE_REQUEST_IID}" --region eu-west-1
```

Delete on PR close (GitHub Actions — add as a separate job triggered on PR close; see [`delete` CLI reference](/cli/delete)):

```bash
npx stacktape delete --stage "pr-${{ github.event.pull_request.number }}" --region eu-west-1
```

Delete on merge request close (GitLab CI):

```bash
npx stacktape delete --stage "pr-${CI_MERGE_REQUEST_IID}" --region eu-west-1
```

When using Stacktape [build runners](/ci-cd-and-gitops/build-runners) in your custom pipeline, you can choose between CodeBuild-managed runners and EC2 self-hosted runners — see [Build Runners](/ci-cd-and-gitops/build-runners) for details on choosing between them.

### Auto-delete on PR close

Temporary PR GitOps configurations store a `deleteStackAfterPrClose` value. On PR close, the handler finds temporary PR configurations by branch and PR number. The provided utilities include `startDeletion`, which orchestrates a Stacktape delete operation, and `deleteGitConfigurationForPR`, which removes the temporary GitOps configuration. Configure `deleteStackAfterPrClose` through the Console GitOps page or a custom CI delete step so preview stages don't sit idle running databases, load balancers, or container workloads after the PR is closed.

Disable auto-delete only when you have a specific reason to keep preview stages alive after merge, such as:

- Post-merge QA validation that runs against the deployed preview
- Debugging a deployment issue after the PR was merged
- Compliance workflows that require a frozen snapshot

You can always remove a preview stage manually with [`stacktape delete`](/cli/delete) regardless of the `deleteStackAfterPrClose` setting.

### GitLab and other Git providers

The managed GitOps flow is implemented through the GitHub App integration. For GitLab, Bitbucket, and other Git providers, use [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) to implement the same stacks-per-branch pattern. Implement the same deploy and delete steps in your custom CI/CD pipeline and substitute the provider-specific branch or PR variables used by your CI system.

| Provider | PR/MR number variable | Branch name variable |
|----------|----------------------|---------------------|
| GitHub Actions | `${{ github.event.pull_request.number }}` | `${{ github.ref_name }}` |
| GitLab CI | `$CI_MERGE_REQUEST_IID` | `$CI_COMMIT_BRANCH` |
| Bitbucket Pipelines | `$BITBUCKET_PR_ID` | `$BITBUCKET_BRANCH` |

## Feature branch stages

Feature branch stages sit between long-lived stages and PR previews. They're deployed from a named branch (e.g. `feat/payments`) and live until the feature merges or is abandoned.

Feature branch stages are often deployed explicitly when you need a live environment for a long-running feature, but they can also be automated with a Push to Branch GitOps configuration targeting that specific branch, or a custom CI pipeline triggered on push. Unlike long-lived stages, they're torn down once the feature ships.

Deploy a feature branch stage:

```bash
npx stacktape deploy --stage payments --region eu-west-1
```

Clean up when the feature ships:

```bash
npx stacktape delete --stage payments --region eu-west-1
```

Feature branches are most useful when:

- A feature takes weeks and needs a stable test environment beyond [dev mode](/local-development/dev-mode-overview)
- Multiple team members collaborate on the feature and need a shared environment
- The feature requires integration testing against third-party services that need real endpoints

For short-lived features (a day or two), PR previews are simpler because cleanup is automated.

## Stage naming best practices

Keep generated stage names short and stable, especially for PR previews. Stacktape passes the stage name into deployment operations. Stage names commonly become part of deployed-resource identification and can interact with AWS naming limits, so long or complex stage names increase the risk of hitting those limits.

### Recommended naming patterns

| Pattern | Convention | Examples |
|---------|-----------|----------|
| Production | `prod` | — |
| Staging | `staging` | — |
| PR previews | `pr-{number}` | `pr-42`, `pr-137` |
| Feature branches | Short feature name | `auth`, `payments` |
| Developer personal | Developer initials or short name | `mc`, `dev-mc` |


> **Warning:** Avoid using the full branch name as the stage name. Branch names can be long and include separators such as `/` that may cause issues in generated AWS resource names. Extract a short identifier instead.


## Cost management

Deploying to a stage runs a Stacktape deploy operation for the selected project, stage, AWS account, and AWS region. Resources defined in your configuration can incur AWS costs for each deployed stage. PR previews and feature branches incur real AWS costs proportional to the resources they contain.

### Strategies to control costs

**Right-size preview resources.** Use [stage-specific configuration](/configuration/stages-and-environments) to give preview stages smaller database instances, lower container counts, or fewer replicas than production.

**Auto-delete PR previews.** Configure `deleteStackAfterPrClose` in the PR preview GitOps configuration, or add a deletion step in your custom CI pipeline. Stale previews running unused databases or containers are the most common source of unexpected bills.

**Use serverless resources in previews.** [Lambda functions](/resources/compute/lambda-function) and [DynamoDB tables](/resources/databases/dynamodb) have pay-per-use pricing with generous free tiers. A preview stage with only serverless resources costs nearly nothing when idle. [Container workloads](/resources/compute/web-service) and [relational databases](/resources/databases/relational-database) incur costs whether traffic is flowing or not.

**Set budget alerts.** Configure [budgets](/managing-costs/budgets) to notify your team when spend exceeds a threshold. This catches runaway costs from forgotten stages.

**Audit regularly.** Use [`stacktape info:stacks`](/cli/info-stacks) to list all deployed stages and identify stale ones that should be deleted.

## Cleanup strategies

Stale stages are the primary risk of the stacks-per-branch pattern. A forgotten feature branch stage running a database instance costs money every hour.

| Strategy | How | Best for |
|----------|-----|----------|
| **GitOps cleanup** | Configure `deleteStackAfterPrClose` in the PR preview GitOps configuration so the PR-close flow triggers deletion | PR previews |
| **CI pipeline step** | Add a [`stacktape delete`](/cli/delete) step triggered on PR close or branch deletion | Custom CI/CD setups |
| **Manual cleanup** | Run `stacktape delete --stage {name}` | Feature branches, one-off stages |
| **Periodic audit** | Schedule a script that lists stacks and deletes those older than N days | Teams with many developers |


> **Warning:** Deleting a stage starts a Stacktape delete operation for that project, stage, AWS account, and AWS region. Confirm the stage is no longer needed before deleting it.


## Combining patterns

Most teams combine two or three of these patterns. A common setup:

| Pattern | Trigger | Stage | Lifecycle |
|---------|---------|-------|-----------|
| Production | Push to `main` | `prod` | Permanent |
| Staging | Push to `develop` | `staging` | Permanent |
| PR previews | PR opened against `main` | `pr-{number}` | Cleaned up on PR close |

This gives you:
- Continuous deployment to staging on every push to `develop`
- Production deployment on merge to `main`
- Isolated preview environments for every PR targeting `main`, cleaned up on PR close

The Console GitOps page supports PR Opened and Push to Branch configurations for GitHub repositories, so you can model production, staging, and PR-preview triggers there without writing pipeline files. See [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) for the full setup walkthrough.

## When to use this pattern

The stacks-per-branch pattern is the right default for most teams using Stacktape. It works particularly well when:

- Multiple developers work in parallel and need isolation from each other
- Code reviewers want to see changes running in a real environment
- You want a clear promotion path (feature branch → staging → production)
- Your stack includes stateful resources (databases) where shared environments cause conflicts

## When NOT to use this pattern

Skip stacks-per-branch (or use it minimally) when:

- **Your stack is expensive to provision.** A stage with large RDS instances, multiple container services, or GPU-backed batch jobs costs significant money per hour. Limit previews to serverless-only subsets or share a single staging environment instead.
- **Provisioning time is too long.** Complex stacks with many resources can take long enough to deploy that reviewers may prefer a shared staging environment with feature flags instead.
- **Data isolation isn't needed.** If your service is stateless and doesn't depend on databases, testing against a shared staging environment is simpler and cheaper.
- **You have very few developers.** A solo developer or pair rarely needs per-branch isolation — `prod` and `staging` (or `prod` plus [dev mode](/local-development/dev-mode-overview)) is often sufficient.

## FAQ

### How does a PR preview environment differ from staging?

A PR preview is an ephemeral stage created for a single pull request, deployed under a unique stage name like `pr-42`. Staging is a long-lived shared environment updated on every push to a specific branch. PR previews eliminate the "who broke staging" problem and let multiple PRs be tested simultaneously without interference. Most teams use both — staging for integration testing and PR previews for isolated code review.

### How much does a PR preview environment cost?

Each preview stage provisions the same AWS resources as any other stage. For serverless-only stacks (Lambda functions, DynamoDB, API Gateway), idle previews cost nearly nothing due to pay-per-use pricing. For stacks with always-on resources like RDS databases or ECS containers, each preview incurs hourly costs similar to any other stage. Ensure auto-delete is enabled for PR previews and right-size preview resources using [stage-specific configuration](/configuration/stages-and-environments) to control costs.

### What happens to data when a preview stage is deleted?

Deleting a preview stage starts a Stacktape delete operation for that stage. Treat preview-stage data as disposable — preview stages are ephemeral and should not contain data you need to keep. If your workflow requires populated data for testing, use [deployment scripts](/resources/advanced/deployment-scripts) or [hooks](/configuration/hooks-and-scripts) to seed the database on each deployment.

### How do I debug a failing PR preview deployment?

For preview deployments, the GitHub App creates a comment on the PR with pending deployment details. For preview deployments and deletions, if orchestration fails, the handler attempts to update the PR comment with failure details. You can also use [`stacktape logs`](/cli/logs) with `--stage pr-{number}` to tail logs from the deployed resources, or check [`stacktape info:operations`](/cli/info-operations) for the deployment history of the preview stage.

### GitOps vs custom CI/CD for stacks-per-branch — which should I choose?

GitOps with Console stores deployment configurations in the Stacktape Console, and the GitHub App handler starts deploy and delete operations from GitHub events — creating temporary PR configurations, orchestrating preview deployments, and posting PR comments. Choose [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) when you need pre-deployment tests, approval gates, custom build steps, support for Git providers other than GitHub, or integration with existing pipelines. Many teams start with GitOps and move to custom CI/CD when they outgrow the managed flow.
