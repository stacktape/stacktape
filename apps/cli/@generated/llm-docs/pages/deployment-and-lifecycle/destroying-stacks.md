# Deleting stacks

[`stacktape delete`](/cli/delete) removes a stage: its CloudFormation stack, every resource in it, and the deployment bucket and image repository that hold its artifacts. Use it for development stages, closed pull request previews and environments you no longer need.


> **Warning:** There is no undo. Databases, buckets and caches are deleted with their data unless the AWS resource keeps a snapshot or backup. Export what you need first.


## Delete a stage

```bash
stacktape delete --stage dev --region eu-west-1
```

Run it in the project directory, or pass `--project` when you run it elsewhere. The command does not need the config file; without one, it simply skips your [`beforeDelete` and `afterDelete` hooks](/configuration/hooks-and-scripts). It shows the stack name, when the stack was created and how many resources it has, then asks for confirmation. In a script or pipeline, pass `--yes`.

When the command finishes, everything that costs money is gone. AWS may still be removing free leftovers, such as a disabled CloudFront distribution or the network interfaces of functions in a VPC; the command lists them. A `stacktape deploy` of the same stage waits until they are gone and then creates the stage again.

## What happens, in order

1. **Checks.** Your organization's [guardrails](/guardrails/overview) are checked. The command stops if the stack has termination protection, or if a resource has deletion protection on, such as a database with `deletionProtection: true`. Nothing has been deleted at this point.
2. **`beforeDelete` hooks.** They run when the config is available. Use one to export data.
3. **Artifacts.** Stacktape empties the deployment bucket and image repository, because CloudFormation cannot delete a bucket or repository that still has content.
4. **Stack.** CloudFormation deletes the stack's resources in dependency order. To save time, Stacktape starts deleting slow resources (RDS and Aurora instances, DynamoDB tables, Redis and Valkey clusters, OpenSearch domains, load balancers) itself, instead of waiting for the services that use them. It leaves alone anything CloudFormation would keep or snapshot, anything with deletion protection, and databases with read replicas.
5. **External artifact store.** For stacks that `stacktape deploy` created, the deployment bucket and image repository are not part of the stack. Stacktape deletes them after CloudFormation has accepted the stack delete.

If CloudFormation refuses the delete, for example because another stack imports one of this stack's outputs, Stacktape deletes nothing further and prints CloudFormation's reason.

## What is kept

- **Resources with a retain or snapshot policy.** For example, an RDS final snapshot stays and is billed until you delete it.
- **The shared network.** Stages in the shared non-production network leave the network and its NAT in place. They are removed automatically once no stage has used them for a day.
- **Shared resources used by other stages or projects.** The command lists them.
- **Secrets.** Secrets you created with `stacktape secret set` stay. Passwords that dev mode generated for a dev stage also stay, because another stage may use them; the command names them so you can delete them with [`secret delete`](/cli/secret-delete).

## Protect a production stage

Termination protection blocks every delete of the stack, also from the AWS console. Turn it on for stages with production data:


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
      terminationProtection: true
    }
  };
});
```


To delete a protected stage later, deploy it with `terminationProtection: false`, then run `stacktape delete`. Database `deletionProtection` works the same way: deploy with it off first. Stacktape never turns either protection off during a delete. For organization-wide rules, use [guardrails](/guardrails/overview).

## When a delete fails

If CloudFormation cannot delete a resource, the stack ends in `DELETE_FAILED` and the CLI prints the resource and AWS's error. When this happens after `stacktape delete` finished (while AWS was removing free leftovers), the next `stacktape deploy` of the stage stops with CloudFormation's reason. Fix the cause and run `stacktape delete` again.

| Cause | Fix |
| --- | --- |
| Another stack imports an output of this stack | Remove the import from the other stack, or delete that stack first |
| A security group is used by a resource in another stack | Update or delete the other stack first |
| An IAM role is referenced by a policy outside the stack | Remove the outside reference |
| Deletion protection was turned on outside Stacktape | Turn it off in the AWS console |

## Delete or keep a stage

Container services ([web services](/resources/compute/web-service), [private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service)) and [relational databases](/resources/databases/relational-database) cost money every hour they run, used or not. [Lambda functions](/resources/compute/lambda-function) and on-demand [DynamoDB tables](/resources/databases/dynamodb) cost nothing without traffic. A stage made of the latter can stay; a stage with containers or a database is worth deleting when nobody uses it.

Delete pull request previews when the pull request closes. [Git deployments](/ci-cd-and-gitops/gitops-with-console) can do this for you, and [Stacks per Git branch](/ci-cd-and-gitops/stacks-per-git-branch-pattern) shows how to do it in your own pipeline.
