# Resource Limit Guardrails

Resource limit guardrails are preventive policies that cap the size and count of compute resources in your stack. They stop deployments before they happen — if a [Lambda function](/resources/compute/lambda-function) exceeds a memory ceiling or a [container workload](/resources/compute/web-service) requests too much CPU, the deploy fails immediately with a clear error message. Configure them in the [Stacktape Console](/stacktape-console/console-overview) to enforce limits across your organization.

## How resource limit guardrails work

Stacktape evaluates guardrails at the start of every [`deploy`](/cli/deploy), [`codebuild:deploy`](/cli/codebuild-deploy), [`preview-changes`](/cli/preview-changes), and [`delete`](/cli/delete) command. If any guardrail is violated, the command fails with a `GUARDRAIL` error before any infrastructure changes are made. No resources are created, updated, or torn down.

Guardrails are set at the organization level in the [Stacktape Console](/stacktape-console/console-overview). They apply to every project and stage in the organization — individual projects cannot override or opt out of them. This makes guardrails the right tool for organization-wide cost and sizing policies.


> **Info:** Guardrails are preventive — they block non-compliant deployments before they start. For reactive monitoring of running resources, use [alarms](/observability/alarms) instead. The two complement each other: guardrails prevent misconfigurations, alarms detect runtime problems.


## When to use

Resource limit guardrails are most valuable when multiple developers or teams share an AWS account and you need to prevent cost surprises or capacity mistakes:

- **Cost control** — Cap Lambda memory and container CPU/memory to prevent developers from accidentally provisioning expensive resources. A single 10 GB Lambda or 16 vCPU container can dominate your AWS bill.
- **Staging environment discipline** — Allow larger resources in production but restrict development and staging stages to smaller sizes. Combine with [stage restriction guardrails](/guardrails/deployment) to apply different limits per stage.
- **Stack sprawl prevention** — Limit the number of resources per stack to keep infrastructure manageable and avoid hitting AWS CloudFormation or account-level limits.
- **Restricting resource types** — Block resource types that are expensive, not yet approved, or unnecessary for your workloads (e.g., block `open-search-domain` or `redis-cluster` if your team only uses serverless databases).

## When NOT to use

- **Solo developers or small teams** — If everyone deploying understands the cost implications, guardrails add friction without much benefit. Start without them and add guardrails when you onboard new team members or get your first surprise bill.
- **Prototyping stages** — Strict limits can slow experimentation. Consider applying guardrails only to production-bound stages rather than all stages.
- **As a replacement for alarms** — Guardrails only check configuration at deploy time. They cannot detect runtime cost spikes, memory leaks, or throttling. Use [alarms](/observability/alarms) for runtime monitoring and [budgets](/managing-costs/budgets) for spend alerts.

## Function memory limit

The `function-memory-limit` guardrail caps the maximum memory (in MB) that any [Lambda function](/resources/compute/lambda-function) or [edge function](/resources/compute/edge-function) in the stack can use. If a function's configured memory exceeds the limit, the deploy fails.

| Property | Type | Description |
|---|---|---|
| `maxMemoryMB` | `number` | Maximum memory in MB allowed for any Lambda function |

When a function does not explicitly set a `memory` value, Stacktape uses the default of 1024 MB for comparison. This means a guardrail with `maxMemoryMB` set to 512 would block functions that rely on the default memory — they would need to explicitly set `memory: 512` or lower.

**When to set this:** Most Lambda workloads run well between 256 MB and 2048 MB. Setting a ceiling of 2048 MB or 3008 MB prevents developers from accidentally choosing 10 GB when they meant 1 GB, while still leaving room for memory-intensive tasks like image processing. AWS Lambda memory scales linearly with CPU — a function with 1,769 MB gets 1 full vCPU.

## Function timeout limit

The `function-timeout-limit` guardrail caps the maximum timeout (in seconds) for any [Lambda function](/resources/compute/lambda-function) or [edge function](/resources/compute/edge-function). Functions configured with a timeout above the limit are blocked at deploy time.

| Property | Type | Description |
|---|---|---|
| `maxTimeoutSeconds` | `number` | Maximum timeout in seconds allowed for any Lambda function |

When a function does not explicitly set a `timeout` value, Stacktape uses the default of 20 seconds for comparison. A guardrail with `maxTimeoutSeconds` set to 10 would block functions using the default timeout.

**When to set this:** Long timeouts often indicate work that belongs in a [container workload](/resources/compute/web-service) or [batch job](/resources/compute/batch-job) rather than a Lambda function. A 30-second limit covers most API and event-processing use cases. If you need functions that run for minutes, consider whether they should be Lambda functions at all — AWS Lambda supports up to 900 seconds, but per-invocation cost grows linearly with duration.

## Container resource limit

The `container-resource-limit` guardrail caps the CPU (in vCPU) and memory (in MB) for all container workloads: [web services](/resources/compute/web-service), [private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service), [multi-container workloads](/resources/compute/multi-container-workload), and [batch jobs](/resources/compute/batch-job). You can set either or both limits independently.

| Property | Type | Description |
|---|---|---|
| `maxCpu` | `number` | Maximum vCPU allowed per container workload |
| `maxMemoryMB` | `number` | Maximum memory in MB allowed per container workload |

The guardrail checks the `resources.cpu` and `resources.memory` values configured on each container workload. If a workload does not explicitly configure CPU or memory, no comparison is made and the guardrail does not block it — only explicitly set values are checked.

**When to set this:** Container costs scale directly with CPU and memory allocations. For AWS Fargate workloads, CPU and memory determine per-second pricing. Capping at 4 vCPU and 8192 MB covers most web APIs and background workers. Reserve higher limits for compute-heavy workloads like video encoding or ML inference — and require those teams to explicitly request an exception or use a dedicated project.


> **Warning:** The container resource limit checks per-workload values, not per-container values. In a [multi-container workload](/resources/compute/multi-container-workload), the limit applies to the total resources allocated to the task, not to each individual container within it.


## Resource type restriction

The `resource-type-restriction` guardrail blocks specific Stacktape resource types entirely. Any stack containing a blocked resource type fails to deploy.

| Property | Type | Description |
|---|---|---|
| `blockedResourceTypes` | `string[]` | List of Stacktape resource types that cannot be deployed |

Resource types use their Stacktape identifier strings. For example, `open-search-domain` blocks [OpenSearch domains](/resources/databases/opensearch), `redis-cluster` blocks [Redis clusters](/resources/databases/redis), and `batch-job` blocks [batch jobs](/resources/compute/batch-job).

**When to set this:** Use this guardrail to enforce architectural decisions at the organization level. Common scenarios:

- **Block expensive managed services** — Prevent teams from adding OpenSearch or Redis clusters to development stages where a simpler solution would suffice.
- **Enforce serverless-only architectures** — Block container-based resource types like `web-service`, `private-service`, `worker-service`, and `multi-container-workload` to ensure teams use Lambda functions.
- **Limit to approved resource types** — In regulated environments, block resource types that haven't been reviewed by your security or compliance team.


> **Info:** Resource type restriction blocks the resource type from being present in the config at all. It does not support per-stage exceptions — if you need different allowed types per stage, combine this guardrail with separate [deployment guardrails](/guardrails/deployment) or use different organizations for different environments.


## Resource count limit

The `resource-count-limit` guardrail caps the total number of Stacktape resources in a single stack. If the stack's resource count exceeds the limit, the deploy fails.

| Property | Type | Description |
|---|---|---|
| `maxResources` | `number` | Maximum number of resources allowed per stack |

The count includes all resource types defined in the configuration — Lambda functions, databases, buckets, queues, and every other Stacktape resource. Each named resource in the `resources` object counts as one, regardless of how many underlying AWS resources it produces.

**When to set this:** Large stacks are harder to maintain, slower to deploy, and more likely to hit AWS CloudFormation limits (500 resources per stack by default). A limit of 20–30 resources per stack encourages teams to split large applications into separate projects. This also improves deploy speed — smaller stacks have faster CloudFormation changeset calculations.

## Combining guardrails

Guardrails are independent — you can enable any combination. A common production setup might include:

- **Function memory limit** of 2048 MB and **timeout limit** of 60 seconds to keep Lambda costs predictable
- **Container resource limit** of 4 vCPU and 8192 MB to prevent oversized Fargate tasks
- **Resource count limit** of 30 to encourage modular stacks
- **Resource type restriction** blocking expensive managed services in non-production stages

Combine resource limit guardrails with [deployment guardrails](/guardrails/deployment) (stage and region restrictions), [security guardrails](/guardrails/security-and-data-protection), and [database guardrails](/guardrails/databases) for comprehensive organizational governance.

## Guardrail violations

When a guardrail is violated, Stacktape throws a `GUARDRAIL` error with a specific message identifying the offending resource and the limit it exceeded. The error message includes the current value and the configured limit.

For example, a function memory violation produces:

```
Function "processImages" has memory 4096MB which exceeds the limit of 2048MB.
```

A container resource violation produces:

```
Container workload "api" has 8 vCPU which exceeds the limit of 4 vCPU.
```

The deploy, delete, or preview command stops immediately — no infrastructure changes are applied. The developer must either reduce the resource's configuration or request a guardrail adjustment from the organization administrator in the [Stacktape Console](/stacktape-console/console-overview).

## FAQ

### What's the difference between guardrails and alarms?

Guardrails are preventive — they block non-compliant deployments before any infrastructure changes are made. [Alarms](/observability/alarms) are reactive — they monitor running resources and alert you when metrics exceed thresholds. Use guardrails to prevent misconfigurations and alarms to detect runtime problems. A function might pass guardrail validation with 1024 MB memory but still trigger an alarm if it consistently runs out of memory at runtime.

### Can I set different resource limits for different stages?

Guardrails apply at the organization level and affect all projects and stages equally. To enforce different limits per environment, create separate organizations for production and development, each with its own guardrail configuration. Alternatively, use [stage restriction guardrails](/guardrails/deployment) to control which stages exist rather than varying limits per stage.

### Do guardrails affect functions that use the default memory or timeout?

Yes. When a Lambda function does not explicitly set `memory`, Stacktape uses the default of 1024 MB when evaluating the `function-memory-limit` guardrail. Similarly, functions without an explicit `timeout` are evaluated against the default of 20 seconds. If your guardrail sets a limit below these defaults, affected functions must explicitly configure a value within the allowed range.

### Are edge functions checked by function guardrails?

Yes. Both `function-memory-limit` and `function-timeout-limit` guardrails apply to [Lambda functions](/resources/compute/lambda-function) and [edge functions](/resources/compute/edge-function) equally. Any function exceeding the configured limit is blocked.

### What happens if a container workload doesn't set CPU or memory?

The `container-resource-limit` guardrail only checks explicitly configured `resources.cpu` and `resources.memory` values. If a container workload does not set these values, the guardrail does not block it. To enforce sizing on all container workloads, combine this guardrail with team documentation or code review processes that require explicit resource configuration.

### How much does a Lambda function cost per MB of memory?

AWS Lambda pricing is based on the number of requests and the duration billed in GB-seconds. More memory also allocates proportionally more CPU — at 1,769 MB a function gets 1 full vCPU. Doubling memory doubles the per-millisecond cost but often halves execution time for CPU-bound workloads, making the total cost similar. Use the `function-memory-limit` guardrail to prevent extreme allocations (e.g., 10 GB) that are rarely cost-effective.

### How does the resource count limit relate to AWS CloudFormation limits?

AWS CloudFormation has a default limit of 500 resources per stack, but each Stacktape resource generates multiple CloudFormation resources (IAM roles, security groups, log groups, etc.). A stack with 30 Stacktape resources might produce 200+ CloudFormation resources. Setting a `resource-count-limit` guardrail keeps stacks well within CloudFormation limits and encourages teams to split large applications across multiple projects.

### When should I use resource type restriction vs other guardrails?

Use `resource-type-restriction` when an entire category of resource is off-limits — for example, blocking all container workloads to enforce a serverless architecture. Use the other resource limit guardrails when the resource type is allowed but you want to cap its size. The two work well together: allow `web-service` as a type but cap it at 4 vCPU and 8192 MB memory.

### Do guardrails run during `stacktape delete`?

Yes. Guardrails are evaluated during [`delete`](/cli/delete) as well as [`deploy`](/cli/deploy), [`codebuild:deploy`](/cli/codebuild-deploy), and [`preview-changes`](/cli/preview-changes). For delete operations, resource-scoped guardrails (function limits, container limits, resource count, resource type restriction) only run if a project configuration file is available. Stage, region, and command restrictions always apply.
