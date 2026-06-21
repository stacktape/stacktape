# Deployment Guardrails

Deployment guardrails are preventive policies that restrict where and how your team deploys. They enforce allowed stages, limit AWS regions, block specific CLI commands, ban resource types, and cap resources per stack. Unlike [alarms](/observability/alarms) that react to runtime anomalies, guardrails block non-compliant operations before any infrastructure changes happen.

The type definitions include 15 guardrail types. This page focuses on stage, region, command, resource-type, and resource-count restrictions.

| Guardrail | Key property | What it controls |
|---|---|---|
| [Stage restriction](#stage-restriction) | `allowedStages` | Which stage names can be used |
| [Region restriction](#region-restriction) | `allowedRegions` | Which AWS regions can be targeted |
| [Command restriction](#command-restriction) | `blockedCommands` | Which CLI commands are blocked |
| [Resource type restriction](#resource-type-restriction) | `blockedResourceTypes` | Which Stacktape resource types are banned |
| [Resource count limit](#resource-count-limit) | `maxResources` | Maximum resources per stack |


> **Info:** Other guardrail types include VPC database requirements, deletion protection, dead-letter queues, Lambda memory and timeout limits, container CPU and memory limits, database engine and instance restrictions, WAF requirements, and custom-domain requirements. See [Security and data protection](/guardrails/security-and-data-protection), [Resource limits](/guardrails/resource-limits), and [Database guardrails](/guardrails/databases). The [Guardrails overview](/guardrails/overview) covers the full set.


## Where guardrails are configured

Guardrails are configured in the [Stacktape Console](/stacktape-console/console-overview), not in your project's `stacktape.ts` file. Each guardrail is modeled as a `GuardrailDefinition` with a `type` discriminator (for example `stage-restriction`) and a `properties` payload (for example `allowedStages`). All guardrail properties are optional — a restriction is only active when the corresponding property is set.

The rest of this page documents the structure of each deployment guardrail variant and when to reach for it.

## When to use deployment guardrails

Deployment guardrails are most valuable once your team grows beyond a single developer or when you start running production workloads. They prevent categories of mistakes — mistyped stages, accidental deletions, unapproved regions — that are difficult to catch in code review and expensive to reverse after the fact.

Enable deployment guardrails when any of these apply:

- **Multiple people deploy.** Without guardrails, any team member can deploy to any stage or region. A misspelled stage name creates an orphaned stack that accumulates AWS costs.
- **You have compliance requirements.** Regulations like GDPR or HIPAA may require infrastructure in specific AWS regions. Region restriction enforces this at the deployment layer rather than relying on manual discipline.
- **You want to protect production.** Restricting the `delete` command discourages accidental stack removal. Capping resource counts discourages monolithic stacks.

## When NOT to use deployment guardrails

During early prototyping, guardrails add friction. If you are a solo developer experimenting with Stacktape, you likely want the flexibility to spin up arbitrary stages, use any region, and run any command. Enable guardrails once your deployment conventions stabilize — typically when you have a `production` stage and at least one other team member deploying.

## Stage restriction

Stage restriction limits which stage names can be used for deployment. Set an `allowedStages` list containing permitted stage names — stages not in the list are blocked. The `allowedStages` property accepts an array of strings, for example `["production", "staging", "dev"]`.

Stage restriction prevents inconsistent naming from creating orphaned stacks. Without it, one developer might deploy to `prod`, another to `production`, and a third to `prd` — each creating a separate stack with separate AWS resources and costs. It also prevents ad-hoc stages from accumulating when developers forget to clean up after experiments.

### When to use

- **Enforce naming conventions.** Standardize on `production`, `staging`, and `dev` and prevent variants like `prod` or `test-123` from appearing.
- **Limit stage proliferation.** Stop one-off stages that accumulate AWS resources and costs without oversight.
- **Compliance workflows.** Restrict deployments to pre-approved stages that map to your release process, such as requiring all code to pass through `staging` before reaching `production`.

### When to skip

If your team intentionally creates per-developer or per-branch stages (see [stacks-per-git-branch pattern](/ci-cd-and-gitops/stacks-per-git-branch-pattern)), a fixed `allowedStages` list would block that workflow. Either skip this guardrail or maintain the list to include expected branch-derived stage names.

## Region restriction

Region restriction limits which AWS regions can be targeted for deployment. Set an `allowedRegions` list with permitted region identifiers — the `allowedRegions` property accepts an `AWSRegion[]`, for example `["eu-west-1", "eu-central-1"]`. Regions not in the list are blocked.

Region restriction is the simplest way to enforce data residency. If your team must keep data within the EU, restricting to `eu-west-1` and `eu-central-1` ensures no one accidentally deploys to `us-east-1`. It also helps control costs — some AWS regions have higher pricing — and keeps infrastructure concentrated where your team has operational familiarity.

### When to use

- **Data residency and GDPR.** Restrict deployments to EU regions to satisfy data sovereignty requirements without relying on manual checks.
- **Cost control.** Limit deployments to regions with lower pricing or where reserved capacity exists.
- **Operational simplicity.** Fewer regions means fewer places to monitor, debug, and maintain. Most teams start with one or two regions and expand deliberately.

### When to skip

If your team operates across many regions intentionally — for example, deploying to the region closest to each user segment — a region restriction would block legitimate deployments. In that case, skip this guardrail and rely on your own regional deployment strategy instead.

## Command restriction

Command restriction defines commands that are blocked. Set a `blockedCommands` list with command names — the property accepts a string array, for example `["delete", "rollback"]`. Use it for commands your team does not want allowed by policy.

Command restriction is most useful for protecting production stacks from destructive operations by policy. Listing `delete` in `blockedCommands` is a way to signal that stack removal is not an allowed action under the active guardrail.


> **Tip:** A common pattern is to block `delete` so that stack removal requires removing it from `blockedCommands` first. This adds a deliberate review step for destructive operations without removing the capability entirely.


### When to use

- **Discourage accidental deletions.** Add `delete` to `blockedCommands` so that stack removal is blocked until the guardrail is updated.
- **Restrict specific operations.** Block any command your team considers risky for unsupervised use — for example, `rollback` if your team wants rollback to require an explicit guardrail change.

### When to skip

For small teams where everyone needs full CLI access, command restriction adds friction without much safety benefit. It becomes valuable once your team is large enough that not everyone should be running destructive commands unilaterally.

## Resource type restriction

Resource type restriction blocks specific Stacktape resource types from being used. Set a `blockedResourceTypes` list containing the resource types you want to ban. The `blockedResourceTypes` property accepts an array of `StpResourceType` values.

This guardrail lets you curate which Stacktape resource types are allowed in your stacks. Block expensive resource types that haven't been approved, restrict types that require special operational expertise, or limit teams to a standard set of approved services. For example, to block OpenSearch and Redis: `["open-search-domain", "redis-cluster"]`.

### Resource type identifiers

The `blockedResourceTypes` property accepts values from the `StpResourceType` union, which corresponds to the `type` discriminator on each Stacktape resource definition — for example, `["open-search-domain", "redis-cluster"]`. For the full set of resource types you can reference here, see the [Resources](/configuration/resources) documentation — each resource page documents its own type identifier.

### When to use

- **Cost governance.** Block expensive resource types like `open-search-domain` or `redis-cluster` until they go through a cost-approval process.
- **Standardization.** Limit teams to approved resource types to reduce operational complexity and ensure everyone uses services the organization knows how to support.
- **Security constraints.** Prevent resource types that would require additional security review or compliance work before adoption.

### When to skip

If your team is small and everyone understands the cost and operational implications of each resource type, this guardrail adds unnecessary friction. It is most useful in organizations with multiple teams deploying independently, where one team's resource choices affect shared AWS account costs.

## Resource count limit

Resource count limit caps the total number of Stacktape resources allowed in a single stack. Set a `maxResources` threshold — if the stack's resource count exceeds it, the deployment is blocked. The `maxResources` property accepts a number, for example `20`.

Large stacks are harder to manage, slower to deploy, and riskier to update. As general AWS background, CloudFormation supports up to 500 resources per stack — but practical issues start well before that limit as deployment times grow, error surfaces widen, and blast radius increases. Setting a `maxResources` threshold encourages teams to decompose large applications into smaller, focused stacks.

### When to use

- **Prevent monolithic stacks.** Encourage teams to split large applications into multiple stacks rather than putting everything in one configuration file.
- **Improve deployment speed.** Smaller stacks deploy faster because fewer resources need to be provisioned, updated, and verified.
- **Reduce blast radius.** A failed deployment in a smaller stack affects fewer resources. Rollback is faster and safer.

### When to skip

Some applications genuinely need many resources — a microservices architecture with multiple Lambda functions, queues, and databases might exceed a conservative limit. Set the threshold high enough to accommodate real workloads, or skip this guardrail entirely if stack size is not a concern for your organization.

## Combining guardrails

You can configure multiple guardrails together; each guardrail expresses a separate restriction. Combine multiple deployment guardrails to build layered policies. For example, combining `allowedStages: ["production", "staging"]` with `allowedRegions: ["eu-west-1"]` ensures your team only deploys approved stages to approved regions.

Deployment guardrails also combine with guardrails from other categories. A common production policy might include:

| Guardrail | Configuration | Purpose |
|---|---|---|
| Stage restriction | `allowedStages: ["production", "staging", "dev"]` | Enforce naming conventions |
| Region restriction | `allowedRegions: ["eu-west-1"]` | Data residency |
| Command restriction | `blockedCommands: ["delete"]` | Discourage accidental stack deletion |
| Resource count limit | `maxResources: 30` | Prevent stack sprawl |
| [Require deletion protection](/guardrails/security-and-data-protection) | `enabled: true` | Protect database data |
| [Function memory limit](/guardrails/resource-limits) | `maxMemoryMB: 2048` | Cost control |


## Feature Comparison

| Feature | Stage restriction | Region restriction | Command restriction | Resource type restriction | Resource count limit |
| --- | --- | --- | --- | --- | --- |
| Policy style | Allow-list | Allow-list | Block-list | Block-list | Threshold |
| Scope | Stage name | AWS region | CLI command | Resource type | Entire stack |
| Best for | Naming conventions | Data residency | Protecting production | Cost governance | Architecture discipline |


## FAQ

### What is the difference between guardrails and alarms?

Guardrails are preventive — they block non-compliant operations before infrastructure changes happen. [Alarms](/observability/alarms) are reactive — they monitor running infrastructure and fire when metrics cross thresholds (error rates, latency, CPU). Use guardrails to prevent mistakes at deployment time; use alarms to detect problems at runtime. Both are part of a healthy production setup but serve fundamentally different purposes.

### How do Stacktape guardrails compare to AWS Service Control Policies?

As general AWS background, Service Control Policies (SCPs) restrict which AWS API calls IAM principals can make at the AWS Organizations level. Stacktape guardrails operate at the Stacktape layer — they restrict deployment parameters and configuration using concepts like stages, resource types, and stack size (as defined in the `GuardrailDefinition` union). SCPs are broader and can restrict AWS actions outside Stacktape's control. For defense-in-depth, use both — guardrails for Stacktape-level policy, SCPs for AWS-level access control.

### Can I block the delete command but still allow deployments?

Yes. The `command-restriction` guardrail's `blockedCommands` property is a string array — you list only the commands to block. Adding `"delete"` to the array blocks that specific command. For example, `["delete", "rollback"]` blocks both commands, but you can list any combination that fits your policy.

### Where do I configure guardrails?

Guardrails are configured in the [Stacktape Console](/stacktape-console/console-overview), not in your project's `stacktape.ts` file. The property shapes documented on this page correspond to the `GuardrailDefinition` union type defined in Stacktape's configuration types.

### Can I restrict any resource type, not just databases?

Yes. The `blockedResourceTypes` property accepts any value from the `StpResourceType` union — the same `type` discriminator that identifies each Stacktape resource. See the [Resources](/configuration/resources) documentation for the full list. This guardrail is not limited to database-related types.

### What happens when a guardrail is violated?

The operation is rejected by the guardrail — for example, a deployment targeting a stage outside `allowedStages` is not permitted by the stage-restriction guardrail. Adjust the deployment parameters or configuration to comply with the active guardrails, then retry.

### Should I use guardrails or IAM to restrict deployments?

They serve different layers. As general AWS background, IAM controls who can call AWS APIs — it answers "is this user allowed to create an EC2 instance?" Stacktape guardrails control policy at the Stacktape layer — using the `GuardrailDefinition` types like `stage-restriction`, `resource-type-restriction`, and `resource-count-limit` to enforce concepts that IAM alone cannot express (stage naming conventions, resource type bans, resource count caps). Use guardrails for Stacktape-specific policy and IAM for AWS-level access control.

### Can I use different guardrails for different stages?

The `GuardrailDefinition` types do not include a per-stage override field — each guardrail variant applies as a single policy without per-stage conditions. If you need different policies for production and development workflows, consider structuring your project boundaries to reflect that separation. The [Guardrails overview](/guardrails/overview) covers the full guardrail management model.

### How does resource count limit relate to AWS CloudFormation limits?

As general AWS background, CloudFormation supports up to 500 resources per stack. Stacktape's `maxResources` guardrail (from the `resource-count-limit` type) lets you set a lower threshold — such as 20 or 30 — to encourage smaller, more manageable stacks. A single Stacktape resource often maps to multiple CloudFormation resources (a [web service](/resources/compute/web-service) creates an ECS service, task definition, IAM role, and more), so CloudFormation's 500-resource limit can be reached well before your Stacktape resource count seems high.

### What stage names should I standardize on?

A common convention is `production`, `staging`, and `dev`. Some teams add `preview` for PR-based preview stages (see [stacks-per-git-branch pattern](/ci-cd-and-gitops/stacks-per-git-branch-pattern)). Avoid abbreviations like `prod` or `stg` — they invite inconsistency. Whatever names you choose, configure `allowedStages` to enforce them from the start, even if your team is small.
