# Stacks per Git branch

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

The stage name does not have to match the branch name. Most teams use short, meaningful names (`prod`, `staging`) rather than the literal branch name. You configure the mapping either as [Git deployments in the Stacktape Console](/ci-cd-and-gitops/gitops-with-console) or in your [custom CI/CD pipeline](/ci-cd-and-gitops/custom-ci-cd). A Git deployment watches one exact branch name. For pattern-based routing, such as every `release-*` branch, use [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd), where you control the matching.

### Setting up with GitOps

Git deployments work with repositories on GitHub, GitLab and Bitbucket. Open the project, choose **Configure Git deployments** from the gear menu and click **New Git deployment**. Pick the **Push to branch** trigger, the branch, the stage, and the AWS account and region. Every push to that branch then deploys the stage. Tag pushes and branch deletions do not deploy anything. See [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) for connecting your Git provider and the full walkthrough.

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

This command runs on your pipeline's worker. Console-managed GitOps deployments instead run on the project's [EC2 build runner](/ci-cd-and-gitops/build-runners).


> **Warning:** When using the branch name directly as the stage name, sanitize it first. Branch names can be long and include separators such as `/`. Use a short normalized identifier, because stage names are passed into deployment operations and may appear in generated AWS names.


## PR preview environments

PR previews give every pull request a dedicated stage. Reviewers test changes against real AWS resources before merging — no shared staging environment, no risk of one PR overwriting another's state.

### How PR previews work with GitOps

Create a Git deployment with the **Pull request opened** trigger and choose the branch that pull requests merge into, such as `main`. This works the same way on GitHub, GitLab (merge requests) and Bitbucket:

1. **Pull request opened** — Stacktape deploys the stage `pr-<number>`, for example `pr-42`, and comments on the pull request. The comment is updated with the result.
2. **New commits pushed to the pull request** — Stacktape redeploys `pr-<number>` with the latest commit.
3. **Pull request merged or closed** — if the Git deployment has **Delete stack after pull request is merged or closed?** turned on, Stacktape deletes the preview stage and comments on the pull request. Otherwise the stage keeps running.

Pull requests from forks never get a preview, so code from outside the repository does not run with your project's credentials.

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

For GitHub Actions, you can run this workflow on GitHub-hosted compute or enable Stacktape's [self-hosted EC2 runner](/ci-cd-and-gitops/self-hosted-github-actions-runners).

### Auto-delete on PR close

Turn on **Delete stack after pull request is merged or closed?** in the Git deployment, or add a delete step to your custom CI pipeline, so preview stages don't keep running databases, load balancers or containers after the pull request closes.

Keep previews after merge only when you have a specific reason, such as:

- Post-merge QA validation that runs against the deployed preview
- Debugging a deployment issue after the PR was merged
- Compliance workflows that require a frozen snapshot

You can always remove a preview stage manually with [`stacktape delete`](/cli/delete), whatever the Git deployment's setting.

### CI variables for custom pipelines

If you implement the pattern in your own pipeline, substitute your CI system's branch and pull request variables in the deploy and delete steps above.

| Provider | PR/MR number variable | Branch name variable |
|----------|----------------------|---------------------|
| GitHub Actions | `${{ github.event.pull_request.number }}` | `${{ github.ref_name }}` |
| GitLab CI | `$CI_MERGE_REQUEST_IID` | `$CI_COMMIT_BRANCH` |
| Bitbucket Pipelines | `$BITBUCKET_PR_ID` | `$BITBUCKET_BRANCH` |

## Feature branch stages

Feature branch stages sit between long-lived stages and PR previews. They're deployed from a named branch (e.g. `feat/payments`) and live until the feature merges or is abandoned.

Feature branch stages are often deployed explicitly when you need a live environment for a long-running feature, but they can also be automated with a **Push to branch** Git deployment for that branch, or a custom CI pipeline triggered on push. Unlike long-lived stages, they're torn down once the feature ships.

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

**Auto-delete PR previews.** Turn on **Delete stack after pull request is merged or closed?** in the preview Git deployment, or add a deletion step in your custom CI pipeline. Stale previews running unused databases or containers are the most common source of unexpected bills.

**Use serverless resources in previews.** [Lambda functions](/resources/compute/lambda-function) and [DynamoDB tables](/resources/databases/dynamodb) have pay-per-use pricing with generous free tiers. A preview stage with only serverless resources costs nearly nothing when idle. [Container workloads](/resources/compute/web-service) and [relational databases](/resources/databases/relational-database) incur costs whether traffic is flowing or not.

**Set budget alerts.** Configure [budgets](/managing-costs/budgets) to notify your team when spend exceeds a threshold. This catches runaway costs from forgotten stages.

**Audit regularly.** Use [`stacktape stack list`](/cli/info-stacks) to list all deployed stages and identify stale ones that should be deleted.

## Cleanup strategies

Stale stages are the primary risk of the stacks-per-branch pattern. A forgotten feature branch stage running a database instance costs money every hour.

| Strategy | How | Best for |
|----------|-----|----------|
| **Git deployment cleanup** | Turn on **Delete stack after pull request is merged or closed?** in the preview Git deployment | PR previews |
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

Git deployments in the Console support **Push to branch** and **Pull request opened** triggers for GitHub, GitLab and Bitbucket repositories, so you can set up production, staging and PR previews there without writing pipeline files. See [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) for the full setup walkthrough.

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

For Git deployment previews, start with the comment Stacktape posts on the pull request: it shows whether the deploy succeeded or failed. The deployment's logs are in the Stacktape Console. You can also use [`stacktape logs`](/cli/logs) with `--stage pr-{number}` to tail logs from the deployed resources, or check [`stacktape stack history`](/cli/info-operations) for the deployment history of the preview stage.

### GitOps vs custom CI/CD for stacks-per-branch — which should I choose?

With [Git deployments in the Console](/ci-cd-and-gitops/gitops-with-console), Stacktape deploys on pushes and pull requests from GitHub, GitLab or Bitbucket, posts results on the pull request and cleans up previews, with no pipeline file. Choose [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) when you need pre-deployment tests, approval gates, custom build steps, a Git host other than GitHub, GitLab or Bitbucket, or integration with existing pipelines. Many teams start with GitOps and move to custom CI/CD when they outgrow the managed flow.
