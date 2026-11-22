# Self-hosted GitHub Actions runners

Stacktape can run your GitHub Actions jobs on the project's [build runner](/ci-cd-and-gitops/build-runners), an EC2
instance in your AWS account. You keep your workflow files; a job opts in with one label. Use it when GitHub's hosted
runners are too slow for your builds, or when jobs need more CPU and memory than they offer.

If you only need push-to-deploy without tests in the workflow, [Git deployments](/ci-cd-and-gitops/gitops-with-console)
need no workflow file.

## Requirements

Stacktape runs a job only when all of these hold. Otherwise it cancels the job's workflow run.

- The repository is **private** and not archived. Public repositories are refused.
- The run doesn't come from a **fork**, and its event isn't `pull_request_target`.
- The repository is connected through the Stacktape GitHub App (see
  [Connect your Git provider](/ci-cd-and-gitops/gitops-with-console#connect-your-git-provider)) and linked to a
  Stacktape project.
- Exactly **one** project linked to that repository has GitHub Actions turned on.
- The runner's AWS account is still connected and active.

## Turn it on

1. In the Console, open **Configuration → Runners** and select the project's runner. A project that doesn't have a
   runner yet is listed under "projects have no runner yet"; open it from there.
2. On the **Settings** tab, under **GitHub Actions**, turn on **Run jobs on this runner**.
3. Add the label it shows to the jobs that should run there:

```yaml
name: Test and deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: [self-hosted, stacktape]
    steps:
      - uses: actions/checkout@v5
      - run: npm ci
      - run: npm test
      - run: npx stacktape deploy --stage production --region eu-west-1 --yes
```

Jobs run in the runner's AWS account and region, with its instance size. Jobs without the `stacktape` label run on
whatever their `runs-on` says, so one workflow can mix them: lint on `ubuntu-latest`, build and deploy on the Stacktape
runner.

## Credentials in the job

Stacktape commands in the job authenticate on their own. You don't store `STACKTAPE_API_KEY` or AWS keys in GitHub.
For each job, Stacktape issues a key limited to this project and the runner's AWS account, valid only while the job
runs and for at most two hours. Deploys from the job appear in the Console like any other.

Other tools in the job that need credentials, such as a package registry, get them the usual way, from GitHub secrets.

## What is installed

The runner runs Amazon Linux with Node.js (npm, pnpm and Yarn), Bun, Python 3, Go, Java (Corretto 11, 17 and 21),
Ruby, Docker, the AWS CLI, Git and common build tools such as `make` and `gcc`. Install anything else as a workflow
step. Each job runs as an unprivileged user in its own directory, with Docker in rootless mode. Package manager and
Docker caches stay on the runner's cache disk between jobs.

## Start time and cost

A stopped runner starts when a job arrives, so the first job after a quiet period waits for the instance to boot or
resume from hibernation. Later jobs start right away while the runner is still running. Each job also waits a few
seconds while Stacktape registers it with GitHub.

The runner stops after its idle time, 15 minutes by default. AWS bills compute while it runs and its disks all the
time; see [Build runners](/ci-cd-and-gitops/build-runners#what-it-costs). The runner runs up to two background jobs at
once (GitHub Actions jobs and AI runs) next to up to two deployments. Further jobs wait.

Compared with GitHub's hosted runners, you pay EC2 rates for the time the instance runs instead of per-minute runner
prices. That is usually cheaper for long or frequent builds and more expensive for a few short ones.

## Turn it off

Turn off **Run jobs on this runner** on the runner's **Settings** tab. First change the jobs' `runs-on` to a hosted
label such as `ubuntu-latest`: once no project runs them, Stacktape cancels workflow runs that still ask for the
`stacktape` label.

## A job was cancelled or never started

Check the [requirements](#requirements) first. The common causes are a public repository, a pull request from a fork,
a second project linked to the same repository with GitHub Actions on, and a disconnected AWS account. Jobs that did
run are listed on the runner's page in the Console with their status, and their output is in the GitHub job log.
