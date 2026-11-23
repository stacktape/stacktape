# Stacks per Git branch

A stage is one complete, separate deployment of your project: its own stack, functions, containers, databases and
URLs. Deriving the stage from the Git branch or pull request gives each line of development its own environment. This
page covers the three common shapes, how to name the stages and how to keep their cost down.

| Shape | Git event | Stage | Lives |
|---|---|---|---|
| Long-lived branch | Push to `main`, `develop` | A fixed name: `production`, `staging` | Permanently, updated on every push |
| Pull request preview | Pull request into `main` | `pr-<number>`, such as `pr-42` | Until the pull request closes |
| Feature branch | Push to `feat/payments` | A short name: `feature-payments` | Until the feature ships |

A deployment is identified by project, stage, AWS account and region. Two stages of a project in the same account and
region never share resources, except the non-production network described under [Cost](#cost).

## Long-lived branch stages

Map each permanent branch to a stage. The stage name doesn't have to match the branch:

| Branch | Stage |
|---|---|
| `main` | `production` |
| `develop` | `staging` |

- **With Git deployments**, create one **Push to a branch** Git deployment per branch. It watches one exact branch
  name. See [Git deployments](/ci-cd-and-gitops/gitops-with-console#create-a-git-deployment).
- **In your own pipeline**, deploy with a fixed stage in the job for that branch:
  `npx stacktape deploy --stage production --region eu-west-1 --yes`. A pipeline can also route by pattern, such as
  every `release-*` branch, which Git deployments can't. See [Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd).

## Pull request previews

Every pull request gets the stage `pr-<number>`. Reviewers try the change on real AWS resources before merge, and one
pull request never overwrites another's state.

- **With Git deployments**, create a **Pull request opened** Git deployment for the branch pull requests merge into.
  Stacktape deploys `pr-42` when pull request #42 opens, redeploys it on new commits, comments on the pull request with
  each result, and deletes the stage when the pull request closes if **Delete the preview when the pull request
  closes** is on. Pull requests from forks never get a preview.
- **In your own pipeline**, deploy on open and on new commits, and delete on close. On GitHub Actions, use the
  [preview workflow](/ci-cd-and-gitops/custom-ci-cd#pull-request-previews), which keeps deploys and the delete in
  order and skips forks. On GitLab CI, the merge request number is `$CI_MERGE_REQUEST_IID`:

```bash
npx stacktape deploy --stage "pr-${CI_MERGE_REQUEST_IID}" --region eu-west-1 --yes
npx stacktape delete --stage "pr-${CI_MERGE_REQUEST_IID}" --region eu-west-1 --yes
```

| CI | Pull request number | Branch name |
|---|---|---|
| GitHub Actions | `${{ github.event.pull_request.number }}` | `${{ github.ref_name }}` |
| GitLab CI | `$CI_MERGE_REQUEST_IID` | `$CI_COMMIT_BRANCH` |
| Bitbucket Pipelines | `$BITBUCKET_PR_ID` | `$BITBUCKET_BRANCH` |

To fill a preview's database with test data on each deploy, use a [deployment script](/resources/advanced/deployment-scripts)
or a [hook](/configuration/hooks-and-scripts). Treat preview data as disposable: deleting the stage deletes it.

## Feature branch stages

A feature that takes weeks, or that several people work on, can get its own stage for as long as it lives:

```bash
npx stacktape deploy --stage feature-payments --region eu-west-1
```

Delete it when the feature ships:

```bash
npx stacktape delete --stage feature-payments --region eu-west-1
```

A **Push to a branch** Git deployment for `feat/payments` can deploy it automatically. For a change that takes a day
or two, a pull request preview is simpler, because its cleanup is automatic.

## Naming stages

A stage name has at least 2 characters: lowercase letters, numbers and dashes. The stack name is the project name, a
dash and the stage, and CloudFormation allows 128 characters. Branch names often break these rules (`feat/Payments_v2`),
so derive a short name from your CI's branch variable instead of using the branch as it is:

```bash
STAGE="feature-$(echo "$BRANCH" | sed 's|.*/||' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | cut -c1-20)"
```

When neither `stackConfig.stageType` in your config nor the Console sets the stage type, the name decides it. Names with
`dev`, `staging`, `test`, `preview`, `pr` or `feature` are non-production; names with `prod`, `production` or `live` are
production. A name that says neither, such as `payments` or `mc`, gets a network of its own. Prefer `pr-42`,
`feature-payments` and `dev-mc`.

## Cost

Each stage costs what its resources cost, for as long as it exists. A preview with a database or a container keeps
billing when no one opens it. Functions, DynamoDB tables and other pay-per-request resources cost almost nothing while
idle.

Non-production stages in an AWS account and region share one VPC and, when they need outbound internet, one small NAT
instance (about $7.70 a month for all of them). Each stage keeps its own security groups, so a preview's database
admits only that preview's workloads. A new preview therefore doesn't create a VPC.

To keep previews cheap:

- **Delete them when the pull request closes.** Keep the checkbox on in the Git deployment, or run `stacktape delete`
  on close in your pipeline. Forgotten previews with a database are the usual cause of a surprise bill. A database
  that `stacktape init` added has deletion protection, which stops the delete; turn it off for previews as described
  in [Preview pull requests](/getting-started/after-the-first-deploy#preview-pull-requests).
- **Make them smaller.** Use [stage-specific configuration](/configuration/stages-and-environments) to give previews a
  smaller database instance or fewer containers than production.
- **Set a budget.** A [budget](/managing-costs/budgets) alerts you when the account's spend passes a threshold.
- **List what runs.** [`stacktape stack list`](/cli/stack-list) shows every deployed stage, so you can delete the
  stale ones.

Previews can be the wrong choice when one stage costs a lot per hour (large databases, many containers, GPU jobs) or
takes a long time to create. A shared staging stage with feature flags is then cheaper.
