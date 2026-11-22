# Previewing changes

[`stacktape diff`](/cli/diff) shows what a deploy would create, update, replace or remove in a deployed stage, without deploying. CloudFormation itself assesses the change, so it is the most reliable way to catch a replaced database or load balancer before it happens.

Use it before deploying to production, on stages with data, and in pull request checks. On a development stage you can usually deploy directly: `diff` packages your code just like a deploy, so it is not much faster.

## Run a preview

```bash
stacktape diff --stage production --region eu-west-1
```

The stage must already be deployed. For a stage that does not exist yet there is nothing to compare, so deploy it. Like `deploy`, the command takes the project and region from the config when it declares them, and `--config` for a config file elsewhere.

`diff` never executes the change. It does write a few things to AWS to compute it:

- It creates [secrets](/configuration/secrets) and SSM parameters that the config references but that do not exist yet. In a terminal it asks for their values; in a pipeline it fails and lists them, like `deploy`.
- It builds your functions and container images on your machine, using the build cache.
- It uploads the template to the deployment bucket and deletes it when done.
- It creates a CloudFormation change set and leaves it unexecuted.

Change sets are free; the main cost is the build time.

## Read the output

Each changed resource gets one line with an action, followed by up to three highlights of what changed inside it (for example `Lambda::Function: Code, MemorySize`).

| Symbol | Label | Meaning |
| --- | --- | --- |
| `+` | new | The resource will be created. |
| `~` | updated | The resource is updated in place. |
| `!` | replaced | CloudFormation creates a new resource and deletes the old one. |
| `-` | removed | The resource will be deleted. |

Below a resource, `Will replace` lists parts that CloudFormation must replace. `May replace` lists parts where it can only tell at deploy time.


> **Warning:** A replaced database, DynamoDB table, Redis cluster or bucket is a new, empty resource. Treat `May replace` on these like `Will replace`, and back up the data or change the config before you deploy.


`NO CHANGES DETECTED` means the config matches the stage. `NO MEANINGFUL STACKTAPE RESOURCE CHANGES` means CloudFormation reported only internal changes (for example a dependency it re-evaluates) that change nothing in your resources.

## Preview in a pull request

Run `diff` against the stage the pull request will deploy to, and post its output where reviewers see it. In CI the output is plain text automatically. Look for `replaced`, `removed`, `Will replace` and `May replace`.

```bash
stacktape diff --stage production --region eu-west-1
```

The job needs the same AWS access as a deploy, and every referenced secret must already exist, because a pipeline cannot answer the prompt. [Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) shows the credential setup. Coding agents get the result as JSON lines that include a summary of the changes.

## Unexpected changes

- **A resource that depends on one you changed.** CloudFormation can report a dependent resource as updated even when nothing changes for it.
- **A rebuilt container image with a new digest.** The service shows as updated even without a source change.
- **A secret or SSM parameter value changed** since the last deploy. Resources that reference it show as updated.

## diff, synth and the deploy plan

- `stacktape diff` needs a deployed stage and shows what AWS would change, including replacements.
- [`stacktape synth`](/cli/synth) writes the CloudFormation template without comparing it to anything. Use it to read the template or to audit it.
- `stacktape deploy` prints a count of resources to create, update, replace and delete before it changes the stack. It asks for confirmation when a data store would be deleted or replaced. See [Deploying stacks](/deployment-and-lifecycle/deploying-stacks#what-a-deploy-does).
