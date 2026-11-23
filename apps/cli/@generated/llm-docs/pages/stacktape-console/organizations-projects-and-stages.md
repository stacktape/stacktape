# Organizations, projects and stages

The Console organizes your work in three levels. An **organization** holds members, connected AWS accounts and projects. A **project** is one application, usually one Git repository. A **stage** is one deployment of that project, such as `production`, `staging` or `dev-alice`, with its own copy of every resource.

## Organizations

Everything in the Console belongs to the organization you have open: projects, costs, alarms, members and billing. Switch organizations in the header.

Most teams need one organization. Create another for a separate boundary, such as each client of an agency, a business unit, or work that must not share members and AWS accounts. Each organization has its own plan and bill. Your personal organization has only you; to work with others, create a team organization. From the CLI, use [`stacktape org create`](/cli/org-create) and [`stacktape org list`](/cli/org-list).

An organization is not an AWS account. You connect one or more AWS accounts to it, and its stages deploy into them. See [Connecting your AWS account](/stacktape-console/connecting-your-aws-account).

## Projects

A project appears in the Console with its first deploy, from the CLI or from a Git push. There's no separate setup: [`stacktape init`](/cli/init) writes a config with `projectName`, and a signed-in deploy creates the project. Stacks you deployed before you had an account appear as projects when you run [`stacktape connect`](/cli/connect). **New project** in the Console shows the commands to run, and [`stacktape project create`](/cli/project-create) creates an empty project.

Projects are listed on the **Projects** home, the most recently deployed first.

## Stages

A stage is one deployment of the project: its own CloudFormation stack, with its own databases, functions and URLs. Non-production stages in an AWS account and region usually share one VPC; [Stages and environments](/configuration/stages-and-environments#are-stages-fully-isolated-from-each-other) explains what that means. Most teams deploy the same config to every stage and change sizes per stage in the config.

Each stage costs money for its always-on resources. Delete stages you no longer use.

### Find a stage

Open a project. Its stages are a row of buttons in the project header, each with a dot for its state, so you see every stage's health on every page of the project. `production` and `staging` come first. Past five stages, the rest are in the menu at the end of the row, which has a **Find a stage** search and lists pull request previews under **Pull-request previews**. The AWS account and region of the open stage are at the right of the row.

Click a stage to open its overview: what is deployed, the resources and their URLs, recent deploys, logs, metrics and costs.

### Create a stage

From the CLI, deploy with a new stage name:

```bash
stacktape deploy --stage staging
```

In the Console, click **New stage** in the project header. Name the stage and pick the AWS account and region. A project with a connected Git repository also asks for the branch, commit and config, and **Deploy** starts the deploy on your runner. Without a repository, the page shows the CLI command to run. The new stage gets its own copy of every resource, and existing stages don't change.

### Redeploy, roll back or delete a stage

- **Redeploy** a stage from its overview. The Console asks you to confirm the commit, then shows the deploy's logs.
- **Roll back** with **Roll back to previous** on the stage's latest deploy, **Roll back to this** on an earlier deploy in its activity, or [`stacktape rollback`](/cli/rollback).
- **Delete** a deployed stage with [`stacktape delete`](/cli/delete). It deletes the stack and its data. A Developer can delete only stages that are not production.

A failed first deploy shows as a failed stage until you deploy it again or dismiss it. Dismissing removes its deploy history from the Console; it doesn't touch AWS.

### Project settings

The gear icon next to the project name opens the settings, for members with the `projects:update-settings` permission:

| Setting | Shown when | What it does |
|---|---|---|
| **Configure Git deployments** | A repository is connected | Opens [Git deployments](/ci-cd-and-gitops/gitops-with-console) for the project |
| **Configure Runner** | Always | Sets the project's [build runner](/ci-cd-and-gitops/build-runners) |
| **Configure GitHub Actions runner** | A repository is connected | Sets up a [self-hosted GitHub Actions runner](/ci-cd-and-gitops/self-hosted-github-actions-runners) |
| **Delete project** | You also have `projects:delete` | Removes the project from the Console |

A project created by a CLI deploy has no repository until you click **Connect** on its page, or accept the CLI's offer to deploy on push after a deploy.

Deleting a project in the Console removes it from the Console only. Its deployed stages keep running in AWS, so delete them first with `stacktape delete`. [`stacktape project delete`](/cli/project-delete) refuses while stages exist and prints the commands to delete them.

## Who can do what

Owners and Admins can do everything here. Developers deploy, roll back and delete non-production stages in the projects and AWS accounts chosen for them. Viewers see their projects, deploys, logs and metrics. See [Team and access control](/stacktape-console/team-and-access-control).

## Organizations, projects and stages FAQ

### Why does a new stage show $0?

AWS reports costs about a day after they occur, so a stage deployed today shows its costs tomorrow. See [Cost dashboards](/managing-costs/dashboards#when-numbers-are-missing).
