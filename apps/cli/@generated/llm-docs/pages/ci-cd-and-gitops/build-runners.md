# Build runners

A runner is an EC2 instance in your AWS account that builds and deploys a project for the Stacktape Console. Each
project gets one runner per AWS account and region it deploys to from Git. It keeps a build cache between deploys and
stops when it has nothing to do.

A runner runs:

- [Git deployments](/ci-cd-and-gitops/gitops-with-console): pushes, pull request previews and their deletion;
- `stacktape deploy --runner ec2`, when you want the build to run in AWS instead of on your machine;
- [GitHub Actions jobs](/ci-cd-and-gitops/self-hosted-github-actions-runners), when you turn them on for the project;
- AI runs you start from an incident.

Deploys from your terminal and from [your own pipeline](/ci-cd-and-gitops/custom-ci-cd) build on that machine and
don't need a runner.

## When it starts and stops

Stacktape creates a project's runner the first time it needs one, usually when you create the project's first Git
deployment. A job starts the stopped instance and reuses its cache. After the runner has been idle for 15 minutes,
Stacktape stops it. Instances that support EC2 hibernation hibernate instead, so they resume faster.

The idle time is a setting: from 5 minutes to 24 hours, or **Keep running**. A runner that keeps running has no start
delay and bills compute all the time.

A runner runs up to two deployments at once, plus up to two background jobs (GitHub Actions jobs and AI runs). More
work waits for a free slot.

## What it costs

AWS bills your account for:

- EC2 compute while the instance runs, including the idle time before it stops;
- its two EBS disks all the time, also while it is stopped;
- ordinary data transfer and CloudWatch charges from its work.

The default disks are a 50 GiB system disk and a 50 GiB build cache disk, about $8.80 a month in Ireland at gp3 rates.
Larger instance sizes get a larger system disk for hibernation. The cache disk grows as the cache fills, up to the
**Build cache limit** (200 GiB by default). The **Runners** page shows each runner's estimated cost from AWS list
prices in its region.

The runner, its disks and its IAM role are deleted when you delete the project or its last Git deployment in that AWS
account and region, unless GitHub Actions jobs still use it.

## Settings

Open **Configuration → Runners** in the Console, select the project's runner and open its **Settings** tab.

| Setting | What it does |
|---|---|
| **Instance size** | CPU and memory for builds. Bigger builds faster and costs more per hour. |
| **When idle** | How long the runner waits before it stops, or **Keep running**. |
| **Build cache limit** | The largest the cache disk grows, from 50 to 2,000 GiB. |
| **GitHub Actions** | Runs the repository's GitHub Actions jobs on this runner. See [Self-hosted GitHub Actions runners](/ci-cd-and-gitops/self-hosted-github-actions-runners). |
| **Setup commands** | Shell commands each deployment runs before it builds. See below. |

Changes apply when the runner next prepares for work. A new size replaces the instance after its current work and
keeps the build cache.

### Instance sizes

| Instance size | vCPU | Memory |
|---|---|---|
| `m6a.large` | 2 | 8 GiB |
| `m6a.xlarge` | 4 | 16 GiB |
| `c7a.xlarge` | 4 | 8 GiB |
| `c7a.2xlarge` | 8 | 16 GiB |
| `c7a.4xlarge` | 16 | 32 GiB |
| `c7a.8xlarge` | 32 | 64 GiB |

**Automatic**, the default, is `c7a.2xlarge`. In regions without C7a instances it is `c6i.2xlarge`, which has the
same size. `c7a` suits CPU-heavy work such as compiling and building images; `m6a` has more memory per vCPU. Start with
the default and change it when build times or memory use say so.

### Setup commands

Setup commands run before `stacktape deploy`, in a fresh checkout of your code. Use them to install a tool the build
needs, point a package manager at a private registry, or export variables for the build (`export NAME=value`).

- **Every project:** Owners and Admins edit them with **Setup commands** at the top of the **Runners** page. They run
  first.
- **One project:** edit them on the runner's **Settings** tab. They run after the commands for every project.

The commands run in order in Bash as a user without root, so install tools into the home directory (for example
`pip install --user` or `npm install -g`). If a command fails, the deployment stops and its log shows the output.
Deletes, rollbacks and GitHub Actions jobs don't run setup commands. A line starting with `#` names the commands under
it, and a blank line starts a new group. Pin tool versions and don't print secrets.

## Build cache

The cache disk keeps package manager caches, Docker layers and build output between jobs, so unchanged dependencies
and images aren't downloaded or rebuilt. Deployments and GitHub Actions jobs keep separate caches.
