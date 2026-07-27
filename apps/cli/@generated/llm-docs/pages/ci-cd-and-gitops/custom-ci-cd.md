# Custom CI/CD

Stacktape integrates with any CI/CD system that can run shell commands — GitHub Actions, GitLab CI, CircleCI, Bitbucket Pipelines, Jenkins, or custom scripts. Authenticate with an API key, then run [`deploy`](/cli/deploy) or [`delete`](/cli/delete) as a pipeline step to deploy and manage your AWS infrastructure from existing workflows.

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

Create an API key in the Stacktape Console under [API keys](/stacktape-console/api-keys) and store it as a secret in your CI provider. You can authenticate the CLI in two ways:

- **Explicit login step** — run [`stacktape login --apiKey <key>`](/cli/login) as a pipeline step before deploying. The login command verifies the key and saves it for subsequent CLI commands.
- **Environment variable** — set `STACKTAPE_API_KEY` as an environment variable in your CI runner. The CI examples on this page use this approach for brevity.

| Provider | Where to store the secret |
|----------|--------------------------|
| GitHub Actions | Repository Settings → Secrets and variables → Actions |
| GitLab CI | Settings → CI/CD → Variables (masked) |
| Bitbucket Pipelines | Repository Settings → Pipeline → Repository variables |
| CircleCI | Project Settings → Environment Variables |


> **Tip:** Create a dedicated API key for CI/CD rather than reusing a personal key. This makes it easy to rotate without disrupting developer workflows.


## Essential CLI flags for CI

### --autoConfirmOperation

The [`deploy`](/cli/deploy) and [`delete`](/cli/delete) commands can prompt for confirmation before modifying infrastructure. The `--autoConfirmOperation` flag skips these prompts. Always include this flag in automated pipelines — without it, the CLI may wait for confirmation before modifying infrastructure, which is unsuitable for automated CI jobs. See the [`deploy` CLI reference](/cli/deploy) for details.

### --stage and --region

CI commands should pass `--stage` and `--region` explicitly so the deployment target is unambiguous. Set the stage to match your environment (e.g. `production`, `staging`, or a dynamic PR name). If the combined project name and stage name produces a stack name that's too long, Stacktape warns that some AWS resource names will be obfuscated to stay within CloudFormation naming limits — keep stage names short when deriving them from PR numbers or branch names.

A full deploy command in CI:

```bash
npx stacktape deploy --stage production --region us-east-1 --autoConfirmOperation
```

A delete command (for PR cleanup):

```bash
npx stacktape delete --stage pr-42 --region us-east-1 --autoConfirmOperation
```


> **Info:** If your CI pipeline deploys more than one Stacktape project, make the project selection explicit — set the project name in each configuration file or pass it as a CLI argument.


### --hotSwap

The `--hotSwap` flag attempts a faster deployment by updating eligible [Lambda functions](/resources/compute/lambda-function) and container workloads — [web services](/resources/compute/web-service), [private services](/resources/compute/private-service), and [worker services](/resources/compute/worker-service) — directly when Stacktape determines the stack changes are hot-swappable. If hot-swap is not possible, Stacktape warns, may repackage skipped packaging jobs for existing stacks, prepares the template again, and runs a full CloudFormation deploy.

```bash
npx stacktape deploy --stage staging --region us-east-1 --hotSwap --autoConfirmOperation
```

Hot-swap is recommended for development stacks where speed matters more than full CloudFormation tracking. Avoid it for production deployments.

### --disableAutoRollback

By default, failed deployments auto-rollback to the last working state. The `--disableAutoRollback` flag keeps the stack in a failed state instead, so you can inspect what went wrong. When auto-rollback is enabled and a deploy fails (outside of stack-monitoring errors, where the actual stack outcome is unknown), Stacktape removes deployment artifacts from the rolled-back attempt. See the [`deploy` CLI reference](/cli/deploy) for details.

```bash
npx stacktape deploy --stage staging --region us-east-1 --disableAutoRollback --autoConfirmOperation
```

Disabling auto-rollback is useful for debugging deployment failures. Keep auto-rollback enabled (the default) for production pipelines.

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
        run: npx stacktape deploy --stage production --region us-east-1 --autoConfirmOperation
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
        run: npx stacktape deploy --stage production --region us-east-1 --autoConfirmOperation
```

The `needs: test` dependency ensures the deploy only runs when tests pass.

### PR preview environments

Deploy an isolated stage for each pull request and tear it down on close. Each PR stage creates real AWS resources for whatever your Stacktape config defines — delete preview stages promptly to avoid accumulating unused infrastructure.

```yaml
name: PR Preview
on:
  pull_request:
    types: [opened, synchronize, reopened]
jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Deploy PR preview
        env:
          STACKTAPE_API_KEY: ${{ secrets.STACKTAPE_API_KEY }}
        run: npx stacktape deploy --stage "pr-${{ github.event.pull_request.number }}" --region us-east-1 --autoConfirmOperation
```

Add a cleanup workflow that runs when the PR is closed:

```yaml
name: Cleanup PR Preview
on:
  pull_request:
    types: [closed]
jobs:
  delete-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Delete PR preview
        env:
          STACKTAPE_API_KEY: ${{ secrets.STACKTAPE_API_KEY }}
        run: npx stacktape delete --stage "pr-${{ github.event.pull_request.number }}" --region us-east-1 --autoConfirmOperation
```


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
    - npx stacktape deploy --stage production --region us-east-1 --autoConfirmOperation
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
    - npx stacktape deploy --stage staging --region us-east-1 --autoConfirmOperation
  variables:
    STACKTAPE_API_KEY: $STACKTAPE_API_KEY

deploy-production:
  image: node:20
  stage: deploy
  only:
    - main
  script:
    - npx stacktape deploy --stage production --region us-east-1 --autoConfirmOperation
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
            - npx stacktape deploy --stage production --region us-east-1 --autoConfirmOperation
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
          command: npx stacktape deploy --stage production --region us-east-1 --autoConfirmOperation
workflows:
  deploy-on-push:
    jobs:
      - deploy:
          filters:
            branches:
              only: main
```

Store `STACKTAPE_API_KEY` as a project environment variable in CircleCI.

## Using deploy --runner codebuild in pipelines

For large projects where uploading built artifacts from your CI runner is slow, consider using `deploy --runner codebuild` instead. This offloads the build and deployment to AWS CodeBuild inside your AWS account. The `--runner` flag accepts `local` (default), `codebuild`, or `ec2`. See the [`deploy` CLI reference](/cli/deploy) for details on behavior and available flags.

### When to use CodeBuild runner vs local runner

| Scenario | Recommended command |
|----------|-------------------|
| Small to medium project, CI runner has enough CPU/RAM | `stacktape deploy` (default `--runner local`) |
| Large dependencies, slow upload from CI runner | `stacktape deploy --runner codebuild` |
| Need consistent build environment across team | `stacktape deploy --runner codebuild` |
| Need full control over build environment | [`deploy`](/cli/deploy) on a [self-hosted runner](/ci-cd-and-gitops/self-hosted-github-actions-runners) |
| Want fastest possible deploy from CI | `stacktape deploy` with caching |

The default `deploy` command runs the build and deployment on your CI runner. The `--runner codebuild` flag offloads this to AWS CodeBuild. AWS CodeBuild charges per build minute — see [AWS CodeBuild pricing](https://aws.amazon.com/codebuild/pricing/) for current rates.

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

Add `--autoConfirmOperation` to your [`deploy`](/cli/deploy) or [`delete`](/cli/delete) command. Without this flag, the CLI may wait for confirmation before modifying infrastructure, which is unsuitable for automated CI jobs.

### Authentication fails

Verify that you have authenticated — either by setting the `STACKTAPE_API_KEY` environment variable (case-sensitive) or by running [`stacktape login --apiKey <key>`](/cli/login) before the deploy step. Check that the API key hasn't been revoked in the Console under [API keys](/stacktape-console/api-keys), and rotate it if necessary.

### Stack name too long or resource names obfuscated

If the combined project name and stage name produces a stack name that exceeds CloudFormation naming limits, Stacktape warns that some AWS resource names will be obfuscated. When deriving stage names from PR numbers or branch names, keep them short — `pr-42` is fine, but a long descriptive name combined with a long project name may trigger obfuscation.

### Concurrent deploys to the same stage

Stacktape deploys use CloudFormation, which serializes updates to a single stack. If two CI runs deploy to the same stage simultaneously, one fails because the stack is in an `UPDATE_IN_PROGRESS` state. Use CI concurrency controls (GitHub Actions `concurrency` groups, GitLab resource groups) to prevent parallel deploys to the same stage.

## FAQ

### How do I authenticate Stacktape in a CI pipeline?

Run [`stacktape login --apiKey <key>`](/cli/login) as a pipeline step before deploying — the login command verifies the key and saves it for subsequent CLI commands. Alternatively, set `STACKTAPE_API_KEY` as an environment variable in your CI runner. Create API keys in the Stacktape Console under [API keys](/stacktape-console/api-keys). Use a dedicated key for CI rather than a personal key so you can rotate it without disrupting developer workflows.

### When should I use custom CI/CD vs GitOps?

Use [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) when you want zero-maintenance push-to-deploy with PR previews and no workflow files. Use custom CI/CD when you need pre-deploy test gates, manual approval steps, multi-step pipelines, or non-git triggers. You can combine both — GitOps for staging branches and custom CI for production.

### Should I use deploy --runner codebuild or the default local runner in CI?

Use [`deploy`](/cli/deploy) for most projects — it's simpler and runs on your CI runner. Switch to `deploy --runner codebuild` when your project has large dependencies that are slow to upload, or when you need a consistent AWS-hosted build environment. The `--runner` flag also accepts `ec2` for an EC2-based build runner. See the [`deploy` CLI reference](/cli/deploy) for details on behavior and available flags. AWS CodeBuild charges per build minute based on compute type.

### What happens when a deploy fails in CI?

By default, failed deployments auto-rollback to the last working state, and Stacktape removes deployment artifacts from the rolled-back attempt (except after stack-monitoring errors, where the actual stack outcome is unknown). To debug a failure, pass `--disableAutoRollback` so the stack stays in its failed state for inspection, then fix the issue and redeploy. Keep auto-rollback enabled for production pipelines. See [Rollbacks](/deployment-and-lifecycle/rollbacks) for the full options.

### How do I deploy to multiple AWS regions from CI?

Run the deploy command once per region with the same stage name but different `--region` values. Each region creates an independent stack. You can run these as parallel jobs in your CI pipeline. See [multi-region deployments](/deployment-and-lifecycle/multi-region-deployments) for patterns and considerations.

### Why does one of two concurrent deploys to the same stage fail?

Stacktape deploys use CloudFormation, which serializes updates to a single stack. If two CI runs deploy to the same stage at once, one fails because the stack is already in an `UPDATE_IN_PROGRESS` state. Prevent this with CI concurrency controls — a GitHub Actions `concurrency` group (with `cancel-in-progress: false` to queue rather than drop runs) or a GitLab resource group.
