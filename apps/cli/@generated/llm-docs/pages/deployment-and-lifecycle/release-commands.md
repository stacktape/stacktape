# Release commands

Set `releaseCommand` on a service to run a command once on each deploy, before any workload gets the new code. Use it for database migrations.

```yaml configExample="complete"
resources:
  database:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('database-password')
      engine:
        type: postgres
        properties:
          version: '17.6'
          primaryInstance:
            instanceSize: db.t4g.micro
      accessibility:
        accessibilityMode: vpc
  api:
    type: web-service
    properties:
      packaging:
        type: buildpack
        properties:
          sourceDirectoryPath: .
          startCommand: npm start
      resources:
        cpu: 0.25
        memory: 512
      connectTo:
        - database
      releaseCommand: npx prisma migrate deploy
```

Stacktape runs the command in a one-off ECS task. The task uses the image you are about to deploy, with the same environment variables, secrets, IAM role and network access as the service, so it reaches a database with no public address without a bastion. The deploy waits for the task and prints its logs. If the command fails, the deploy stops and your running containers keep serving the old code.

## What your commands must allow

- **The old code runs against the new schema until the rollout finishes.** Keep migrations compatible with it. To remove a column, stop using it in one deploy and remove it in a later one.
- **A retry runs the command again.** A failed deploy, or a deploy that fails after the command succeeded, runs it again on the next attempt. Migration tools handle this already, because they record what they applied.
- **Nothing reverses the command.** Neither a failed deploy nor [`stacktape rollback`](/deployment-and-lifecycle/rollbacks) changes the database back. A rollback does not run the command either, because an old command must not run against a newer database. The old code has to work with the schema that is there.

## Running it only when something changed

By default, the command runs on each deploy that changes the image. Use `runWhenChanged` to run it only when the listed files or directories changed:

```yaml
releaseCommand:
  command: npx prisma migrate deploy
  runWhenChanged:
    - prisma/migrations
```

A deploy that changes none of the listed paths skips the command and takes no extra time. Use this with tools that apply only what is in one folder. Don't use it with a command that reads anything else that can change. Paths are relative to the project root, and each one must exist.

The command also runs when the environment variables or secrets of the service change through a CloudFormation deployment, even if the listed paths stayed the same. A replaced database therefore gets its schema.

## How it affects deploy time

| Deploy | Added time |
|---|---|
| The command does not run | None |
| Fast deployment, the command runs | About 15 to 30 seconds for the task to start, plus the command |
| Full deployment, the command runs | The same, inside the CloudFormation update |

A code-only deploy stays a [fast deployment](/deployment-and-lifecycle/deploying-stacks), and it runs the command before it updates any service. With [code swap](/deployment-and-lifecycle/code-swap), the command runs from the new image and the swap follows.

## Options

| Option | Default | Description |
|---|---|---|
| `command` | | The shell command. It runs through `/bin/sh -c` in place of the image's entry point. If the image needs its entry point, call it in the command. An image without a shell cannot run a release command. |
| `runWhenChanged` | | Files or directories that decide whether the command runs. |
| `timeout` | `3300` | Seconds the command can run, up to 3300. After that, the task stops and the deploy fails. |
| `container` | The main container | The container to run in. Required for a [multi-container workload](/resources/compute/multi-container-workload) with several containers. |

Containers that the chosen container depends on run too, but only the chosen container decides when the task ends. Load balancers, health checks and scaling don't apply to the task.

## Several commands

Each service can have its own release command. They run one at a time, in the order of the resources in your config. Every container service and function waits until all of them finished. If the command refers to a workload, for example through an environment variable, that workload has to exist first and can get new code before the command finishes. The deploy prints a warning that names it.

## `js-bundle` services

A `js-bundle` image contains only the bundled code, not your migration tool or migration files. For these services, Stacktape builds a second image of the whole project, used only by the release command. It builds it only when the command is due, so ordinary code deploys keep the fast bundle. Use `runWhenChanged` with these services: without it, each code change builds the second image and runs the command.

## Skipping and interrupting

Pass `--skipReleaseCommand` to deploy without running the command, for example when you ran it yourself or when you need to deploy a fix for it. The next deploy without the flag runs it.

If you cancel a deploy while the command runs, its task keeps running, because stopping a migration partway can leave the database half migrated. The next deploy refuses to start a second one until the task has finished.

## Logs

The output appears in the deploy output, prefixed with the service name. It is also kept in the `stp-release` log group of the service, even when the service's own logging is disabled. Use the `logs-release-command` link in the stack details to open it.

## When to use something else

Use an [`afterDeploy` hook](/deployment-and-lifecycle/deployment-scripts-and-hooks) for a command that needs the new code to be live, such as seeding through your API or warming a cache. A hook runs on your machine or CI runner, after the deploy. A stack with only functions has no container image to run a release command in, so use a [deployment script](/deployment-and-lifecycle/deployment-scripts-and-hooks) or a hook there.
