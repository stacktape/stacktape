# Rollbacks

Stacktape has two recovery commands. [`stacktape rollback`](/cli/rollback) puts a previous release back when the last deploy succeeded but broke your app. [`stacktape stack recover`](/cli/stack-recover) undoes a deploy that failed and left the stack in `UPDATE_FAILED`. Neither rebuilds your code: rollback reuses the artifacts stored with the release.

## Which command to use

| Situation | Command |
| --- | --- |
| The last deploy succeeded, but the app is broken | `stacktape rollback` |
| A deploy failed and you want to fix it and continue | `stacktape deploy` after the fix |
| An update failed and you want to undo it | `stacktape stack recover` |
| The first deploy of a stage failed and you want it gone | `stacktape delete` |

A failed deploy keeps what it created by default, so deploying the fix is usually the fastest way forward. See [When a deploy fails](/deployment-and-lifecycle/deploying-stacks#when-a-deployment-fails).

## Roll back to an earlier release

Every deploy that changes something creates a release: `v000001`, `v000002` and so on. Stacktape keeps its CloudFormation template and its artifacts (function code, layers, container images) in the stage's deployment bucket and image repository.

Go back one release:

```bash
stacktape rollback --stage production --region eu-west-1
```

List the releases you can return to:

```bash
stacktape rollback --stage production --region eu-west-1 --list-versions
```

Go back to a specific release, or a number of releases back:

```bash
stacktape rollback --stage production --region eu-west-1 --target-version v000003
```

```bash
stacktape rollback --stage production --region eu-west-1 --rollback-steps 3
```

The rollback deploys the old template as a new release. Rolling back from `v000005` to `v000003` creates `v000006` with the code and template of `v000003`, so the next deploy continues from `v000006`. Bucket contents synced by [hosting buckets](/resources/frontend/static-hosting) are restored to what they were at that release; if that fails, the CLI warns and you redeploy the site from its commit.

Passing the current release as `--target-version` repairs a stage where a failed fast deploy left some workloads on newer code.

### What is checked before the rollback

Stacktape reads the target release's template and checks that what it needs still exists:

- The template, Lambda code, layers and Lambda container images must exist. If one was removed, the rollback stops before changing anything and names it. Roll back to a newer release that is still complete.
- A missing container image of an ECS service only produces a warning, and the rollback continues. New tasks of that service will fail to start because they cannot pull the image. If you see this warning, check that service after the rollback, or deploy a fix instead.

### What a rollback does not undo

- **Release commands and database changes.** A rollback does not run or reverse [release commands](/deployment-and-lifecycle/release-commands) or migrations. The database keeps its current schema, so the old code must work with it. Make migrations backward compatible if you want to be able to roll back.
- **Values fixed at deploy time.** `$File()` and other directives that read local or external state, custom directives and TypeScript transforms ran when the release was first deployed. The rollback uses those old results. The CLI warns when the release used any of them.
- **`afterDeploy` hooks.** They do not run during a rollback.

### How many releases you can return to

`deploymentConfig.previousVersionsToKeep` sets how many releases keep their artifacts. Older releases may still appear in the history, but their artifacts are gone and the rollback refuses them. More releases means more S3 and ECR storage.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/handler.ts'
    })
  });

  return {
    resources: { api },
    deploymentConfig: {
      previousVersionsToKeep: 20
    }
  };
});
```


## Recover a failed update

When an update fails without [automatic rollback](/deployment-and-lifecycle/deploying-stacks#automatic-rollback), the stack stays in `UPDATE_FAILED` with a mix of old and new configuration. `stacktape stack recover` asks CloudFormation to return it to the last successful deploy, then deletes the artifacts the failed deploy uploaded:

```bash
stacktape stack recover --stage production --region eu-west-1
```

You do not need it when the stack already rolled back on its own (`UPDATE_ROLLBACK_COMPLETE`), or when the stack is healthy and you want an earlier release (use `stacktape rollback`). A failed first deploy has no earlier state to return to; run [`stacktape delete`](/cli/delete) instead.

CloudFormation cannot always restore the previous state. It fails, for example, when someone deleted a resource outside CloudFormation or when the old configuration is no longer valid. The stack then needs manual recovery in the AWS CloudFormation console before Stacktape can deploy it again.
