# Deployment scripts and hooks

Stacktape can run your own code at three points of a deploy. Pick by when the code has to run and what should happen when it fails. For database migrations, use a release command.

## Choose the right tool

| | [Release command](/deployment-and-lifecycle/release-commands) | [Hooks](/configuration/hooks-and-scripts#hooks) | [Deployment script](/resources/advanced/deployment-scripts) |
| --- | --- | --- | --- |
| Runs | In a one-off ECS task in your VPC, with the service's new image | On your machine or CI runner | As a Lambda function in your stack |
| When | During the deploy, before services and functions get the new code | Before or after `deploy`, `delete`, `dev` and `bucket sync` | After every other resource is deployed (`after:deploy`), or first in a stack delete (`before:delete`) |
| If it fails | The deploy stops; running code keeps serving | `before*`: the command stops before anything changes. `after*`: the new version stays live and the command exits with an error | The deploy fails; the changes stay unless automatic rollback is on |
| Use it for | Database migrations | Builds, tests, seeding, notifications | Work that must run in AWS on every deploy, whoever deploys |

The rest of this page shows one example of each and how they fit into a deploy.

## Order within a deploy

1. `beforeDeploy` hooks run on your machine. A failure stops here.
2. Stacktape packages and uploads your code.
3. Release commands run, then services and functions get the new code.
4. `after:deploy` deployment scripts run, once everything else in the stack is deployed.
5. `afterDeploy` hooks run on your machine.

## Release command: database migrations

```yaml
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: buildpack
        properties:
          sourceDirectoryPath: .
      resources:
        cpu: 0.25
        memory: 512
      connectTo:
        - database
      releaseCommand:
        command: npx prisma migrate deploy
        runWhenChanged:
          - prisma/migrations
```

The command uses the service's image, environment and network, so it reaches a private database without a bastion. Keep migrations compatible with the old code, because it keeps serving until the rollout finishes. See [Release commands](/deployment-and-lifecycle/release-commands).

## Hooks: run a script before or after a command

A hook runs a named script from the `scripts` section. This one builds the frontend before every deploy, so the [hosting bucket](/resources/frontend/static-hosting) uploads fresh files:

```yaml
scripts:
  buildFrontend:
    type: local-script
    properties:
      executeCommand: npm run build
      cwd: ./frontend

hooks:
  beforeDeploy:
    - scriptName: buildFrontend
```

An `afterDeploy` hook cannot stop or undo the deploy: by the time it runs, the new version is live. Its failure makes `stacktape deploy` exit with an error, so a CI job fails. Set `onFailure: continue` on hooks whose failure should only print a warning. Script types, `skipOnCI`, `connectTo` and bastion access are in [Hooks and scripts](/configuration/hooks-and-scripts).

## Deployment script: run code inside AWS

A deployment script is a resource: a Lambda function that CloudFormation runs as part of the stack. It runs no matter who or what deploys, and it can reach the VPC without a bastion when you set `joinDefaultVpc: true`.

```yaml
resources:
  syncSearchIndex:
    type: deployment-script
    properties:
      trigger: after:deploy
      packaging:
        type: js-bundle
        properties:
          entryfilePath: ./scripts/sync-search-index.ts
      connectTo:
        - search
      timeout: 300
```

- **Every deploy runs it.** A stack with an `after:deploy` script always deploys through CloudFormation, so [fast deploys](/deployment-and-lifecycle/deploying-stacks#fast-deployments) are off for it.
- **A failure fails the deploy.** Without [automatic rollback](/deployment-and-lifecycle/deploying-stacks#automatic-rollback), the stack stays in `UPDATE_FAILED` with the new code running. With `deploymentConfig.autoRollback: true`, CloudFormation returns the whole stack to the previous version.
- **A `before:delete` failure stops the delete.** The stack ends in `DELETE_FAILED`; fix the script and delete again.
- **It runs for at most 15 minutes**, the Lambda limit.

Run one by hand with [`stacktape deployment-script run`](/cli/deployment-script-run). Options and examples are on the [Deployment script](/resources/advanced/deployment-scripts) page.
