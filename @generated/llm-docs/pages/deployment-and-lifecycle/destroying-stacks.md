# Destroying Stacks

The [`stacktape delete`](/cli/delete) command deletes Stacktape deployment artifacts and asks AWS CloudFormation to delete the deployed stack. Stacktape initializes stack services, validates configured [guardrails](/guardrails/overview), prompts for confirmation, and checks termination protection before proceeding. CloudFormation then removes the stack's resources in dependency order, subject to each resource's AWS-level deletion policies and state. Use this to tear down development stages, expired previews, or decommissioned environments.

## How deletion works

Stacktape deletion follows a fixed sequence. Understanding the order helps when debugging failures or designing [lifecycle hooks](/configuration/hooks-and-scripts).

1. **Initialize stack services** — Stacktape loads the target stack's details so it can operate on the deployed stack.
2. **Load global config and validate guardrails** — Stacktape loads the organization-level global config and validates any configured guardrails against the requested operation.
3. **Initialize notifications** — The notification manager is initialized so deployment notifications can be sent during the operation.
4. **Prompt for confirmation** — Stacktape may prompt before proceeding. If the prompt is aborted, the command exits without deleting anything. See the [`stacktape delete` CLI page](/cli/delete) for flags that control this behavior.
5. **Check termination protection** — If the stack has `terminationProtection` enabled, the command stops with an error. You must redeploy with termination protection disabled before deleting.
6. **Run configured hooks** — If a configuration was loaded, Stacktape registers configured hooks and processes START hooks before any artifacts or resources are removed.
7. **Delete deployment artifacts** — Stacktape removes deployment artifacts managed outside the CloudFormation stack.
8. **Delete CloudFormation stack** — AWS CloudFormation removes all resources defined in the stack template in dependency order.


> **Warning:** Stacktape does not provide an undo for `stacktape delete`. CloudFormation attempts to delete all stack resources, and stateful data (databases, buckets, caches) is lost unless the underlying AWS resource has retention, backups, snapshots, versioning, or another preservation mechanism configured. Export any data you need before deleting.


## Using the CLI

Run [`stacktape delete`](/cli/delete) with the project name, stage, and region of the stack you want to remove.

```bash
stacktape delete --projectName my-app --stage dev --region eu-west-1
```

See the [`stacktape delete` CLI reference](/cli/delete) for the full list of available flags and options.


> **Info:** The delete command initializes with `commandRequiresConfig: false`, so deletion can run without loading the project config. Specify `--projectName`, `--stage`, and `--region` to target the stack. When a configuration is loaded, Stacktape additionally registers and processes the hooks defined in it. See the full flag reference on the [`stacktape delete` CLI page](/cli/delete).


## Termination protection

Stacktape supports CloudFormation termination protection to prevent accidental deletion of critical stacks. When the deployed stack has termination protection enabled, the delete command refuses to proceed and displays an error explaining that you must first deploy with `terminationProtection` set to `false`.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
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


Setting `terminationProtection: true` is recommended for production stages. The protection applies at the AWS CloudFormation stack level — even direct AWS Console access cannot delete a protected stack without first disabling the flag. To delete a protected stack: deploy with `terminationProtection: false`, then run `stacktape delete`.

## When to use termination protection

Enable termination protection on any stage that carries production data or serves live traffic. The cost is zero — it only adds a manual step (one redeploy) before deletion becomes possible. Skip it for ephemeral stages like PR previews or short-lived dev stages where fast teardown matters more than accidental-deletion safety.

## Lifecycle hooks

If Stacktape loads a configuration, the delete command registers configured [hooks](/configuration/hooks-and-scripts) and processes hooks with capture type `START` before artifact deletion and CloudFormation stack deletion. If no configuration is loaded, no hooks are registered — the stack is deleted directly.

See the [hooks and scripts reference](/configuration/hooks-and-scripts) for the full hook configuration options.

## Guardrails

Configured [guardrails](/guardrails/overview) are validated before the delete command proceeds. If validation fails, the delete command stops before artifact or stack deletion. Guardrails are enforced regardless of whether a configuration file is provided, because they are loaded from the organization-level global config.

See [guardrails overview](/guardrails/overview) for the available guardrail types and how to configure them.

## What gets deleted

When `stacktape delete` runs, two categories of resources are removed:

- **Deployment artifacts** — Stacktape calls its deployment artifact cleanup before requesting CloudFormation stack deletion.
- **CloudFormation-managed resources** — AWS CloudFormation then removes all resources defined in the stack template. The exact set depends on what your configuration declares — any Stacktape resource type (compute, databases, networking, storage, etc.) maps to underlying CloudFormation resources that are deleted in dependency order.

After Stacktape reports successful deletion, Stacktape has completed artifact cleanup and CloudFormation stack deletion. Resources retained by AWS-level deletion policies, snapshots, backups, or external configuration may still exist. There is no Stacktape-level backup or undo mechanism.

## Handling failed deletions

If AWS CloudFormation cannot delete a resource — due to dependencies, non-empty S3 buckets populated outside of Stacktape, or permission issues — the stack enters a `DELETE_FAILED` state. CloudFormation reports the specific resource and error in the stack events.

**Fix and retry.** Inspect the CloudFormation events (visible in the AWS Console or via `aws cloudformation describe-stack-events`), identify the failing resource and underlying AWS error, resolve it (for example, manually empty a bucket that was populated outside Stacktape, or disable AWS-level deletion protection on the resource), and run `stacktape delete` again.

Common causes of deletion failures:

| Cause | Fix |
|-------|-----|
| S3 bucket has objects added outside Stacktape | Empty the bucket manually, then retry delete |
| Resource has deletion protection enabled at the AWS level | Disable protection via the AWS Console, then retry |
| Security group is referenced by a resource in another stack | Delete or update the dependent stack first |
| IAM role is referenced by an external policy | Remove the external reference, then retry |

## When to delete vs. when to keep

Not every unused stage needs immediate deletion. The decision depends on what resources the stack contains and how quickly you can recreate it.

| Scenario | Recommendation | Why |
|----------|---------------|-----|
| PR preview stage after merge | Delete immediately | Accumulates cost, especially with always-on resources |
| Development stage unused for weeks | Delete | Redeployable from config in minutes |
| Staging environment between releases | Keep | Redeployment takes longer and may require data seeding |
| Production stage being replaced | Keep until the new stage is verified | Avoids downtime risk |

Idle container workloads ([web services](/resources/compute/web-service), [private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service)) incur hourly charges even when unused. Idle [Lambda functions](/resources/compute/lambda-function) and [DynamoDB tables](/resources/databases/dynamodb) with on-demand pricing cost nothing when they receive no traffic. [Relational databases](/resources/databases/relational-database) charge per hour while running. Factor the resource types in your stack into the keep-or-delete decision.

For PR-based workflows, automate deletion when the branch is deleted or the PR is closed. See [stacks per git branch](/ci-cd-and-gitops/stacks-per-git-branch-pattern) for the recommended pattern.

## FAQ

### Can I delete a stack without the original config file?

Yes. The `stacktape delete` command does not require a configuration file. Specify `--projectName`, `--stage`, and `--region` and Stacktape deletes the stack directly. The only limitation is that pre-deletion lifecycle hooks defined in the config file will not run, because no configuration is loaded.

### What happens to my data when I delete a stack? Can I recover it?

CloudFormation attempts to delete all resources in the stack, including databases, buckets, and caches, and Stacktape provides no undo — once CloudFormation finishes, the resources are gone. Stateful data survives only if the underlying AWS resource has retention, backups, snapshots, or versioning configured independently (for example RDS automated backups, S3 versioning, or DynamoDB point-in-time recovery). If you need to preserve data, export it before running delete; a pre-deletion [hook](/configuration/hooks-and-scripts) is the recommended approach for automated exports.

### How do I prevent team members from accidentally deleting production?

Use `terminationProtection: true` in your production config's `deploymentConfig` section. This requires an explicit redeploy with `terminationProtection: false` before anyone can delete the stack. For organization-wide enforcement, configure [guardrails](/guardrails/overview) to restrict the `delete` command or limit which stages can be modified.

### Does stack deletion cost anything?

The delete operation itself is free — AWS CloudFormation does not charge for stack deletions. You stop paying for resources after they finish deleting. However, if RDS final snapshots are created (an AWS-level setting), those snapshots incur ongoing S3 storage charges until you manually delete them.

### What if my stack is stuck in DELETE_FAILED?

CloudFormation reports the specific failing resource and error. Common causes include S3 buckets with externally-added objects, resources with AWS-level deletion protection, or cross-stack security group references. Inspect the stack events, fix the underlying AWS resource issue, and run `stacktape delete` again.

### What is the difference between deleting a stack and rolling back?

Deleting removes the entire stack and its resources. [Rolling back](/deployment-and-lifecycle/rollbacks) returns a stack to an earlier deployed state while keeping resources running. Use rollback when a deployment introduced a bug and you want to restore the previous working state. Use delete when you want to tear down the stage entirely.
