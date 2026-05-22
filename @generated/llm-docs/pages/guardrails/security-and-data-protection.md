# Security and Data Protection Guardrails

Stacktape security guardrails are organization-level preventive policies configured in the [Stacktape Console](/stacktape-console/console-overview). They validate resource configurations against your team's security requirements — VPC-only database access, deletion protection, dead-letter queues, WAF on load balancers, custom domains, and approved database engines — and block non-compliant operations before any infrastructure changes occur.

## How security guardrails work

Security guardrails are preventive policy definitions that validate resource configurations and block non-compliant operations. This is fundamentally different from [alarms](/observability/alarms), which reactively notify you when a running system behaves unexpectedly at runtime.

Guardrails are managed at the organization level in the [Stacktape Console](/stacktape-console/console-overview) — they are not defined in your project's `stacktape.ts` config file. When any team member runs [`deploy`](/cli/deploy), [`delete`](/cli/delete), or [`preview-changes`](/cli/preview-changes), Stacktape fetches the organization's guardrail policies and validates the operation against them. If a guardrail check fails, the operation is blocked with a `GUARDRAIL` error identifying the violation — no infrastructure changes are made.

Each guardrail has a `type` and a `properties` object. The property shape depends on the guardrail type: `require-*` guardrails use an `enabled` boolean toggle, restriction guardrails use either allowlists or blocklists, and limit guardrails use numeric maximums.

| Aspect | Guardrails | Alarms |
|--------|-----------|--------|
| **Purpose** | Prevent non-compliant configurations | Detect runtime anomalies |
| **Timing** | Before infrastructure changes (preventive) | Runtime (reactive) |
| **Action** | Blocks the operation | Sends notification |
| **Scope** | Organization-wide policy | Per-resource monitoring |
| **Managed in** | [Stacktape Console](/stacktape-console/console-overview) | Stacktape config or Console |

## Security guardrail definitions

Each security guardrail is an object with a `type` string and a `properties` object. The five `require-*` guardrails use an `enabled` boolean toggle. The `database-engine-restriction` guardrail uses an `allowedEngines` allowlist.

```typescript
// require-* guardrails — enabled toggle
{ type: 'require-vpc-databases', properties: { enabled: true } }
{ type: 'require-deletion-protection', properties: { enabled: true } }
{ type: 'require-dead-letter-queue', properties: { enabled: true } }
{ type: 'require-waf', properties: { enabled: true } }
{ type: 'require-custom-domain', properties: { enabled: true } }

// Restriction guardrails — allowlist
{ type: 'database-engine-restriction', properties: { allowedEngines: ['postgres', 'aurora-postgresql'] } }
```

These definitions are configured per organization in the [Stacktape Console](/stacktape-console/console-overview) and apply to every deployment in that organization. See the [guardrails overview](/guardrails/overview) for the full list of all 15 guardrail types across deployment, security, resource-limit, and database categories.

## When to use

Enable security guardrails when your team needs to enforce compliance requirements without relying on code reviews alone to catch misconfigurations. They are most valuable for:

- **Multi-developer teams** where anyone can deploy independently — guardrails prevent a developer from accidentally deploying an internet-exposed database or a queue without a dead-letter queue.
- **Compliance-regulated organizations** (SOC 2, HIPAA, PCI-DSS) that mandate specific network isolation, data-protection, or encryption controls as baseline requirements.
- **Platform teams** providing Stacktape to internal customers who shouldn't need to memorize every security baseline to deploy safely.

## When NOT to use

Skip guardrails in early prototyping or single-developer projects where speed matters more than governance. Guardrails add a validation step to every deployment — for a solo developer who understands the tradeoffs, they slow iteration without adding safety. You can always enable guardrails later when the team grows or the project reaches production.

## Require VPC databases

The `require-vpc-databases` guardrail ensures all databases use VPC-only accessibility with no public internet access. When enabled, any [relational database](/resources/databases/relational-database) or [OpenSearch domain](/resources/databases/opensearch) configured without VPC-only accessibility is blocked. The accepted accessibility modes are `'vpc'` and `'scoping-workloads-in-vpc'` — any other mode (including the default `'internet'`) causes the operation to fail.

**When to enable:** Enable in production stages or any organization handling sensitive data. VPC-only databases cannot be reached from the public internet, eliminating an entire class of network-based attack vectors. The tradeoff is that you need a [bastion host](/resources/security/bastion-host) or VPC-connected workloads to access the database for administration and debugging. For most production workloads, VPC-only is the right default.

**When the default is fine:** During early development or prototyping, internet-accessible databases are more convenient for local development and ad-hoc queries. The risk is low when the database holds no real data.

A compliant [relational database](/resources/databases/relational-database) configuration with VPC-only access:


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres16 } from 'stacktape';
export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    engine: new RdsEnginePostgres16({
      primaryInstance: {
        instanceSize: 'db.t4g.micro'
      }
    }),
    accessibility: {
      accessibilityMode: 'vpc'
    }
  });

  return {
    resources: { mainDatabase }
  };
});
```


The `accessibilityMode` property controls how the database is reachable. Setting it to `'vpc'` restricts access to resources within the same VPC — workloads configured with [`connectTo`](/configuration/connecting-resources) connect automatically. The alternative `'scoping-workloads-in-vpc'` also satisfies this guardrail. The `instanceSize` property controls the compute and memory capacity — `db.t4g.micro` is a cost-effective choice for development and low-traffic production workloads. See the [relational database page](/resources/databases/relational-database) for supported instance sizes and accessibility modes.

## Require deletion protection

The `require-deletion-protection` guardrail requires all [relational databases](/resources/databases/relational-database) to have `deletionProtection` set to `true`. Deletion protection is an AWS RDS safeguard that prevents a database instance from being deleted through API operations — you must explicitly disable it before removing the database.

**When to enable:** Enable for any stage where accidental data loss is unacceptable — production, staging with real data, or shared development databases. The tradeoff is minimal: you must explicitly disable deletion protection before intentionally removing a database, which adds one deliberate step to prevent accidents.

**When the default is fine:** Skip for throwaway development stages where the database is recreated frequently and holds no important data.


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres16 } from 'stacktape';
export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    engine: new RdsEnginePostgres16({
      primaryInstance: {
        instanceSize: 'db.t4g.micro'
      }
    }),
    deletionProtection: true
  });

  return {
    resources: { mainDatabase }
  };
});
```


Setting `deletionProtection: true` satisfies this guardrail. With deletion protection enabled, AWS RDS rejects API calls that would remove the database instance — this is an AWS-level safeguard independent of Stacktape. Any relational database without this flag is blocked by the guardrail.

## Require dead-letter queue

The `require-dead-letter-queue` guardrail ensures every [SQS queue](/resources/messaging/sqs-queue) in the stack has a `redrivePolicy` (dead-letter queue) configured. In AWS SQS, a dead-letter queue captures messages that fail processing repeatedly, preventing silent data loss in message-driven architectures.

**When to enable:** Enable when your system processes messages representing real business events — orders, payments, notifications — where losing a message means losing data. Dead-letter queues give you a second chance to inspect and reprocess failed messages instead of having them silently disappear after exhausting retries.

**When the default is fine:** Skip for ephemeral or best-effort queues where occasional message loss is acceptable, such as analytics event buffers or non-critical notification streams.


Example (TypeScript):

```typescript
import { defineConfig, SqsQueue } from 'stacktape';
export default defineConfig(() => {
  const deadLetterQueue = new SqsQueue({});

  const orderQueue = new SqsQueue({
    redrivePolicy: {
      deadLetterQueue: 'deadLetterQueue',
      maxReceiveCount: 3
    }
  });

  return {
    resources: { deadLetterQueue, orderQueue }
  };
});
```


The `redrivePolicy` specifies which queue receives failed messages (`deadLetterQueue`) and how many receive attempts are allowed before a message is moved there (`maxReceiveCount`). A `maxReceiveCount` of 3–5 is typical — low enough to catch persistent failures quickly, high enough to tolerate transient errors. Monitor your dead-letter queue with [alarms](/observability/alarms) to get notified when messages land there.

## Require WAF

The `require-waf` guardrail requires all [application load balancers](/resources/networking/application-load-balancer) to have a [web application firewall](/resources/security/web-application-firewall) attached. The guardrail checks that a firewall reference exists — the protection you get depends on the AWS WAF rules you configure on the firewall resource itself.

**When to enable:** Enable for public-facing applications that handle user input, authentication, or sensitive data. AWS WAF can defend against common web exploits including SQL injection and cross-site scripting. Most production APIs serving public traffic benefit from WAF.

**When the default is fine:** Skip for internal-only load balancers, development stages, or stages behind a separate security layer. Also consider skipping for very low-traffic applications where the per-request WAF cost isn't justified.

**Cost tradeoff:** AWS WAF charges per rule group and per million requests evaluated. The exact cost depends on the rules you configure and your traffic volume. For high-traffic production APIs, WAF is a standard best practice. For low-traffic internal tools, the cost may not be justified. Check current AWS WAF pricing for your region.

A compliant [application load balancer](/resources/networking/application-load-balancer) configuration with a firewall attached:


Example (TypeScript):

```typescript
import { defineConfig, ApplicationLoadBalancer, WebAppFirewall } from 'stacktape';
export default defineConfig(() => {
  const apiFirewall = new WebAppFirewall({});

  const loadBalancer = new ApplicationLoadBalancer({
    useFirewall: 'apiFirewall'
  });

  return {
    resources: { apiFirewall, loadBalancer }
  };
});
```


The `useFirewall` property references a [web application firewall](/resources/security/web-application-firewall) resource by name. The guardrail only verifies that the reference exists — you still need to configure the WAF rules on the `WebAppFirewall` resource to define what threats are blocked. See the [web application firewall page](/resources/security/web-application-firewall) for rule configuration.

## Require custom domain

The `require-custom-domain` guardrail ensures public-facing [web services](/resources/compute/web-service) and [hosting buckets](/resources/frontend/static-hosting) have a [custom domain](/resources/networking/custom-domains) configured. Use it when production endpoints must be served from domains your team controls rather than auto-generated AWS URLs.

**When to enable:** Enable for production stages where URL stability, branding, and domain ownership matter. Custom domains give your users a predictable, professional endpoint. They also let you migrate backends without changing the URL your consumers depend on.

**When the default is fine:** Skip for development and staging stages where custom domains add DNS propagation delay and certificate provisioning time without adding value. Auto-generated URLs are perfectly adequate for internal testing.

A compliant [web service](/resources/compute/web-service) configuration with a custom domain:


Example (TypeScript):

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/server.ts'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    },
    customDomains: [
      {
        domainName: 'api.example.com'
      }
    ]
  });

  return {
    resources: { api }
  };
});
```


The `customDomains` array must contain at least one entry for web services and hosting buckets to satisfy this guardrail. See the [custom domains page](/resources/networking/custom-domains) for domain configuration options including DNS setup and certificate provisioning.

## Database engine restriction

The `database-engine-restriction` guardrail limits which database engine types can be used. You define an `allowedEngines` list — for example, `["postgres", "aurora-postgresql"]` — and any database using an engine type not on the list is blocked. This guardrail operates on engine families (like `postgres` or `aurora-postgresql`), not on specific engine versions.

**When to enable:** Enable when your organization needs to standardize on specific database engine families:

- **Enforce approved engines** — restrict deployments to engine families your DBA team actively supports and has runbooks for. This reduces operational risk when incidents happen.
- **Standardize across teams** — prevent teams from deploying database engine types your organization has not approved, keeping the technology stack consistent.
- **Meet compliance requirements** — some compliance frameworks mandate specific database technologies or encryption capabilities available on certain engine families.

**When the default is fine:** Skip when your team is small enough that engine choice is a conversation rather than a policy, or when you're exploring different database technologies and don't want to constrain options prematurely.

This guardrail is also covered on the [database guardrails](/guardrails/databases) page, which includes the related `database-instance-restriction` guardrail for controlling instance sizes.

## Resource type restriction (security use)

The `resource-type-restriction` guardrail blocks specified resource types from being deployed. While covered in detail on the [deployment guardrails](/guardrails/deployment) page, it has a clear security application: blocking resource types that don't meet your organization's compliance or operational requirements.

The `blockedResourceTypes` property accepts a list of Stacktape resource type identifiers — for example, `["open-search-domain", "redis-cluster"]`. Any stack containing a blocked resource type is rejected. Use this to prevent teams from deploying resource types that your security team hasn't reviewed or that expose unnecessary attack surface for your use case.

## Combining security guardrails

Most production organizations enable multiple security guardrails together. A typical production-security baseline combines network isolation, data protection, and access control guardrails:

| Guardrail | What it enforces | Recommended for |
|-----------|-----------------|-----------------|
| `require-vpc-databases` | Network isolation for all databases | All production stages |
| `require-deletion-protection` | Prevent accidental database removal | All stages with persistent data |
| `require-dead-letter-queue` | Message durability for SQS queues | Event-driven architectures |
| `require-waf` | Application-layer firewall on load balancers | Public-facing APIs |
| `require-custom-domain` | Stable, branded endpoints | Production web services |
| `database-engine-restriction` | Approved engine families only | Compliance-regulated teams |
| `resource-type-restriction` | Block non-approved resource types | Security-sensitive environments |

These guardrails complement each other. VPC databases prevent network-level exposure. WAF adds application-level protection. Deletion protection and dead-letter queues prevent data loss. Custom domains ensure stable endpoints. Engine restrictions enforce your approved technology list.


> **Tip:** Start with `require-vpc-databases` and `require-deletion-protection` — they provide the highest security value with the least friction. Add `require-waf`, `require-dead-letter-queue`, and `require-custom-domain` as your production security posture matures.


## Related guardrails

This page covers security and data-protection guardrails. Stacktape includes additional guardrail types for deployment governance and resource limits:

- **Deployment guardrails** — `stage-restriction`, `region-restriction`, `command-restriction`, and `resource-type-restriction` control where and how stacks can be deployed. See [deployment guardrails](/guardrails/deployment).
- **Resource limit guardrails** — `function-memory-limit`, `function-timeout-limit`, `container-resource-limit`, and `resource-count-limit` cap the size and count of compute resources. See [resource limit guardrails](/guardrails/resource-limits).
- **Database guardrails** — `database-engine-restriction` and `database-instance-restriction` control which database engines and instance sizes are allowed. See [database guardrails](/guardrails/databases).

For a high-level overview of all 15 guardrail types, see the [guardrails overview](/guardrails/overview).

## FAQ

### Where are guardrails configured?

Guardrails are configured at the organization level in the [Stacktape Console](/stacktape-console/console-overview), not in your project's `stacktape.ts` configuration file. This means guardrail policies apply to all deployments across the organization — individual projects cannot override them. When a team member runs [`deploy`](/cli/deploy), [`delete`](/cli/delete), or [`preview-changes`](/cli/preview-changes), the CLI fetches the organization's guardrails and validates the operation before making changes.

### How do guardrails differ from alarms?

Guardrails are preventive — they validate resource configurations before infrastructure changes happen and block non-compliant operations. [Alarms](/observability/alarms) are reactive — they monitor running infrastructure and send notifications when metrics cross thresholds. Use guardrails to prevent insecure configurations from being deployed. Use alarms to detect unexpected behavior in already-deployed infrastructure. A production stack benefits from both.

### What happens when a guardrail is violated?

The operation is blocked before any infrastructure changes are made, and a `GUARDRAIL` error is returned identifying the specific violation — for example, which resource failed the check and what policy it violated. The resource configuration must be updated to satisfy the guardrail before the operation can proceed.

### What is VPC-only database accessibility?

VPC-only accessibility means the database has no public IP address and can only be reached from within the AWS VPC. Workloads running in the same VPC (such as [Lambda functions](/resources/compute/lambda-function) or [container workloads](/resources/compute/web-service) configured with [`connectTo`](/configuration/connecting-resources)) connect normally. For administration and debugging, use a [bastion host](/resources/security/bastion-host) or the [`bastion:tunnel`](/cli/bastion-tunnel) CLI command to create a secure tunnel from your local machine.

### What does AWS WAF protect against?

AWS WAF inspects incoming HTTP/HTTPS requests and blocks those matching configured rules. Common rule sets defend against OWASP top-10 threats including SQL injection, cross-site scripting (XSS), and bot traffic. WAF rules can also implement rate limiting and geographic restrictions. The `require-waf` guardrail only verifies that a [web application firewall](/resources/security/web-application-firewall) is attached to your load balancers — the actual protection depends on the WAF rules you configure.

### Do security guardrails add cost to my AWS bill?

Guardrails are organization-level policy checks — the costs come from the resources required to satisfy those policies, not from the guardrails themselves. For example, AWS WAF charges per rule and per request evaluated, and [custom domains](/resources/networking/custom-domains) require DNS configuration. VPC-only databases don't add direct cost, but workloads that need both VPC access and internet access may need additional networking configuration. Evaluate the cost of each required resource when planning which guardrails to enable.

### When should I use guardrails instead of code reviews?

Use both — they serve different purposes. Code reviews catch logic errors, design issues, and context-dependent decisions requiring human judgment. Guardrails enforce binary policy requirements (VPC-only databases, deletion protection, dead-letter queues) that reviewers might miss under time pressure. Guardrails are especially valuable as teams grow, because policy enforcement doesn't depend on reviewer vigilance or familiarity with every security baseline.

### What is the difference between deletion protection and backups?

Deletion protection and backups protect against different failure modes. Deletion protection, enforced by the `require-deletion-protection` guardrail, prevents the database instance itself from being removed via API calls — it's a safeguard against accidental resource removal. Backups (automated snapshots and point-in-time recovery) protect against data corruption or accidental data changes within a running database. Most production databases benefit from both. See the [relational database page](/resources/databases/relational-database) for backup configuration.

### Does the require-vpc-databases guardrail apply to all database types?

The `require-vpc-databases` guardrail checks both [relational databases](/resources/databases/relational-database) and [OpenSearch domains](/resources/databases/opensearch). Both resource types must use VPC-only accessibility when this guardrail is enabled. The accepted modes are `'vpc'` and `'scoping-workloads-in-vpc'` — any other accessibility mode causes the operation to be blocked.

### Can I restrict which database engines my team uses?

Yes. The `database-engine-restriction` guardrail lets you define an `allowedEngines` list of permitted engine family identifiers, such as `["postgres", "aurora-postgresql"]`. Any database using an engine type not on the list is blocked. This guardrail operates on engine families, not specific engine versions — for example, `postgres` covers all RDS PostgreSQL versions. See [database guardrails](/guardrails/databases) for the full database-related guardrail set including instance size restrictions.
