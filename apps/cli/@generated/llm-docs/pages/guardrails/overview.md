# Guardrails Overview

Stacktape guardrails are organization-level preventive rules that restrict what can be deployed and how. They define allowed or blocked values for stages, regions, commands, resource types, and resource settings — enforcing security, cost, and compliance policies before infrastructure changes occur.

## Guardrails vs alarms

Guardrails and [alarms](/observability/alarms) serve fundamentally different purposes. Guardrails are preventive — they block non-compliant configurations before any infrastructure changes happen. Alarms are reactive — they detect problems in running infrastructure and send notifications. A production stack benefits from both: guardrails enforce policy upfront, alarms catch what policy cannot predict.

| | Guardrails | Alarms |
|---|---|---|
| **When** | Before infrastructure changes | After deployment, at runtime |
| **Action** | Blocks the operation | Sends a notification |
| **Scope** | Organization-wide | Per-resource, per-stack |
| **Purpose** | Prevent policy violations | Detect runtime issues |
| **Managed in** | [Stacktape Console](/stacktape-console/console-overview) | Stacktape config or Console |

## How guardrails work

Stacktape guardrails define organization-level restrictions for stages, regions, commands, resource types, and selected resource settings. Guardrail definitions contain allowed or blocked values; configurations that fall outside the defined policy are not permitted. Guardrails are managed in the [Stacktape Console](/stacktape-console/console-overview).

Stacktape supports 15 guardrail types. This page groups them into four sections for readability:

| Section | What it controls |
|---|---|
| [Deployment restrictions](/guardrails/deployment) | Stages, regions, commands |
| [Security and data protection](/guardrails/security-and-data-protection) | VPC access, deletion protection, DLQ, WAF, custom domains |
| [Resource limits](/guardrails/resource-limits) | Function memory/timeout, container CPU/memory, resource count |
| [Database restrictions](/guardrails/databases) | Allowed engines, blocked instance sizes, blocked resource types |

## Deployment restrictions

Deployment restriction guardrails control allowed stages, allowed AWS regions, and blocked commands. They operate on deployment parameters rather than on resource configuration.

- **Stage restriction** — Only allow deployments to specific stages. Configure an `allowedStages` list (e.g., `["production", "staging"]`); operations targeting any other stage name fail. Useful for enforcing naming conventions or limiting which stages can exist.
- **Region restriction** — Only allow deployments to specific AWS regions. Configure an `allowedRegions` list (e.g., `["eu-west-1", "us-east-1"]`); operations targeting other regions fail. Essential for data residency compliance and cost control.
- **Command restriction** — Block specific CLI commands. The `blockedCommands` list accepts command name strings. The source gives `["delete", "rollback"]` as examples — use this to prevent accidental production deletions or restrict destructive operations.

For full details, see [Deployment guardrails](/guardrails/deployment).

## Security and data protection

Security guardrails enforce infrastructure best practices that protect data and reduce attack surface. Each is a toggle — enabled or disabled — with no additional parameters.

- **Require VPC for databases** — When enabled, all databases must use VPC-only accessibility with no public internet access. This prevents accidentally exposing a database to the public internet. See [Relational databases](/resources/databases/relational-database) for supported accessibility modes.
- **Require deletion protection** — When enabled, all [relational databases](/resources/databases/relational-database) must have `deletionProtection` set to `true`, reducing accidental deletion risk for database resources.
- **Require dead-letter queue** — When enabled, all [SQS queues](/resources/messaging/sqs-queue) must have a `redrivePolicy` (dead-letter queue) configured. In AWS SQS, a dead-letter queue captures messages that fail processing, preventing silent message loss.
- **Require WAF on load balancers** — When enabled, all [application load balancers](/resources/networking/application-load-balancer) must have a [web application firewall](/resources/security/web-application-firewall) attached. This adds a layer of protection against common web exploits.
- **Require custom domain** — When enabled, public-facing [web services](/resources/compute/web-service) and [hosting buckets](/resources/frontend/static-hosting) must have a [custom domain](/resources/networking/custom-domains) configured. This enforces use of a configured custom domain for these resource types.

For full details, see [Security and data protection guardrails](/guardrails/security-and-data-protection).

## Resource limits

Resource limit guardrails define maximum allowed values for Lambda memory, Lambda timeout, container CPU, container memory, and resource count. Resources exceeding the configured maximum are not allowed by the guardrail.

- **Function memory limit** — Set a maximum memory allocation (in MB) for all [Lambda functions](/resources/compute/lambda-function) via `maxMemoryMB`. Any function exceeding the configured threshold fails validation. See [Lambda functions](/resources/compute/lambda-function) for AWS-side memory constraints.
- **Function timeout limit** — Set a maximum timeout (in seconds) for all [Lambda functions](/resources/compute/lambda-function) via `maxTimeoutSeconds`. See [Lambda functions](/resources/compute/lambda-function) for AWS-side timeout limits.
- **Container resource limit** — Set maximum vCPU (`maxCpu`) and memory in MB (`maxMemoryMB`) for container workloads.
- **Resource count limit** — Set the maximum number of resources allowed per stack via `maxResources`. Use it when your organization wants to keep stacks smaller and easier to review.

For full details, see [Resource limit guardrails](/guardrails/resource-limits).

## Database restrictions

Database guardrails standardize which database engines, instance sizes, and resource types your team can use.

- **Allowed database engines** — Configure which engine types are permitted via the `allowedEngines` list. Enter the engine identifiers you want to permit (for example, `postgres`, `aurora-postgresql`). Refer to [Relational databases](/resources/databases/relational-database) for the full list of supported engine identifiers. Deployments using engines not in the list fail.
- **Blocked instance sizes** — Block specific RDS instance sizes via the `blockedInstanceSizes` list (e.g., `["db.r5.4xlarge", "db.r6g.8xlarge"]`). Prevents teams from provisioning expensive database instances without approval.
- **Blocked resource types** — Block specific Stacktape resource types via the `blockedResourceTypes` list. This guardrail accepts any Stacktape resource type — the source gives `["open-search-domain", "redis-cluster"]` as examples. Use it to prevent teams from provisioning resource types your organization hasn't approved.


> **Info:** The blocked resource types guardrail accepts any Stacktape resource type. Use it to ban entire service categories regardless of whether they involve databases.


For full details, see [Database guardrails](/guardrails/databases).

## Managing guardrails

Guardrails are managed in the [Stacktape Console](/stacktape-console/console-overview). Enabling a toggle guardrail creates it; disabling it removes it. Value-based guardrails are saved with a definition containing their listed properties.

**Toggle-based guardrails** (require VPC for databases, require deletion protection, require dead-letter queue, require WAF on load balancers, require custom domain) are enabled or disabled with a switch.

**Value-based guardrails** (stage restriction, region restriction, command restriction, blocked resource types, function memory limit, function timeout limit, container resource limit, resource count limit, allowed database engines, blocked instance sizes) render an expandable configuration form with Save, Cancel, and — when active — Remove actions.

Active value-based guardrails display an `active` label next to the title and a one-line summary of the configured values.

For general organization access controls, see [Team and access control](/stacktape-console/team-and-access-control).

## When to use

Guardrails are most valuable when:

- **Multiple developers deploy independently** — guardrails prevent one team from accidentally exposing a database or using an unapproved region without relying on code review to catch it.
- **You need compliance boundaries** — data residency (region restriction), network isolation (VPC databases), or audit requirements (deletion protection) can be enforced consistently across the organization.
- **Cost control is important** — resource limits prevent over-provisioned Lambda functions or expensive database instances from slipping through.
- **You want consistent production standards** — require custom domains for web services and hosting buckets, and WAF for application load balancers, as a baseline policy.

## When NOT to use

- **Solo developers or small teams** — if you trust everyone deploying and rely on code review, guardrails add overhead without much benefit. Skip them until the team grows or compliance requirements arrive.
- **Early experimentation** — during prototyping, restrictive guardrails slow development. Consider enabling guardrails only once a project matures toward production.
- **Highly heterogeneous resource needs** — guardrails are loaded and saved for the selected organization in the Stacktape Console. The guardrail definitions do not include project-specific policy conditions — all restrictions apply organization-wide.

## FAQ

### What happens when a guardrail is violated?

Guardrail definitions contain allowed or blocked values for stages, regions, commands, resource types, and resource settings. When a configuration falls outside the defined policy, it is not permitted. For example, a stage restriction with `allowedStages: ["production", "staging"]` rejects deployments targeting any other stage name.

### Can I apply different guardrails to production vs development stages?

No — guardrails apply organization-wide. They are managed for the selected organization in the Stacktape Console, and the guardrail definitions do not include per-stage conditions for resource-level settings like memory limits or VPC requirements. You can use the stage restriction guardrail to limit which stage names are allowed, but the other restrictions apply to every stage equally.

### Can guardrails prevent accidental stack deletion?

Yes. The command restriction guardrail accepts a `blockedCommands` list with command name strings such as `delete` and `rollback`. Adding `delete` to `blockedCommands` blocks the [`stacktape delete`](/cli/delete) command for the organization.

### Can I restrict which AWS regions my team deploys to?

Yes. The region restriction guardrail accepts an `allowedRegions` list of AWS region identifiers (e.g., `["eu-west-1", "us-east-1"]`). Operations targeting any region not in the list fail. This is useful for data residency compliance and cost control, and catches violations before any infrastructure changes occur. See [Deployment guardrails](/guardrails/deployment).

### What is the difference between blocking a resource type and blocking a database engine?

The resource type restriction blocks entire categories of Stacktape resources — for example, blocking `redis-cluster` prevents anyone from adding a Redis resource to their stack. The database engine restriction is narrower: it controls which engine types (e.g., `postgres`, `aurora-postgresql`) are allowed within [relational database](/resources/databases/relational-database) resources that are still permitted. Use resource type restriction to ban service categories; use engine restriction to standardize on specific database engines within allowed database resources.
