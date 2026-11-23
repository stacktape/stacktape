# Custom CI/CD

Stacktape integrates with any CI/CD system that can run shell commands — GitHub Actions, GitLab CI, CircleCI, Bitbucket Pipelines, Jenkins, or custom scripts. Give the pipeline AWS credentials, or a Stacktape API key if you use the Console, then run [`deploy`](/cli/deploy) or [`delete`](/cli/delete) as a pipeline step to deploy and manage your AWS infrastructure from existing workflows.

## When to use custom CI/CD

Choose custom CI/CD when your deployment workflow needs steps beyond "push triggers deploy." Typical reasons:

- **Pre-deploy validation** — run tests, type checks, or lint before allowing a deployment
- **Approval gates** — require manual approval or status checks before production deploys
- **Multi-step pipelines** — build artifacts, run integration tests, deploy staging, run smoke tests, then deploy production
- **Notifications and reporting** — post deploy status to Slack, update issue trackers, or trigger downstream jobs
- **Non-git triggers** — deploy on schedule, on a webhook from another system, or from a monorepo filter

Custom CI/CD gives you full control over what happens before, during, and after a Stacktape deployment.

## When NOT to use custom CI/CD

If you want push-to-deploy with zero pipeline code, use [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) instead. GitOps handles branch pushes and PR previews automatically — no workflow files to write or maintain. Writing a CI pipeline purely to call `stacktape deploy` on every push adds maintenance for no benefit.

You can combine both: GitOps for staging and PR previews, custom CI for production where you need test gates.

## Authentication

### Without a Stacktape account

The open-source CLI deploys with the AWS credentials the job has. Set them before running Stacktape, for example with `aws-actions/configure-aws-credentials` and an IAM role that trusts GitHub's OIDC provider, and don't set `STACKTAPE_API_KEY`. Deploys go to the AWS account the credentials belong to. Console features such as deploy history and alert channels are not available in this mode. See [CI/CD without an account](/getting-started/open-source-cli#cicd-without-an-account) for an example workflow.

### With the Console

Create an organization key in the Stacktape Console under [API keys](/stacktape-console/api-keys#creating-an-api-key) and store it as a secret in your CI provider. Use an organization key, not a personal one. A personal key acts as the person who created it and stops working when they leave the organization. Owners and Admins create organization keys with **New organization key**, with the Developer role limited to the projects and AWS accounts the pipeline deploys. You can authenticate the CLI in two ways:

- **Explicit login step** — run [`stacktape login --api-key <key>`](/cli/login) as a pipeline step before deploying. The login command verifies the key and saves it for subsequent CLI commands.
- **Environment variable** — set `STACKTAPE_API_KEY` as an environment variable in your CI runner. The CI examples on this page use this approach for brevity.

If the pipeline also sets AWS credentials, for example with `aws-actions/configure-aws-credentials`, Stacktape deploys to the connected account they belong to. Pass `--aws-account <name>` to choose the account explicitly; the AWS credentials must then belong to it. See [Choosing the account for a CLI command](/stacktape-console/connecting-your-aws-account#choosing-the-account-for-a-cli-command).

| Provider | Where to store the secret |
|----------|--------------------------|
| GitHub Actions | Repository Settings → Secrets and variables → Actions |
| GitLab CI | Settings → CI/CD → Variables (masked) |
| Bitbucket Pipelines | Repository Settings → Pipeline → Repository variables |
| CircleCI | Project Settings → Environment Variables |


> **Tip:** Create a separate organization key for each pipeline. You can then rotate or revoke it without breaking the others.


## Essential CLI flags for CI

### --yes

The [`deploy`](/cli/deploy) and [`delete`](/cli/delete) commands can prompt for confirmation before modifying infrastructure. The `--yes` flag skips these prompts. Always include this flag in automated pipelines — without it, the CLI may wait for confirmation before modifying infrastructure, which is unsuitable for automated CI jobs. See the [`deploy` CLI reference](/cli/deploy) for details.

### --stage and --region

CI commands should pass `--stage` and `--region` explicitly so the deployment target is unambiguous. Set the stage to match your environment (e.g. `production`, `staging`, or a dynamic PR name). If the combined project name and stage name produces a stack name that's too long, Stacktape warns that some AWS resource names will be obfuscated to stay within CloudFormation naming limits — keep stage names short when deriving them from PR numbers or branch names.

A full deploy command in CI:

```bash
npx stacktape deploy --stage production --region us-east-1 --yes
```

A delete command (for PR cleanup):

```bash
npx stacktape delete --stage pr-42 --region us-east-1 --yes
```


> **Info:** If your CI pipeline deploys more than one Stacktape project, make the project selection explicit — set the project name in each configuration file or pass it as a CLI argument.


### --full

When only code changed, `stacktape deploy` updates the changed [Lambda functions](/resources/compute/lambda-function) and container workloads directly, without CloudFormation (see [Fast deployments](/cli/deploy#fast-deployments)). The `--full` flag deploys every change through CloudFormation instead.

```bash
npx stacktape deploy --stage staging --region us-east-1 --full --yes
```

### --auto-rollback

By default, a failed deployment keeps what it created or updated, and the next pipeline run continues from the failure. The `--auto-rollback` flag makes CloudFormation undo a failed deployment instead, so the stack returns to the last successful deployment (or, for a first deployment, is deleted). When a deploy is rolled back (outside of stack-monitoring errors, where the actual stack outcome is unknown), Stacktape removes deployment artifacts from the rolled-back attempt. See the [`deploy` CLI reference](/cli/deploy) for details.

```bash
npx stacktape deploy --stage production --region us-east-1 --auto-rollback --yes
```

Use automatic rollback for production pipelines that must never leave a stack between two versions. To set it for every deployment of a stage, use `deploymentConfig.autoRollback` with `$Stage()`.

## GitHub Actions

A GitHub Actions workflow can run the Stacktape CLI from a Node.js runner with a single `run` step. Create `.github/workflows/deploy.yml` in your repository:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Deploy to production
        env:
          STACKTAPE_API_KEY: ${{ secrets.STACKTAPE_API_KEY }}
        run: npx stacktape deploy --stage production --region us-east-1 --yes
```

Store `STACKTAPE_API_KEY` in your repository's Actions secrets. The `npx stacktape` invocation downloads and caches the CLI on first run.

### Adding tests before deploy

```yaml
name: Test and Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Deploy to production
        env:
          STACKTAPE_API_KEY: ${{ secrets.STACKTAPE_API_KEY }}
        run: npx stacktape deploy --stage production --region us-east-1 --yes
```

The `needs: test` dependency ensures the deploy only runs when tests pass.

### PR preview environments

Two workflows deploy a stage for every pull request and delete it when the pull request closes. They need no
Stacktape account: both get AWS credentials from an IAM role through GitHub's OIDC provider. Each PR stage creates
real AWS resources for whatever your Stacktape config defines, so make sure the delete works.

The deploy workflow, for example `.github/workflows/pr-preview.yml`:

```yaml
name: PR Preview
on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  id-token: write
  contents: read
  pull-requests: read

# One group per pull request runs its deploys one at a time.
concurrency:
  group: preview-${{ github.event.pull_request.number }}

jobs:
  deploy-preview:
    if: github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-preview
          aws-region: us-east-1
      - name: Deploy PR preview
        env:
          GH_TOKEN: ${{ github.token }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: |
          # A run that waited in the queue must not recreate the preview of a closed pull request.
          state=$(gh api "repos/${{ github.repository }}/pulls/$PR_NUMBER" --jq .state)
          if [ "$state" != open ]; then exit 0; fi
          npx stacktape deploy --project my-app --stage "pr-$PR_NUMBER" --region us-east-1 --yes
```

The delete workflow, for example `.github/workflows/pr-preview-delete.yml`:

```yaml
name: PR Preview Delete
on:
  pull_request_target:
    types: [closed]

permissions:
  id-token: write
  contents: read
  actions: read

concurrency:
  group: preview-delete-${{ github.event.pull_request.number }}

jobs:
  delete-preview:
    if: github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    environment: preview-cleanup
    steps:
      # Checks out the default branch. Never check out the pull request's code in this workflow.
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Wait for a preview deploy that is still running
        env:
          GH_TOKEN: ${{ github.token }}
          HEAD_REF: ${{ github.event.pull_request.head.ref }}
        run: |
          for id in $(gh run list --repo "${{ github.repository }}" --workflow "PR Preview" --branch "$HEAD_REF" \
              --status in_progress --json databaseId --jq '.[].databaseId'); do
            gh run watch "$id" --repo "${{ github.repository }}" > /dev/null
          done
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-preview
          aws-region: us-east-1
      - name: Delete PR preview
        run: npx stacktape delete --project my-app --stage "pr-${{ github.event.pull_request.number }}" --region us-east-1 --yes
```

Both commands name the project and the stage, so the stack name never depends on the runner or on the checkout. The
delete always runs with the default branch's code, and its config may differ from the one the preview was deployed with.

The delete is a separate workflow because GitHub doesn't run `pull_request` workflows for a pull request with merge
conflicts, and that includes the close. `pull_request_target` runs anyway, with the workflow file and code of your
default branch. Checking out the pull request's code there would let it run with the delete's AWS credentials. In a
public repository, GitHub blocks `pull_request_target` by default from December 2, 2026: allow it for this workflow in
an Actions policy under **Settings → Actions → Policies**.

The two workflows also use separate concurrency groups. In a shared group, a deploy that GitHub queues after the close
replaces the pending delete. Instead, the delete waits for a deploy that is still running, and a deploy that starts
after the close finds the pull request closed and stops. Stacktape also makes a delete wait while a deploy of the same
stage holds the stack.

The role's trust policy must accept the deploy job's pull request subject and the delete job's environment subject.
GitHub sends one of two subject formats: repositories created after July 15, 2026 (and older ones that opted in)
include the owner and repository IDs. Trusting all four exact values works either way:

```json
"Condition": {
  "StringEquals": {
    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
    "token.actions.githubusercontent.com:sub": [
      "repo:my-org/my-app:pull_request",
      "repo:my-org@123456/my-app@456789:pull_request",
      "repo:my-org/my-app:environment:preview-cleanup",
      "repo:my-org@123456/my-app@456789:environment:preview-cleanup"
    ]
  }
}
```

`gh api repos/my-org/my-app --jq '.owner.id, .id'` prints the two IDs. The delete job names an environment because
GitHub then puts the environment in the subject, whatever event started the job. A role that trusts only
`...:ref:refs/heads/main` refuses both jobs. Keep previews in an AWS account without production.

With the Console, drop the `configure-aws-credentials` steps and set `STACKTAPE_API_KEY: ${{ secrets.STACKTAPE_API_KEY }}`
in the `env` of both Stacktape steps, as in the deploy workflow above.

The `if` conditions skip pull requests from forks. In the deploy workflow, a fork can edit its copy of the workflow,
and the trust policy can't tell a fork's run from yours. What keeps forks out there is that GitHub gives fork pull
request runs read-only permissions, so they can't request the OIDC token. Keep **Send write tokens to workflows from
pull requests** turned off in the repository's **Settings → Actions → General**. The delete workflow is different:
`pull_request_target` runs your default branch's copy, with the permissions it asks for, even for a fork's pull
request, so its `if` condition is what keeps forks out. Don't remove it.

A database that `stacktape init` added has `deletionProtection: true` on every stage. `stacktape delete` then stops
before it deletes anything, the delete job fails, and the preview keeps running and costing money. Protect only
production. In `stacktape.ts`, use the `stage` that `defineConfig` passes to your config:

```ts
export default defineConfig(({ stage }) => {
  const database = new RelationalDatabase({
    // ...the rest of the database
    deletionProtection: stage === 'production'
  });
  // ...
});
```

A preview deployed before this change keeps its protection until it is deployed again. After your first preview,
close the pull request and check that the stage is gone, for example with `stacktape stack list --region us-east-1`.


> **Warning:** Delete preview stages on PR close to avoid unused infrastructure and costs. Each preview stage provisions the full set of resources defined in your config — databases, functions, containers, and networking — all of which incur AWS charges while running.


For more on the branch-to-stage mapping pattern, see [stacks per git branch](/ci-cd-and-gitops/stacks-per-git-branch-pattern).

### Concurrency control

Stacktape deploys use CloudFormation, which serializes updates to a single stack. If two CI runs deploy to the same stage simultaneously, one fails because the stack is in an `UPDATE_IN_PROGRESS` state. Add a concurrency group to prevent parallel deploys:

```yaml
concurrency:
  group: deploy-production
  cancel-in-progress: false
```

Place this at the job level in your GitHub Actions workflow. The `cancel-in-progress: false` setting queues new runs instead of cancelling them, so no deploy is silently dropped.

## GitLab CI

A GitLab CI pipeline can run the Stacktape CLI from a Node.js Docker image. Add to `.gitlab-ci.yml`:

```yaml
deploy:
  image: node:20
  stage: deploy
  only:
    - main
  script:
    - npx stacktape deploy --stage production --region us-east-1 --yes
  variables:
    STACKTAPE_API_KEY: $STACKTAPE_API_KEY
```

Store `STACKTAPE_API_KEY` as a masked CI/CD variable in your GitLab project settings.

### Multi-stage pipeline with tests

```yaml
stages:
  - test
  - deploy

test:
  image: node:20
  stage: test
  script:
    - npm ci
    - npm test

deploy-staging:
  image: node:20
  stage: deploy
  only:
    - develop
  script:
    - npx stacktape deploy --stage staging --region us-east-1 --yes
  variables:
    STACKTAPE_API_KEY: $STACKTAPE_API_KEY

deploy-production:
  image: node:20
  stage: deploy
  only:
    - main
  script:
    - npx stacktape deploy --stage production --region us-east-1 --yes
  variables:
    STACKTAPE_API_KEY: $STACKTAPE_API_KEY
  when: manual
```

The `when: manual` on production requires a developer to click "Run" in the GitLab UI — an approval gate without additional tooling. Use GitLab resource groups if you need to prevent parallel deploys to the same stage.

## Bitbucket Pipelines

Add to `bitbucket-pipelines.yml`:

```yaml
image: node:20

pipelines:
  branches:
    main:
      - step:
          name: Deploy to production
          script:
            - npx stacktape deploy --stage production --region us-east-1 --yes
```

Store `STACKTAPE_API_KEY` as a repository variable in Bitbucket Pipeline settings.

## CircleCI

Add to `.circleci/config.yml`:

```yaml
version: 2.1
jobs:
  deploy:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run:
          name: Deploy to production
          command: npx stacktape deploy --stage production --region us-east-1 --yes
workflows:
  deploy-on-push:
    jobs:
      - deploy:
          filters:
            branches:
              only: main
```

Store `STACKTAPE_API_KEY` as a project environment variable in CircleCI.

## Choosing CI runner capacity

| Scenario | Recommended command |
|----------|-------------------|
| Small to medium project, CI runner has enough CPU/RAM | `stacktape deploy` (default `--runner local`) |
| Large dependencies or container builds | [`deploy`](/cli/deploy) on a larger CI worker |
| Need a consistent build environment | Pin the CI image and tool versions |
| Need AWS-hosted GitHub Actions compute | [`deploy`](/cli/deploy) on a [self-hosted runner](/ci-cd-and-gitops/self-hosted-github-actions-runners) |
| Want fastest possible deploy from CI | `stacktape deploy` with caching |

The default `deploy` command runs the build and deployment on your CI worker. Configure CPU, memory, disk, Docker support, and dependency caches in the CI provider. For GitHub Actions, Stacktape can manage an EC2-based [self-hosted runner](/ci-cd-and-gitops/self-hosted-github-actions-runners) in your AWS account.

## Multi-environment patterns

A common pattern maps branches to stages:

| Branch | Stage | Region | Trigger |
|--------|-------|--------|---------|
| `main` | `production` | `us-east-1` | Push (after tests pass) |
| `develop` | `staging` | `us-east-1` | Push |
| PR branch | `pr-{number}` | `us-east-1` | PR opened/updated |

Implement this with separate workflow triggers or CI stages. The core command stays the same — only the `--stage` value changes.

### Passing config-level variables per environment

Stacktape supports deploy-time parameterization so you can keep one configuration file across all environments while varying database sizes, instance counts, or feature flags. See [deploy-time parameters](/deployment-and-lifecycle/deploy-time-parameters) and [directives](/configuration/directives) for the available patterns.

## Previewing changes before deploying

In workflows with approval gates, use [`diff`](/cli/diff) as an earlier pipeline step to inspect what a deployment would change before approving it. This gives reviewers a chance to see the planned infrastructure diff without actually applying changes.

```bash
npx stacktape diff --stage production --region us-east-1
```

This is useful in production pipelines where a reviewer needs to see the infrastructure diff before approving. Pair it with a manual approval step so the team can review changes before the deploy job runs. See the [`diff` CLI reference](/cli/diff) for details on its output.

## Troubleshooting

### CLI hangs or throws an error waiting for input

Add `--yes` to your [`deploy`](/cli/deploy) or [`delete`](/cli/delete) command. Without this flag, the CLI may wait for confirmation before modifying infrastructure, which is unsuitable for automated CI jobs.

### Authentication fails

Without a Stacktape account, check that the job has AWS credentials before the Stacktape step runs and that they have not expired.

With the Console, verify that you have authenticated — either by setting the `STACKTAPE_API_KEY` environment variable (case-sensitive) or by running [`stacktape login --api-key <key>`](/cli/login) before the deploy step. Check that the API key hasn't been revoked in the Console under [API keys](/stacktape-console/api-keys), and rotate it if necessary.

### Stack name too long or resource names obfuscated

If the combined project name and stage name produces a stack name that exceeds CloudFormation naming limits, Stacktape warns that some AWS resource names will be obfuscated. When deriving stage names from PR numbers or branch names, keep them short — `pr-42` is fine, but a long descriptive name combined with a long project name may trigger obfuscation.

### Concurrent deploys to the same stage

A stack runs one deploy, rollback or delete at a time. If two CI runs deploy to the same stage simultaneously, the second waits for the first to finish, names it while it waits, and then deploys on top of what the first one deployed. If a CI job is killed, its lock expires within two minutes and the waiting deploy continues. If the killed job was running a [release command](/deployment-and-lifecycle/release-commands), the waiting deploy also waits for that command to finish. Runs wait in no particular order, so a run of an older commit can finish last. To always end on the newest commit, use CI concurrency controls (a GitHub Actions `concurrency` group or a GitLab resource group), which also save the runner time spent waiting.

The first deploy of a new stage is the exception: until the stage exists, it has nowhere to keep the lock. If two first deploys of the same stage run at once, the second stops without changing anything; run it again.

## FAQ

### How do I authenticate Stacktape in a CI pipeline?

Without a Stacktape account, give the job AWS credentials; nothing else is needed. With the Console, run [`stacktape login --api-key <key>`](/cli/login) as a pipeline step before deploying — the login command verifies the key and saves it for subsequent CLI commands. Alternatively, set `STACKTAPE_API_KEY` as an environment variable in your CI runner. Create the key in the Stacktape Console under [API keys](/stacktape-console/api-keys). Use an organization key rather than a personal key, so the pipeline keeps working when the person who set it up leaves.

### When should I use custom CI/CD vs GitOps?

Use [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) when you want zero-maintenance push-to-deploy with PR previews and no workflow files. Use custom CI/CD when you need pre-deploy test gates, manual approval steps, multi-step pipelines, or non-git triggers. You can combine both — GitOps for staging branches and custom CI for production.

### Where does the deployment build run?

The standard [`deploy`](/cli/deploy) command builds on the CI worker that invokes it. Size that worker for your workload and configure provider-level caches for package managers and Docker. If you use Stacktape's self-hosted GitHub Actions integration, the workflow runs on the project's EC2 runner in your AWS account.

### What happens when a deploy fails in CI?

By default, the stack keeps what the failed deployment created or updated and stays in `CREATE_FAILED` or `UPDATE_FAILED`. Fix the issue and run the pipeline again; the deploy continues from the failure. With `--auto-rollback` or `deploymentConfig.autoRollback`, CloudFormation rolls the deployment back instead, and Stacktape removes deployment artifacts from the rolled-back attempt (except after stack-monitoring errors, where the actual stack outcome is unknown). See [Rollbacks](/deployment-and-lifecycle/rollbacks) for the full options.

### How do I deploy to multiple AWS regions from CI?

Run the deploy command once per region with the same stage name but different `--region` values. Each region creates an independent stack. You can run these as parallel jobs in your CI pipeline. See [multi-region deployments](/deployment-and-lifecycle/multi-region-deployments) for patterns and considerations.

### What happens when two deploys to the same stage run at once?

A stack runs one deploy, rollback or delete at a time, including deploys that skip CloudFormation. The second deploy waits for the first to finish and then deploys on top of its result. A killed run blocks the next one for at most two minutes. To control the order of runs, use a GitHub Actions `concurrency` group (with `cancel-in-progress: false` to queue rather than drop runs) or a GitLab resource group.
