# Organizations, Projects, and Stages

The Stacktape Console organizes work into three levels: organizations contain projects, and projects contain stages. A project represents a single application — typically one Git repository. A stage is an isolated deployment of that project (such as production, staging, or dev), with its own databases, functions, containers, and networking.

## How the hierarchy works

The Console structures work in three nested levels. An organization sits at the top and contains projects. Each project contains stages — isolated deployments of that application.

1. **Organization** — groups projects, team members, and settings
2. **Project** — one application, usually one Git repository
3. **Stage** — an isolated deployment (production, staging, dev)

### Organizations

An organization groups related projects, team members, and settings. In the Console, everything you see is scoped to the currently selected organization — projects, costs, alarms, and team settings all belong to the active organization. Switching organizations shows a different set of projects.

Organization-level build runner settings are stored on the organization and include CodeBuild compute type, base image, and additional install commands.

You can manage organizations from the CLI with [`stacktape org:create`](/cli/org-create) and [`stacktape org:list`](/cli/org-list).

### Projects

A Stacktape project represents a single application and usually maps 1:1 to a Git repository. Each project can have multiple stages — fully isolated deployments like `production`, `staging`, or `dev`.

The Projects page lists all projects in the selected organization. Each project card shows:

- **Project name** and connected Git URL (if any)
- **Number of deployed stages** — hovering the stage badge shows counts for alarming alarms, running stages, deployments in progress, errored stages, and not-yet-deployed stages
- **Last deployment time** (displayed as a relative timestamp like "2 hours ago")
- **Current month's cost** with a trend label. When previous-month cost is greater than zero, the label is a percentage change or `Flat`; otherwise it shows `No spend` or `New spend`

Projects are sorted by most recently updated stage, so active projects appear first. A filter input at the top narrows results by project name or Git URL using fuzzy search.

### Stages

A stage is a running deployment of a project — a complete, isolated set of AWS resources. Common stage names include `production`, `staging`, `dev`, or `testing`. Stages are fully isolated and do not share resources with each other; examples include containers, functions, databases, and other deployed resources.

To deploy a stage, you need a Stacktape configuration that describes which resources (containers, functions, databases, etc.) to deploy. You can share the same Stacktape configuration across all stages of a project (most common), or maintain separate configurations per stage when environments need different resource shapes.


> **Info:** Stages are sometimes called "environments" in other tools. Stacktape uses "stage" as the canonical term, but they mean the same thing — an isolated deployment of your project. See [Stages and environments](/configuration/stages-and-environments) for configuration patterns.


## Getting started

### Step 1 — Create a project

In the Console, navigate to **Projects** and click **Create new project**. The menu includes an option to create an empty project. For Git-based automatic deployments, see [GitOps with Console](/ci-cd-and-gitops/gitops-with-console).

You can also create a project from the CLI with [`stacktape project:create`](/cli/project-create).

### Step 2 — Create a stage

Inside the project view, click the **New stage** button in the left sidebar to open the stage creation form.

Once a stage is created, clicking it in the sidebar navigates to the deployment setup. If the project has a connected Git repository, the Console routes to `/projects/{project}/create-new-stage/{stage}`. If no Git repository is connected, the Console routes to `/projects/{project}/create-new-stage-using-cli/{stage}` instead.

### Step 3 — Deploy

Use [`stacktape deploy`](/cli/deploy) for CLI deployment — see that page for required options — or trigger a deployment through [GitOps](/ci-cd-and-gitops/gitops-with-console).

```bash
stacktape deploy --projectName my-app --stage production --region eu-west-1
```

Once a stage has been deployed, clicking it in the sidebar navigates to that stage's overview route (`/projects/{project}/{stage}/overview`). The project details query refetches every 6 seconds except on the create-new-stage page, so deployment status updates while the page is open.

## Common tasks

The Console provides shortcuts for day-to-day project management directly from the Projects page and the project overview sidebar.

### Filtering and finding projects

On the Projects page, use the filter input to search by project name or Git URL. The fuzzy search narrows results as you type. Projects are sorted by the most recently deployed stage, so active projects appear first. When no projects exist yet, the page displays "No projects created yet." The **Create new project** button remains available in the page header.

### Viewing stage details

Click a project card to open the project view. The left sidebar orders entries as: operation-only stages (in-progress or recently failed deployments), saved undeployed stages, deployed stages, and undeployed names without saved records. Dev-mode stacks are sorted after regular deployed stages within the deployed-stage portion. Clicking a deployed stage navigates to that stage's overview route (`/projects/{project}/{stage}/overview`).

### Configuring build runners

Organization-level build runner settings store the CodeBuild compute type, base image, and additional install commands on the selected organization. In the Console, navigate to **Projects**, click the gear icon in the page header, and select **Configure Codebuild settings**. This option is visible only to users with the `org:manage-codebuild-settings` permission.

The settings form lets you configure:

- **CodeBuild compute type** — the machine size used for builds
- **Codebuild base image** — the base image value saved for organization-level CodeBuild settings
- **Additional Codebuild install commands** — organization-level commands saved with the CodeBuild settings

Available compute types:

| Compute type | CPU | Memory |
|---|---|---|
| BUILD_GENERAL1_SMALL | 2 vCPU | 4 GB |
| BUILD_GENERAL1_MEDIUM | 4 vCPU | 8 GB |
| BUILD_GENERAL1_LARGE | 8 vCPU | 16 GB |
| BUILD_GENERAL1_XLARGE | 16 vCPU | 32 GB |
| BUILD_GENERAL1_2XLARGE | 72 vCPU | 144 GB |

For most projects, `BUILD_GENERAL1_SMALL` or `BUILD_GENERAL1_MEDIUM` is sufficient. Use larger sizes for projects with heavy compilation (e.g., large monorepos or native dependencies).

See [Build runners](/ci-cd-and-gitops/build-runners) for details on runner types and configuration options.

### Configuring project settings

From the project view, click the gear icon next to the project name to open the settings dropdown. This menu is visible only to users with the `projects:update-settings` permission. Available options depend on your project setup:

| Setting | When visible | What it does |
|---|---|---|
| **Configure Git deployments** | Git repository connected | Opens the project's Git deployments page — see [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) for setup |
| **Configure Runner** | Always (within settings dropdown) | Opens the project runner configuration modal |
| **Configure GitHub Actions runner** | Git repository connected | Set up a [self-hosted GitHub Actions runner](/ci-cd-and-gitops/self-hosted-github-actions-runners) |
| **Delete project** | User also has `projects:delete` permission | Remove the project from the organization |

### Redeploying a stage

When a redeploy is initiated from the project overview, the Console asks for confirmation of the target commit. After confirmation, the Console navigates to the deployment detail logs page (`/projects/{project}/{stage}/deployment-detail/{invocationId}?tab=logs`) where you can monitor build output. See [Build runners](/ci-cd-and-gitops/build-runners) for runner configuration.

### Deleting a stage or project

Deployed stages are deleted from the CLI with [`stacktape delete`](/cli/delete) — see that page for exact deletion semantics.

To delete a project, open the project settings dropdown (gear icon next to the project name) and select **Delete project**. The settings dropdown requires the `projects:update-settings` permission, and the **Delete project** option within it is shown only to users who also have the `projects:delete` permission. If the project still has deployed stages, the Console warns that it is advised to delete them before continuing and requires explicit confirmation.


> **Warning:** If a project still has deployed stages when you delete it, the Console warns that it is advised to delete them before continuing and requires explicit confirmation.


Non-deployed stages (created in the Console but never deployed) can be removed directly from the sidebar. This only removes the Console record — no AWS resources are affected because none were created. Failed stage entries can be dismissed from the sidebar; the confirmation says this removes deployment history for that stage.

## Access control

The Stacktape Console uses roles and permissions to control what team members can do within an organization. Key actions on the Projects and project overview pages are gated by the following permissions:

| Permission | Controls |
|---|---|
| `projects:delete` | Deleting a project (shown inside the project settings dropdown, which requires `projects:update-settings`) |
| `projects:update-settings` | Accessing project settings (Git deployments, runner config, GitHub Actions runner) |
| `deployments:delete-non-production` | Controls delete and dismiss actions on stage entries in the project sidebar |
| `org:manage-codebuild-settings` | Configuring organization-level CodeBuild settings |

Users without the required permission do not see the corresponding UI controls — for example, the project settings gear icon is hidden from users who lack `projects:update-settings`.

For a complete breakdown of roles, how permissions map to roles, and how to invite team members, see [Team and access control](/stacktape-console/team-and-access-control).

## Troubleshooting

Common issues when working with projects and stages in the Console.

### Failed stage in the sidebar

If a deployment fails, the stage appears as errored in the sidebar. You can dismiss a failed stage using the context menu on that stage entry. The confirmation says dismissing will remove the deployment history for that stage, then refetches the project and operation lists. If a later deployment succeeds, the stage appears through the normal deployed-stage list.

### Non-deployed stages in the sidebar

Stages created in the Console but never deployed appear in the sidebar as not-yet-deployed entries. You can delete these directly from the sidebar. This removes only the Console record — no AWS resources are affected because none were created.

### Cost shows $0 for active stage

Cost data comes from AWS Cost and Usage Reports, which are generated daily and may take up to a day to appear. Newly deployed stages may show zero cost until daily report data arrives. When previous-month cost is greater than zero, the trend label shows a percentage change or `Flat`; otherwise it shows `No spend` or `New spend`.

### Git repository not connected

If a project was created without linking a Git repository, the project card shows "Git repository not connected" instead of a Git URL. When a project has a connected Git repository, the project settings dropdown includes a **Configure Git deployments** option. When no Git repository is connected, the Console routes to `/projects/{project}/create-new-stage-using-cli/{stage}` for the stage setup flow.

## FAQ

### What is the difference between a project and a stage in Stacktape?

A project represents a single application, usually mapped to one Git repository. A stage is an isolated deployment of that project — like production, staging, or dev. Each project can have multiple stages, and each stage has its own databases, functions, containers, and networking. Think of projects as "what you're building" and stages as "where it's running."

### Do stages share resources with each other?

No. Stages are fully isolated and do not share resources with each other. Each stage has its own containers, functions, databases, and other deployed resources. This separation makes it safer to test changes in a staging stage without affecting production.

### Should I use one configuration per project or one per stage?

Most teams share a single Stacktape configuration across all stages — the same `stacktape.ts` deploys to production, staging, and dev. This keeps environments consistent and reduces configuration drift. Use separate configurations per stage only when environments genuinely need different resource shapes (for example, a smaller database instance in dev). See [Stages and environments](/configuration/stages-and-environments) for patterns.

### Can I move a project between organizations?

A project-move action is not available on the Projects or project overview pages. For organization management, see [Team and access control](/stacktape-console/team-and-access-control).

### What happens to AWS resources when I delete a stage?

Deployed stages are deleted from the CLI with [`stacktape delete`](/cli/delete) — see that page for exact deletion semantics, including which AWS resources are removed and whether the action can be reversed. If a project still has deployed stages, the Console advises deleting them before deleting the project.

### How long does cost data take to appear in the Console?

Cost data comes from AWS Cost and Usage Reports, which are generated daily and may take up to a day to appear. Newly deployed stages may show $0/mo until daily report data arrives. The project card displays the current month's cost alongside a trend label (`No spend`, `New spend`, a percentage change, or `Flat`).

### How do I set up a branch-per-stage workflow?

Connect a Git repository to your project, then open **Configure Git deployments** from the project settings to set up Git-based deployments. See [Stacks per Git branch](/ci-cd-and-gitops/stacks-per-git-branch-pattern) for the full pattern and [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) for setup instructions.

### How is the stage name used by the Console?

The Console looks up a stage's deployed stack using a stack name formed from the project name and the stage name. For example, a project named `my-app` with stage `prod` maps to a stack named `my-app-prod`. Keep stage names short and descriptive so the resulting stack name is easy to recognize.

### What is the difference between a Stacktape organization and an AWS account?

A Stacktape organization is a grouping layer for projects, team members, and settings within the Console. An AWS account is where your actual infrastructure runs. You connect one or more AWS accounts to your Stacktape organization so deployments can create resources in those accounts. The two concepts operate at different layers — the organization controls who can do what in the Console, while the AWS account controls where resources are provisioned. See [Connecting your AWS account](/stacktape-console/connecting-your-aws-account) for setup.

### When should I create multiple organizations?

Create separate organizations when you need distinct team boundaries — for example, separating work between different clients, business units, or teams that should not share projects or settings. Most teams need only one organization. If everyone works on the same set of projects, a single organization with role-based access (see [Team and access control](/stacktape-console/team-and-access-control)) is simpler to manage.

## Related features

- [Team and access control](/stacktape-console/team-and-access-control) — invite members, assign roles, and configure permissions
- [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) — auto-deploy stages when you push to connected branches
- [Stacks per Git branch](/ci-cd-and-gitops/stacks-per-git-branch-pattern) — map branches and PRs to stages dynamically
- [Build runners](/ci-cd-and-gitops/build-runners) — configure CodeBuild or EC2 runners for deployments
- [Connecting your AWS account](/stacktape-console/connecting-your-aws-account) — required before deploying any stage
- [Billing and subscription](/stacktape-console/billing-and-subscription) — organization-level billing management
- [Stages and environments](/configuration/stages-and-environments) — how stages work in Stacktape configuration
