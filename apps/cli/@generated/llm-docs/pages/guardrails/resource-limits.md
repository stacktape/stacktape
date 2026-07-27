# Resource Limit Guardrails

Resource limit guardrails are preventive policies that cap compute sizing, allowed resource types, and total Stacktape resource count in your stack. They define maximum allowed values for governance checks — if a [Lambda function](/resources/compute/lambda-function) exceeds a memory ceiling or a [container workload](/resources/compute/web-service) requests too much CPU, the configuration is non-compliant with this guardrail.

## How resource limit guardrails work

Resource limit guardrails define maximum allowed values and blocked resource types used by governance checks to flag configurations that exceed configured limits. This page covers the resource-scoped guardrails: function memory and timeout limits, container CPU and memory limits, resource type restriction, and resource count limits. For stage, region, and command restrictions, see [deployment guardrails](/guardrails/deployment). For the full list of guardrail types, see the [guardrails overview](/guardrails/overview).

Resource limit guardrails are policy definitions, separate from individual Lambda or container resource properties. See the [guardrails overview](/guardrails/overview) for setup and management details.


> **Info:** Guardrails are preventive — they check configuration compliance before deployment proceeds. For reactive monitoring of running resources, use [alarms](/observability/alarms) instead. The two complement each other: guardrails prevent misconfigurations, alarms detect runtime problems.


## When to use

Resource limit guardrails are most valuable when multiple developers or teams share an AWS account and you need to prevent cost surprises or capacity mistakes:

- **Cost control** — Cap Lambda memory and container CPU/memory to prevent developers from accidentally provisioning expensive resources. Large Lambda memory settings or large container CPU allocations can materially increase AWS compute spend.
- **Staging environment discipline** — Apply sizing limits that keep development and staging stages cost-effective. These resource-limit guardrail property shapes do not include per-stage exception fields. If you need different limits by stage, model that at the guardrail-management layer rather than inside these individual property objects.
- **Stack sprawl prevention** — Limit the number of resources per stack to keep infrastructure manageable and avoid hitting AWS CloudFormation or account-level limits.
- **Restricting resource types** — Block resource types that are expensive, not yet approved, or unnecessary for your workloads (e.g., block `open-search-domain` or `redis-cluster` if your team only uses serverless databases).

## When NOT to use

- **Solo developers or small teams** — If everyone deploying understands the cost implications, guardrails add friction without much benefit. Start without them and add guardrails when you onboard new team members or get your first surprise bill.
- **Prototyping stages** — For prototyping, keep limits loose or manage stricter policy outside the individual resource-limit guardrail definition.
- **As a replacement for alarms** — Guardrails only check configuration at deploy time. They cannot detect runtime cost spikes, memory leaks, or throttling. Use [alarms](/observability/alarms) for runtime monitoring and [budgets](/managing-costs/budgets) for spend alerts.

## Function memory limit

The `function-memory-limit` guardrail defines the maximum memory (in MB) allowed for any [Lambda function](/resources/compute/lambda-function) in the stack. The type definitions describe this guardrail as applying to Lambda functions; they do not explicitly document whether [edge functions](/resources/compute/edge-function) are within enforcement scope.

| Property | Type | Description |
|---|---|---|
| `maxMemoryMB` | `number` | Maximum memory in MB allowed for any Lambda function |

Set the limit high enough for the normal Lambda configurations your team uses. See the [Lambda function](/resources/compute/lambda-function) page for resource defaults so you can choose a `maxMemoryMB` value that does not block functions using default settings.

**When to set this:** Most Lambda workloads run well between 256 MB and 2048 MB. Setting a ceiling of 2048 MB or 3008 MB prevents developers from accidentally choosing 10 GB when they meant 1 GB, while still leaving room for memory-intensive tasks like image processing. AWS Lambda memory scales linearly with CPU — a function with 1,769 MB gets 1 full vCPU.

## Function timeout limit

The `function-timeout-limit` guardrail defines the maximum timeout (in seconds) allowed for any [Lambda function](/resources/compute/lambda-function). As with the memory guardrail, the type definitions describe this as applying to Lambda functions and do not explicitly document whether [edge functions](/resources/compute/edge-function) are within enforcement scope.

| Property | Type | Description |
|---|---|---|
| `maxTimeoutSeconds` | `number` | Maximum timeout in seconds allowed for any Lambda function |

Set the limit high enough for the normal Lambda configurations your team uses. See the [Lambda function](/resources/compute/lambda-function) page for resource defaults so you can choose a `maxTimeoutSeconds` value that does not block functions using default settings.

**When to set this:** Long timeouts often indicate work that belongs in a [container workload](/resources/compute/web-service) or [batch job](/resources/compute/batch-job) rather than a Lambda function. A 30-second limit covers most API and event-processing use cases. If you need functions that run for minutes, consider whether they should be Lambda functions at all — AWS Lambda supports up to 900 seconds, but per-invocation cost grows linearly with duration.

## Container resource limit

The `container-resource-limit` guardrail defines the maximum vCPU and memory (in MB) allowed for container workloads. You can set either or both limits independently.

| Property | Type | Description |
|---|---|---|
| `maxCpu` | `number` | Maximum vCPU allowed per container workload |
| `maxMemoryMB` | `number` | Maximum memory in MB allowed per container workload |

The type definitions expose optional `maxCpu` and `maxMemoryMB` properties that define maximum container vCPU and memory. They do not document how omitted workload CPU or memory settings are evaluated against these limits, so teams that require explicit sizing should enforce that through code review or conventions.

**When to set this:** Container costs scale directly with CPU and memory allocations. For AWS Fargate workloads, CPU and memory determine per-second pricing. Capping at 4 vCPU and 8192 MB covers most web APIs and background workers. Reserve higher limits for compute-heavy workloads like video encoding or ML inference — and require those teams to explicitly request an exception or use a dedicated project.

## Resource type restriction

The `resource-type-restriction` guardrail configures a list of Stacktape resource types that are blocked, such as `open-search-domain` or `redis-cluster`. Stacks containing blocked resource types are non-compliant with this guardrail.

| Property | Type | Description |
|---|---|---|
| `blockedResourceTypes` | `StpResourceType[]` | List of Stacktape resource type identifiers that cannot be deployed |

Resource types use their Stacktape identifier strings. For example, `open-search-domain` blocks [OpenSearch domains](/resources/databases/opensearch), `redis-cluster` blocks [Redis clusters](/resources/databases/redis), and `batch-job` blocks [batch jobs](/resources/compute/batch-job).

**When to set this:** Use this guardrail to enforce architectural decisions at the organization level. Common scenarios:

- **Block expensive managed services** — Prevent teams from adding OpenSearch or Redis clusters to development stages where a simpler solution would suffice.
- **Enforce serverless-only architectures** — Add container-based resource type identifiers to `blockedResourceTypes` to ensure teams use Lambda functions.
- **Limit to approved resource types** — In regulated environments, block resource types that haven't been reviewed by your security or compliance team.


> **Info:** Stacks containing blocked resource types are non-compliant with this guardrail. The type definition exposes only `blockedResourceTypes` — there is no per-stage exception field on this guardrail.


## Resource count limit

The `resource-count-limit` guardrail caps the total number of Stacktape resources in a single stack. A stack above `maxResources` is non-compliant with this guardrail.

| Property | Type | Description |
|---|---|---|
| `maxResources` | `number` | Maximum number of resources allowed per stack |

**When to set this:** Large stacks are harder to maintain, slower to deploy, and more likely to hit AWS CloudFormation limits (500 resources per stack by default). A limit of 20–30 resources per stack encourages teams to split large applications into separate projects. This also improves deploy speed — smaller stacks have faster CloudFormation changeset calculations.

## Combining guardrails

A resource-limit policy commonly combines several guardrail definitions. A common production setup might include:

- **Function memory limit** of 2048 MB and **timeout limit** of 60 seconds to keep Lambda costs predictable
- **Container resource limit** of 4 vCPU and 8192 MB to prevent oversized Fargate tasks
- **Resource count limit** of 30 to encourage modular stacks
- **Resource type restriction** blocking expensive managed services in non-production stages

Combine resource limit guardrails with [deployment guardrails](/guardrails/deployment) (stage and region restrictions), [security guardrails](/guardrails/security-and-data-protection), and [database guardrails](/guardrails/databases) for comprehensive organizational governance.

## Guardrail violations

When a resource-limit guardrail finds a non-compliant configuration, the guardrail system rejects the configuration. Developers should reduce the resource size, remove the blocked resource type, or ask an administrator to adjust the guardrail policy.

## FAQ

### What's the difference between guardrails and alarms?

Guardrails are preventive — they check configuration compliance before deployment proceeds. [Alarms](/observability/alarms) are reactive — they monitor running resources and alert you when metrics exceed thresholds. Use guardrails to prevent misconfigurations and alarms to detect runtime problems. A function might pass guardrail validation with 1024 MB memory but still trigger an alarm if it consistently runs out of memory at runtime.

### Can I set different resource limits for different stages?

No — these resource-limit guardrail property shapes do not include per-stage exception fields, so configured limits apply uniformly within a single guardrail definition. To vary limits, manage stricter or looser policies at the guardrail-management layer, and combine with [deployment guardrails](/guardrails/deployment) to control which stages and regions are available. See the [guardrails overview](/guardrails/overview) for management options.

### Will a guardrail block functions that don't set memory or timeout explicitly?

It can, if you set the limit too low. The `function-memory-limit` and `function-timeout-limit` guardrails check the effective memory and timeout of every Lambda function, including those relying on implicit defaults. Make sure the guardrail ceiling is not below your normal baseline — check the [Lambda function](/resources/compute/lambda-function) page for default values before setting a limit.

### How much does a Lambda function cost per MB of memory?

AWS Lambda pricing is based on the number of requests and the duration billed in GB-seconds, so cost scales with the memory you allocate. More memory also allocates proportionally more CPU — at 1,769 MB a function gets 1 full vCPU. Use the `function-memory-limit` guardrail to prevent extreme allocations (e.g., 10 GB) that are rarely cost-effective.

### How does the resource count limit relate to AWS CloudFormation limits?

AWS CloudFormation has a default limit of 500 resources per stack, but each Stacktape resource generates multiple CloudFormation resources (IAM roles, security groups, log groups, etc.). A stack with 30 Stacktape resources might produce 200+ CloudFormation resources. Setting a `resource-count-limit` guardrail keeps stacks well within CloudFormation limits and encourages teams to split large applications across multiple projects.

### When should I use resource type restriction vs other guardrails?

Use `resource-type-restriction` when an entire category of resource is off-limits — for example, blocking all container workloads to enforce a serverless architecture. Use the other resource limit guardrails when the resource type is allowed but you want to cap its size. The two work well together: allow `web-service` as a type but cap it at 4 vCPU and 8192 MB memory.
