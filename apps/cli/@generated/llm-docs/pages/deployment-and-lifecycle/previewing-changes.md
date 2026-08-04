# Previewing Changes

The [`stacktape diff`](/cli/diff) command shows what a deployment would change in your stack without applying anything. It packages workloads, generates a CloudFormation template, creates a change set against the currently deployed stack, and displays which resources would be created, updated, replaced, or removed. Use it before deploying to production, reviewing pull requests, or whenever you need to verify that a config change does what you expect.

## When to use diff

Stacktape diff is most valuable when the cost of a bad deploy is high — production stages, stacks with databases, or stacks shared by a team. Running `diff` before [`deploy`](/cli/deploy) gives you a clear picture of which resources will be created, updated, replaced, or removed.

Common scenarios:

- **Pre-production deploys** — verify that a config change doesn't accidentally replace a database or tear down a load balancer.
- **PR reviews** — run the preview in CI and post the output as a PR comment so reviewers see the infrastructure diff alongside the code diff.
- **Learning** — when you're new to Stacktape or infrastructure-as-code, the preview output helps you build a mental model of how config maps to AWS resources.

## When NOT to use diff

For a development stage where you can tolerate failed deployment attempts and inspect the result afterward, running [`deploy`](/cli/deploy) directly is usually faster. Preview adds overhead — your workloads get packaged and a change set is created — so it's not worth it for every quick iteration on a non-critical stage.

You also cannot use `diff` for a stage that hasn't been deployed yet — the command initializes with `commandRequiresDeployedStack: true`, so there must be an existing stack to compare against. For a first deploy, just run `deploy` directly.

## Running a preview

A typical invocation specifies a stage and a region. The stack for that stage must already be [deployed](/deployment-and-lifecycle/deploying-stacks) — you're comparing new config against the existing state.

```bash
stacktape diff --stage production --region eu-west-1
```

To specify a config file path explicitly:

```bash
stacktape diff --stage production --region eu-west-1 --configPath ./infra/stacktape.ts
```

For the full list of available flags, see the [`diff` CLI reference](/cli/diff).


> **Tip:** Use [`stacktape defaults:configure`](/cli/defaults-configure) to set a default stage, region, and AWS profile so you can run `stacktape diff` without flags during development.


## How diff works

The preview command follows a pipeline similar to [`deploy`](/deployment-and-lifecycle/deploying-stacks), but it never executes the change set — it only reads the reported changes.


## Flow
1. **Validate & prepare**: Parse config, validate guardrails, create any missing secrets and SSM parameters
2. **Package workloads**: Bundle Lambda code and build container images (caching avoids unnecessary rebuilds)
3. **Resolve & generate**: Resolve all resources and produce a new CloudFormation template
4. **Upload & validate**: Upload the template to S3 and validate it with CloudFormation
5. **Create change set**: Ask CloudFormation to compare old vs new template and report what would change
6. **Display results**: Compute a normalized template diff, filter internal churn, and show meaningful resource changes


### What the command does and does not modify

The `diff` command does not execute the CloudFormation change set (the command initializes with `commandModifiesStack: false`). It does not create, update, or delete any stack resources described by the change set.

However, the command is not entirely side-effect-free. Before creating the change set, Stacktape:

- **Creates missing secrets** — if your config references secrets that don't exist yet in Secrets Manager, the command creates them via the secrets preflight step.
- **Creates missing SSM parameters** — similarly, missing SSM Parameter Store entries are created.
- **Packages workloads** — Lambda bundles are built and container images may be built. Caching is enabled for this step.
- **Uploads the CloudFormation template** — the generated template is uploaded to S3 for CloudFormation to read.

These preflight steps are necessary to produce an accurate change set.

### Template normalization

Stacktape computes a normalized template diff before building the preview output. This normalization filters out internal runtime churn and dependency re-evaluation so the preview only shows changes you actually made, not Stacktape-internal changes with no user-visible effect.

### Change set creation

Stacktape creates a CloudFormation change set with property-level detail enabled to get AWS's own assessment of which resources would change, which would be replaced, and which replacements are conditional. This is the same mechanism AWS uses internally during a real update — the only difference is that the change set is not executed.

## Reading the output

The preview output lists each affected Stacktape resource along with its action, highlights of what changed, and replacement warnings.

### Actions

Each resource in the output is categorized by the type of change:

| Symbol | Label | Meaning |
| --- | --- | --- |
| `+` | **new** | Resource will be created. It exists in your config but not in the deployed stack. |
| `~` | **updated** | CloudFormation reports an update rather than a replacement. Inspect the highlights to understand what changes. |
| `!` | **replaced** | CloudFormation will create a replacement resource and retire the previous one. This can cause downtime and data loss for stateful resources. |
| `-` | **removed** | Resource will be deleted. It exists in the deployed stack but not in your config. |

### Highlights

For each changed resource, the preview shows up to three highlights describing the most impactful child-resource changes. Highlights are prioritized by importance — additions, removals, and replacements rank higher. Less significant changes are counted but not listed individually (e.g. `+ 4 more changed child resources`).

A highlight includes the type of child resource affected and what changed. For example, `Lambda::Function: Code, MemorySize` means the Lambda function's code and memory setting were modified. An `ECS::TaskDefinition added` highlight means a new task definition was introduced.

### Replacement warnings

Replacement warnings are the most important part of the preview output. When CloudFormation determines that a property change requires replacing a resource rather than updating it in place, the preview flags this clearly:

- **Will replace** — CloudFormation has determined that the resource must be replaced. For stateful resources, replacement means CloudFormation creates a replacement physical resource and retires the previous one, which can cause downtime or data loss unless you have backups.
- **May replace** — CloudFormation cannot determine whether replacement is needed until deploy time. This happens with certain property changes where the outcome depends on the specific values involved.


> **Warning:** Pay close attention to "will replace" warnings on stateful resources like [relational databases](/resources/databases/relational-database), [DynamoDB tables](/resources/databases/dynamodb), and [Redis clusters](/resources/databases/redis). Replacement means CloudFormation creates a new physical resource and retires the old one, which can cause downtime or data loss. Back up your data before deploying if you see these warnings.


### No changes detected

If your config matches the deployed stack exactly, the output shows `NO CHANGES DETECTED`. If CloudFormation reports internal changes that don't affect any user-facing Stacktape resource, the output shows `NO MEANINGFUL STACKTAPE RESOURCE CHANGES` — this means the infrastructure is effectively unchanged from your perspective.

## Agent mode output

When agent mode is active (via the `--agent` flag), the command switches from colorized interactive output to a compact, machine-readable format suitable for programmatic consumption by CI scripts, coding assistants, and automation tools.

The output follows three paths depending on what CloudFormation reports:

- **No changes at all** — when both raw CloudFormation changes and Stacktape resource changes are empty, the command prints `NO CHANGES DETECTED`.
- **Raw changes but no meaningful resource changes** — when CloudFormation reports internal or dependency-only changes that don't map to Stacktape resources, the command prints a `SUMMARY` line followed by `NO MEANINGFUL STACKTAPE RESOURCE CHANGES`.
- **Meaningful resource changes** — the command prints a `SUMMARY` line (e.g. `SUMMARY: 2 new, 0 removed, 0 replaced, 1 updated`) followed by per-resource detail.

The per-resource output includes:

- One line per changed resource with the action symbol, resource name, resource type, and action label
- Up to three highlights per resource
- Replacement warnings (`Will replace` / `May replace` lines) per resource

See [Agent mode in dev](/using-with-ai/agent-mode-in-dev) for broader context on using Stacktape with AI coding assistants.

Without `--agent`, the output is colorized and formatted for interactive terminal use.

## Using preview in CI/CD

Running `diff` in a CI pipeline before deploying is a reliable safety net for production stages. Capture the output and post it as a PR comment or Slack message so the team reviews infrastructure changes alongside code changes.

A typical CI workflow:

1. Run `stacktape diff` with `--stage production` on the PR branch. Use `--agent` for simpler text output that's easier to parse in CI.
2. Review the output for `Will replace` and `May replace` lines — treat these as a review signal before deploying.
3. After merge, run [`stacktape deploy`](/cli/deploy).

### Example: GitHub Actions preview step

Use `--agent` for output that's easier to parse in scripts:

```bash
stacktape diff --stage production --region eu-west-1 --agent
```

For a full CI/CD integration, see [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) or [GitOps with the Console](/ci-cd-and-gitops/gitops-with-console).

## Preview vs synth

Stacktape offers two ways to inspect what a deployment would produce:

| | `diff` | [`synth`](/cli/synth) |
| --- | --- | --- |
| **Requires deployed stack** | Yes | No |
| **Shows resource-level diff** | Yes — create, update, replace, delete | No — shows the raw template only |
| **Detects replacements** | Yes — via CloudFormation change set | No |
| **Packages workloads** | Yes | Yes |
| **Modifies stack resources** | No | No |
| **Best for** | Pre-deploy safety check | Inspecting the generated CloudFormation template (see the [CLI reference](/cli/synth) for exact behavior) |

Use `diff` when you want to know *what will change*. Use `synth` when you want to see the full generated CloudFormation template without needing a deployed stack — useful for auditing or debugging template generation.

## Troubleshooting

### "Stack does not exist" error

The `diff` command requires an already-deployed stack to compare against (the command initializes with `commandRequiresDeployedStack: true`). If the stage has never been deployed, deploy it first with [`stacktape deploy`](/cli/deploy). You cannot preview changes for a stage that doesn't exist yet.

### Preview shows changes you didn't make

Stacktape normalizes the template diff to filter out internal-only changes, but some edge cases can still surface unexpected diffs. The human-readable output describes these as "internal runtime churn or dependency re-evaluation." Common causes include:

- **Dependency re-evaluation** — CloudFormation may report changes to resources that depend on a resource you modified, even if the dependent resource itself is unchanged. The normalized preview filters these when no meaningful Stacktape resource changes are present, but they can still appear alongside real changes.
- **Container image digest changes** — if a container image is rebuilt and produces a different digest (even without source changes), the change set may report the associated resources as updated.
- **Changed secret or SSM parameter values** — if a referenced secret or SSM parameter value changed since the last deploy, resources that reference it may appear as updated in the change set.

### Preview takes a long time

The preview command packages all workloads (Lambda bundles, container images) before generating the change set. If packaging is slow, the bottleneck is usually container image builds. Stacktape enables caching for this step (`commandCanUseCache: true`) — if you're seeing slow builds, check that your Docker layer cache is working. See [container packaging](/packaging/containers/stacktape-buildpack) for details on optimizing build times.

## FAQ

### Does diff cost anything?

CloudFormation change sets are free. The only costs are S3 storage for the uploaded template (negligible — a few KB) and any container image builds that happen during packaging. The command enables packaging cache, but container builds can still dominate runtime.

### How is this different from CloudFormation drift detection?

Drift detection checks whether someone changed your AWS resources outside of CloudFormation (e.g., via the AWS Console or AWS CLI). Preview-changes checks what would happen if you deployed your *current Stacktape config* to an existing stack. They answer different questions: drift detection asks "has my infrastructure drifted from what was last deployed?", while preview asks "what would change if I deployed this new config?".

### What's the difference between "will replace" and "may replace"?

"Will replace" means CloudFormation has already determined the resource must be replaced — a replacement physical resource is created and the old one retired, which can cause downtime or data loss on stateful resources. "May replace" means CloudFormation cannot decide at change-set time; the outcome depends on the specific property values and the AWS service's behavior during the actual update. Treat "may replace" on stateful resources like [relational databases](/resources/databases/relational-database) and [DynamoDB tables](/resources/databases/dynamodb) as if it were "will replace" — back up your data before deploying.

### What's the difference between diff and Terraform plan?

Both show what an apply/deploy would change before doing it. Stacktape's `diff` uses CloudFormation change sets under the hood, which means AWS itself evaluates the diff. CloudFormation evaluates replacements and Stacktape surfaces both definite `Will replace` and conditional `May replace` warnings — without maintaining local state files. The trade-off is that `diff` requires a deployed stack to compare against, whereas `terraform plan` works against a local state file and can preview a first-time apply.

### Does diff validate my configuration?

Yes. The command runs the same validation and guardrail checks as [`deploy`](/cli/deploy) before creating the change set. If your configuration has errors, they'll surface during the preview rather than during a real deployment. The generated template is also validated against CloudFormation before the change set is created.

### When should I use diff vs just deploying?

Use `diff` for production stages, stages with stateful resources (databases, queues, tables), or any stage where an accidental replacement would cause real damage. For development stages where you're iterating quickly and can tolerate failed deploys, deploying directly is faster and usually safe enough. The preview adds the overhead of packaging and change-set creation, so treat it as a safety measure for high-risk deploys rather than a step in every iteration cycle.
