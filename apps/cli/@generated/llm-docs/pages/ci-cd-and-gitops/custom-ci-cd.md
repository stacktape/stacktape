# Custom CI/CD

This page sets up a pipeline that runs [`stacktape deploy`](/cli/deploy) after your own steps, such as tests or a
manual approval. Any CI that runs shell commands works. If a push should simply deploy, with no steps before it,
[Git deployments](/ci-cd-and-gitops/gitops-with-console) need no pipeline file.

## Authenticate the pipeline

### Without a Stacktape account

Give the job AWS credentials and don't set `STACKTAPE_API_KEY`. The CLI deploys to the AWS account the credentials
belong to. On GitHub Actions, use an IAM role that trusts GitHub's OIDC provider, so no AWS key is stored. See
[CI/CD without an account](/getting-started/open-source-cli#cicd-without-an-account) for a complete workflow.

### With the Console

Set `STACKTAPE_API_KEY` in the job. Deploys are then recorded in the Console, and Console features in your config work.

Use an organization key, not a personal one. A personal key acts as the person who created it and stops working when
they leave the organization. Owners and Admins create an organization key in the Console under **API keys** →
**Organization keys** → **New organization key**, with the Developer role limited to the projects and AWS accounts the
pipeline deploys. See [Organization keys for CI](/stacktape-console/api-keys#create-an-organization-key).

The CLI deploys into an AWS account connected to your organization:

- With one connected account, it uses that one.
- With several, pass `--aws-account <name>`.
- If the job also has AWS credentials, the CLI uses the connected account they belong to.

See [Choosing the account for a CLI command](/stacktape-console/connecting-your-aws-account#choosing-the-account-for-a-cli-command).

Store the key, or the AWS credentials, in your CI's secret store:

| CI | Where |
|---|---|
| GitHub Actions | Repository **Settings → Secrets and variables → Actions** |
| GitLab CI | **Settings → CI/CD → Variables**, masked |
| Bitbucket Pipelines | **Repository settings → Repository variables**, secured |
| CircleCI | **Project Settings → Environment Variables** |

## The deploy command

```bash
npx stacktape deploy --stage production --region eu-west-1 --yes
```

- **`--stage` and `--region`** pick the target. Pass both, so the target never depends on the worker's defaults. If
  the pipeline deploys more than one project, also pass `--project` or set the project name in each config.
- **`--yes`** approves what the CLI would otherwise ask about: an update that deletes or replaces a database or another
  stateful resource, a Console project that doesn't exist yet, and every `delete`. A CI job can't answer, so without
  `--yes` such a run stops with an error and changes nothing. A routine deploy never asks.
- **`--auto-rollback`** returns the stack to its last successful deployment when the deploy fails. By default a failed
  deploy keeps what it changed, and the next run continues from there. See [Rollbacks](/deployment-and-lifecycle/rollbacks).

The deploy installs your JavaScript dependencies from the lockfile itself (`npm ci`, `pnpm install --frozen-lockfile`
and so on), so it needs no install step of its own. npm comes with Node.js. For pnpm, Yarn or Bun, install the package
manager in the job first.

To deploy to several regions, run the command once per region. Each region gets its own stack.

### Docker in the job

Building a container image needs the Docker CLI with Buildx and a running Docker daemon. Every container workload needs
one (`js-bundle`, `buildpack` and `dockerfile` packaging), and so do Lambda functions with `buildpack` packaging and
some native dependencies of `js-bundle` functions. GitHub's hosted Ubuntu runners have Docker. The GitLab, Bitbucket
and CircleCI examples below run in a plain Node.js container without it, so as written they deploy only stacks that
need no Docker build. For anything else, give the job Docker the way your CI documents it:
[GitLab Docker-in-Docker](https://docs.gitlab.com/ci/docker/using_docker_build/),
[the Bitbucket Docker service](https://support.atlassian.com/bitbucket-cloud/docs/run-docker-commands-in-bitbucket-pipelines/)
or [CircleCI's machine executor or remote Docker](https://circleci.com/docs/guides/execute/building-docker-images/).

## GitHub Actions

Create `.github/workflows/deploy.yml`. The deploy job runs only after the tests pass:

```yaml
name: Deploy
on:
  push:
    branches: [main]

# Deploys of production run one at a time.
concurrency:
  group: deploy-production

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Deploy
        env:
          STACKTAPE_API_KEY: ${{ secrets.STACKTAPE_API_KEY }}
        run: npx stacktape deploy --stage production --region eu-west-1 --yes
```

With the `concurrency` group, a new run waits while another one deploys. GitHub keeps only the newest waiting run and
cancels older waiting ones, so after three quick pushes the middle one never deploys. That is usually what you want,
because the newest commit includes the others. To deploy every commit in order, add `queue: max` to the group.

To pin the CLI version the pipeline uses, replace `npx stacktape` with `npx stacktape@4.0.0`, or the version you
tested. Then a Stacktape release never changes what the pipeline does.

### Pull request previews

One workflow deploys a stage for every pull request and deletes it when the pull request closes. It needs no
Stacktape account: both jobs get AWS credentials from an IAM role through GitHub's OIDC provider.

```yaml
name: Preview
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

permissions:
  id-token: write
  contents: read

# One group per pull request keeps its deploys and the delete in order.
concurrency:
  group: preview-${{ github.event.pull_request.number }}

jobs:
  deploy:
    if: github.event.action != 'closed' && github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-preview
          aws-region: eu-west-1
      - name: Deploy preview
        run: npx stacktape deploy --project my-app --stage pr-${{ github.event.pull_request.number }} --region eu-west-1 --yes

  delete:
    if: github.event.action == 'closed' && github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-preview
          aws-region: eu-west-1
      - name: Delete preview
        run: npx stacktape delete --project my-app --stage pr-${{ github.event.pull_request.number }} --region eu-west-1 --yes
```

Both commands name the project and the stage, so the stack name never depends on the runner or on the checkout. The
delete job runs on the base branch after a merge, and its config may differ from the one the preview was deployed with.

The role's trust policy must accept pull request jobs. GitHub sends one of two subject formats: repositories created
after July 15, 2026 (and older ones that opted in) include the owner and repository IDs. Trusting both exact values
works either way:

```json
"Condition": {
  "StringEquals": {
    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
    "token.actions.githubusercontent.com:sub": [
      "repo:my-org/my-app:pull_request",
      "repo:my-org@123456/my-app@456789:pull_request"
    ]
  }
}
```

`gh api repos/my-org/my-app --jq '.owner.id, .id'` prints the two IDs. A role that trusts only
`...:ref:refs/heads/main` refuses pull request jobs. Keep previews in an AWS account without production.

With the Console, drop the `configure-aws-credentials` steps and set `STACKTAPE_API_KEY: ${{ secrets.STACKTAPE_API_KEY }}`
in the `env` of both Stacktape steps, as in the deploy workflow above.

The shared group matters. Without it, a delete that runs before a queued deploy leaves that deploy to create the
preview again after the pull request closed. With it, closing the pull request replaces any deploy that hasn't started
yet, and the delete runs after the one that is running.

The `if` conditions skip pull requests from forks, but a fork can edit its copy of the workflow, and the trust policy
can't tell a fork's run from yours. What keeps forks out is that GitHub gives fork pull request runs read-only
permissions, so they can't request the OIDC token. Keep **Send write tokens to workflows from pull requests** turned
off in the repository's **Settings → Actions → General**.

A database that `stacktape init` added has deletion protection on every stage. The delete job then fails, and the
preview keeps running and costing money. Turn the protection off for previews as described in
[Preview pull requests](/getting-started/after-the-first-deploy#preview-pull-requests). After your first preview,
close the pull request and check that the stage is gone.

[Stacks per Git branch](/ci-cd-and-gitops/stacks-per-git-branch-pattern) covers naming and the cost of previews.

## GitLab CI

Add `.gitlab-ci.yml`. Staging deploys on every push to `develop`, and production waits for someone to click **Run** on
`main`:

```yaml
stages:
  - test
  - deploy

test:
  image: node:24
  stage: test
  script:
    - npm ci
    - npm test

deploy-staging:
  image: node:24
  stage: deploy
  resource_group: deploy-staging
  rules:
    - if: $CI_COMMIT_BRANCH == "develop"
  script:
    - npx stacktape deploy --stage staging --region eu-west-1 --yes

deploy-production:
  image: node:24
  stage: deploy
  resource_group: deploy-production
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
  script:
    - npx stacktape deploy --stage production --region eu-west-1 --yes
```

`STACKTAPE_API_KEY` or the AWS credentials come from the project's CI/CD variables. A `resource_group` runs one job at
a time per group. To build container images, add Docker to the job; see [Docker in the job](#docker-in-the-job).

## Bitbucket Pipelines

Add `bitbucket-pipelines.yml`:

```yaml
image: node:24

pipelines:
  branches:
    main:
      - step:
          name: Deploy to production
          script:
            - npx stacktape deploy --stage production --region eu-west-1 --yes
```

Store `STACKTAPE_API_KEY` or the AWS credentials as secured repository variables. To build container images, add Docker to the job; see [Docker in the job](#docker-in-the-job).

## CircleCI

Add `.circleci/config.yml`:

```yaml
version: 2.1
jobs:
  deploy:
    docker:
      - image: cimg/node:lts
    steps:
      - checkout
      - run:
          name: Deploy to production
          command: npx stacktape deploy --stage production --region eu-west-1 --yes
workflows:
  deploy-on-push:
    jobs:
      - deploy:
          filters:
            branches:
              only: main
```

Store `STACKTAPE_API_KEY` or the AWS credentials as project environment variables. To build container images, add Docker to the job; see [Docker in the job](#docker-in-the-job).

## Review changes before an approval

In a pipeline with a manual approval, run [`stacktape diff`](/cli/diff) before the approval step, so the reviewer sees
which resources the deploy adds, changes or replaces:

```bash
npx stacktape diff --stage production --region eu-west-1
```

`diff` needs the same credentials as the deploy, and it isn't free of side effects. It packages your code, and before
it compares, it creates the missing secrets and SSM parameters a deploy would create, such as generated database
passwords.

## When two deploys of a stage run at once

A stack runs one deploy, rollback or delete at a time, including fast code-only deploys. A second deploy waits for the
first, prints who holds the stage while it waits, and then deploys on top of what the first one left. If a CI job is
killed mid-deploy, its hold on the stage expires within two minutes and the waiting deploy continues.

Waiting deploys don't keep the order of their commits, so an older commit can finish last. A GitHub Actions
`concurrency` group fixes that: it keeps only the newest waiting run, so the stage ends on the newest commit, and no
runner time is spent waiting. A GitLab `resource_group` runs one job at a time; set its process mode to `newest_first`
to get the same result.

The first deploy of a new stage is the exception. If two first deploys of the same stage run at once, the second stops
without changing anything. Run it again.

## Troubleshooting

### "needs confirmation, and this run cannot ask for it"

The deploy would delete or replace a stateful resource, or the command is a `delete`. The error lists the resources.
If the change is intended, run it again with `--yes`.

### "Missing 2 secret(s)"

The config references secrets that don't exist in the target region, and a CI job can't prompt for their values.
Create them once with [`stacktape secret set`](/cli/secret-set) and run the pipeline again.

### Authentication fails

Without an account, check that the step that sets AWS credentials runs before the deploy and that the role or keys are
valid. With the Console, check that `STACKTAPE_API_KEY` is set in the deploy step (the name is case-sensitive) and that
the key isn't revoked or expired under **API keys** in the Console.

### The stack name is too long

The stack name is the project name, a dash and the stage, and CloudFormation allows 128 characters. The error says how
long the stage can be for your project. Shorten generated stage names: `pr-42`, not the full branch name.
