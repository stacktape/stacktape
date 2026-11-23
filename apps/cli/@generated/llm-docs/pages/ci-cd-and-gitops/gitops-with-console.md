# Git deployments

A Git deployment makes the Stacktape Console deploy a stage when someone pushes to a branch, or deploy a preview stage
for every pull request. It works with GitHub, GitLab and Bitbucket, and there is no pipeline file to maintain.
Deployments build and run on a [runner](/ci-cd-and-gitops/build-runners) in your AWS account.

There are two kinds:

- **Push to a branch** deploys a fixed stage, such as `production`, on every push to one branch.
- **Pull request opened** deploys the stage `pr-<number>` for every pull request (merge request on GitLab) into one
  branch, redeploys it on new commits and deletes it when the pull request closes.

A Git deployment deploys on every matching event. If tests or an approval must pass first, require them in your Git
provider before merge, or deploy from [your own pipeline](/ci-cd-and-gitops/custom-ci-cd).

## Before you start

1. **An AWS account connected** to your Stacktape organization. See
   [Connecting your AWS account](/stacktape-console/connecting-your-aws-account).
2. **A Git connection** for the provider that hosts the repository. An Owner or Admin creates it once for the
   organization; the steps are below.
3. **The project linked to its repository.** Owners, Admins and Developers can link a repository and manage Git
   deployments.

## Connect your Git provider

In the Console sidebar, open **Configuration → Git connections**, click **Connect Git provider** and pick the
provider.

### GitHub

1. Choose **GitHub**. GitHub opens the installation page of the Stacktape GitHub App.
2. Choose the GitHub account or organization, and select the repositories Stacktape can access.
3. GitHub asks you to authorize Stacktape. This confirms that you installed the app; Stacktape removes the temporary
   authorization afterwards.

You are returned to the Console, and the connection appears in the list. One GitHub App installation can be connected
to only one Stacktape organization. Disconnecting GitHub in the Console also uninstalls the app from that GitHub
account.

### GitLab

GitLab connections work with groups on gitlab.com.

1. Choose **GitLab** and sign in to GitLab. Approve the access Stacktape requests (the `api` scope).
2. In **Choose a GitLab group**, select the group and click **Connect group**. Only groups you own are listed.
   Repositories in its subgroups are included.

Runners clone repositories with a read-only group deploy token named `Stacktape read-only …`, which Stacktape replaces
before it expires.

### Bitbucket

Bitbucket connects through the Stacktape app for Bitbucket Cloud. A workspace admin installs it.

1. Choose **Bitbucket**. Atlassian opens the installation page of the app. Install it in your workspace and approve
   the permissions it requests.
2. In Bitbucket, open **Workspace settings**. Under **Forge Apps**, select **Stacktape deployments** and click
   **Continue to Stacktape**.
3. In the Console, choose the Stacktape organization and click **Connect workspace**. A Stacktape Owner or Admin must
   finish this step.

If the Console says the connection link has expired, repeat step 2. A Bitbucket workspace can be connected to only one
Stacktape organization. Disconnecting Bitbucket in the Console doesn't remove the app from Bitbucket; uninstall it in
your workspace settings.

### Connection status

| Status | What it means |
|---|---|
| **Connected** | Pushes deploy. |
| **Needs approval** (GitHub) | Stacktape asked for write access, which it uses only to open security fix pull requests. Pushes still deploy. An owner of the GitHub account approves it in GitHub. |
| **Not deploying** (GitLab, Bitbucket) | The provider no longer accepts Stacktape's access, for example because the group owner revoked it. Pushes don't deploy until an Owner or Admin clicks **Reconnect**. |

### Connections from Stacktape v3

GitLab connections made with a personal or group access token, and Bitbucket connections made with the older OAuth
flow, are removed in v4. Projects that used them no longer deploy on push. Connect GitLab or Bitbucket again with the
steps above. If a project still doesn't deploy after that, email [support@stacktape.com](mailto:support@stacktape.com).
GitHub App connections keep working.

## Link a project to its repository

A project created by `stacktape deploy` from your machine has no repository yet. Open the project and click
**Connect** next to "No Git repository". Choose the repository from your Git connections and click **Connect**.
Deployments use the Stacktape config committed in the repository.

After the first successful deploy of a new stage, a CLI signed in to the Console offers to set this up. It asks
whether pushes to your current branch should deploy that stage, opens the browser to connect the provider if needed,
and creates the Git deployment.

## Create a Git deployment

1. Open the project, click the gear icon next to its name and choose **Configure Git deployments**.
2. With no Git deployments yet, the page offers two starting points: **Deploy production on every push to main** and
   **Preview every pull request into main** (with your stage and default branch). Click **Set up** on one, or click
   **New Git deployment**.
3. Choose **Push to a branch** or **Pull request opened**, and fill in the form:

| Field | What it does |
|---|---|
| **Branch** / **Pull requests into** | The branch that is pushed to, or that pull requests merge into. The name must match exactly; patterns are not supported. |
| **Deploys stage** | The stage to deploy, such as `production`. Only for pushes. Previews always use `pr-<number>`. |
| **Delete the preview when the pull request closes** | Only for pull requests, on by default. |
| **Stacktape config** | Shown only when the repository has more than one Stacktape config. |
| **Deploys to** | The AWS account and region, preset to where the project's newest stage runs. Click **Change** to pick others. |

4. Check the sentence at the bottom of the form, for example "Every push to main deploys production in eu-west-1",
   and click **Create Git deployment**.


> Screenshot: The New Git deployment dialog: Push to a branch, branch main, stage staging, the target AWS account and region, the sentence Every push to main deploys staging in eu-west-1, and the Create Git deployment button Caption: The sentence above the buttons says what every matching push will deploy, and where.


The form also says what the build costs. The first Git deployment in an AWS account and region starts a runner there:
AWS bills it by the hour while it builds and bills its disks while it is stopped, about $8.80 a month in Ireland. A
second Git deployment in the same place shares that runner. See [Runner cost](#runner-cost).

To change a Git deployment, open the row's menu and choose **Edit**. You can change the trigger, branch, stage, config
and preview deletion; for another AWS account or region, create a new one. **Delete** stops future deploys. Stages it
already deployed keep running; remove them with [`stacktape delete`](/cli/delete) or in the Console.

## What triggers a deployment

| Event | Result |
|---|---|
| Push to a branch with a **Push to a branch** rule | Deploys the rule's stage with the pushed commit. Creates the stage if it doesn't exist. |
| Pull request opened (or reopened) into a branch with a **Pull request opened** rule | Deploys `pr-<number>`. |
| New commits pushed to that pull request | Redeploys `pr-<number>` with the latest commit. |
| Pull request merged or closed | Deletes `pr-<number>` if the rule deletes previews. Otherwise the stage keeps running. |

These events don't deploy anything:

- pushes of tags, and branch deletions;
- pull requests from forks, so code from outside the repository never runs with your project's credentials;
- on GitLab, merge request changes that add no commits, such as a new title or reviewer;
- on GitHub, pull requests that Stacktape opens from `stacktape/fix-` branches.

On Bitbucket, any update to an open pull request, including a title change, redeploys its preview.

One event can match several rules. For example, two **Push to a branch** rules for `main` can deploy to two regions
or two AWS accounts, and each starts its own deployment.

A runner runs up to two deployments at once; more wait for a free slot. Deploys of one stage never overlap: if you push
again while a stage deploys, the new deployment waits for the current one.

## Following a deployment

Git deployments appear in the Console with their logs, like any other deployment.

- **Pull request previews:** Stacktape comments on the pull request when the preview deploy starts and updates the
  comment with the result. It comments the same way when it deletes a preview. If a preview can't start, for example
  because the AWS account is no longer connected, the comment says so.
- **GitHub:** each deployment also appears in the repository's **Deployments**, marked successful or failed.
- **Alerts:** to get a message in Slack, email or another channel, create a
  [notification rule](/observability/notifications) for the **Git deployments** events.

## Runner cost

Creating the first Git deployment for an AWS account and region prepares a runner in the background. It installs its
tools and stops until the first push arrives. It doesn't clone your repository during this preparation.

A stopped runner has no EC2 compute charge, but its disks are billed. The default 50 GiB system disk and 50 GiB build
cache disk cost about **$8.80 a month in Ireland** at gp3 rates. The cache disk grows with the build cache, up to the
limit set on the runner. The Console's **Runners** page shows the estimate for each runner. See
[AWS EBS pricing](https://aws.amazon.com/ebs/pricing/).

Stacktape removes the runner, with its disks, build cache and IAM role, when you delete the project or the last Git
deployment that uses its AWS account and region. A deployment that is already running finishes first. If the project's
[GitHub Actions runner](/ci-cd-and-gitops/self-hosted-github-actions-runners) uses the same account and region, the
runner stays.

Previews also cost whatever their AWS resources cost, until they are deleted. Keep **Delete the preview when the pull
request closes** on unless you need previews after merge, for example for QA.

## Provider permissions for security fix pull requests

When you ask Stacktape to prepare a security fix, it creates a `stacktape/*` branch, commits the selected file changes
and opens a pull request. It never force-pushes, writes to the default branch, closes pull requests or sets commit
statuses. Starting a fix needs `security:manage` access to the project.

The connection must allow these writes:

- **GitHub:** read and write access to repository Contents, Pull requests and Commit statuses. When Stacktape asks for
  new permissions, an owner of the GitHub account approves them on the existing installation. Until then the
  connection shows **Needs approval**.
- **GitLab:** the group connection's `api` scope covers the branch, commit and merge request. The read-only deploy
  token is used only for cloning.
- **Bitbucket:** read and write access to repositories and pull requests. When the app's permissions change, a
  workspace admin approves the app upgrade in Bitbucket.

Deployments keep working while new permissions wait for approval. Only security fix pull requests wait.

## A push did not deploy

Check, in this order:

1. **Configuration → Git connections**: the provider's connection. **Not deploying** on GitLab or Bitbucket stops all
   pushes; reconnect it. **Needs approval** on GitHub does not stop pushes, so look further.
2. The project page shows the repository, not "No Git repository".
3. A Git deployment of the project watches exactly the branch you pushed to, or, for previews, the branch the pull
   request merges into.
4. The event is one that deploys: not a tag, a branch deletion or a pull request from a fork.
5. On GitHub, the Stacktape GitHub App can access the repository. Check the app's repository access in your GitHub
   account or organization settings.

If the deployment started and failed, its log in the Console shows why.
