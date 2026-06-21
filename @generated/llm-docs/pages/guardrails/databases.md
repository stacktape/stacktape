# Database Guardrails

Stacktape database guardrails are preventive policy definitions that restrict which database engines, instance sizes, and accessibility modes your team can deploy. Each definition has a `type` identifier and a `properties` object describing what is allowed or blocked for database resources in the stack. The deletion protection guardrail targets [relational databases](/resources/databases/relational-database) specifically, the VPC-only guardrail applies to all databases, and the engine and instance restriction guardrails apply to databases that use engine types and instance sizes respectively.


> **Info:** Guardrails are **preventive** — non-matching values are blocked, preventing non-compliant configurations from being applied. They are distinct from [alarms](/observability/alarms), which are **reactive** and notify you about runtime problems after deployment.


Stacktape defines four database-specific guardrail types:

| Guardrail | Type identifier | Key property | Approach |
|---|---|---|---|
| [Engine restriction](#engine-restriction) | `database-engine-restriction` | `allowedEngines` | Allowlist |
| [Instance restriction](#instance-restriction) | `database-instance-restriction` | `blockedInstanceSizes` | Blocklist |
| [VPC-only databases](#vpc-only-databases) | `require-vpc-databases` | `enabled` | Boolean toggle |
| [Deletion protection](#deletion-protection) | `require-deletion-protection` | `enabled` | Boolean toggle |

Guardrails are managed at the organization level in the [Stacktape Console](/stacktape-console/console-overview) — they are not defined in your `stacktape.ts` config file. For how to set up and manage guardrails, see the [guardrails overview](/guardrails/overview). For other guardrail categories, see [deployment guardrails](/guardrails/deployment), [security guardrails](/guardrails/security-and-data-protection), and [resource limit guardrails](/guardrails/resource-limits).

## Engine restriction

The `database-engine-restriction` guardrail controls which database engine types can be provisioned. It uses an allowlist — the `allowedEngines` property lists permitted engine type strings, and any database whose engine type is not in the list is blocked. This is the most common database guardrail, used to standardize on a single engine family across an organization.

Guardrail definition shape (configured in the Stacktape Console):

```typescript
{
  type: 'database-engine-restriction',
  properties: {
    allowedEngines: ['postgres', 'aurora-postgresql']
  }
}
```

The `allowedEngines` property accepts an array of engine type identifier strings. The type definition gives `postgres` and `aurora-postgresql` as examples. Use the exact engine type identifiers supported by your [relational database](/resources/databases/relational-database) configuration.

**Allowlist vs blocklist:** Engine restriction uses an **allowlist** — you permit certain engines, and everything else is blocked. This is the safer default for standardization: when new engine types become available, they are blocked until you deliberately add them to the list.

**When to enable:** Your organization wants to standardize on a database engine family (e.g., PostgreSQL only) or prevent teams from using engines that carry additional licensing costs. Setting `allowedEngines` to `['postgres', 'aurora-postgresql']` lets teams choose between single-instance RDS PostgreSQL and Aurora PostgreSQL — while blocking other engine families.

**When to skip:** Small teams or early-stage projects where engine flexibility matters more than standardization. If your team already follows a strong convention, a guardrail may add overhead without benefit.


> **Tip:** If you're standardizing on PostgreSQL, include every PostgreSQL-compatible engine identifier your teams use in the allowlist, so they can choose the deployment model that fits their workload without hitting a guardrail. See the [relational database](/resources/databases/relational-database) page for the supported engine identifiers.


## Instance restriction

The `database-instance-restriction` guardrail prevents teams from provisioning databases with specific instance sizes. Unlike engine restriction, this guardrail uses a **blocklist** — the `blockedInstanceSizes` property lists forbidden instance size strings, and any database configured with a blocked size is blocked.

Guardrail definition shape (configured in the Stacktape Console):

```typescript
{
  type: 'database-instance-restriction',
  properties: {
    blockedInstanceSizes: ['db.r5.4xlarge', 'db.r6g.8xlarge']
  }
}
```

The `blockedInstanceSizes` property accepts an array of database instance size strings. The type definition gives `db.r5.4xlarge` and `db.r6g.8xlarge` as examples.

**Blocklist vs allowlist:** Instance restriction uses a **blocklist** — you forbid specific sizes, and everything else is allowed. This is more practical than an allowlist for instance sizes because the number of valid sizes is large and changes as AWS introduces new instance classes. Block the outliers you want to prevent rather than maintaining a comprehensive allowlist.

**When to enable:** You want to prevent cost surprises from oversized instance classes. Large memory-optimized instances (such as `db.r5.4xlarge` and above) can cost significantly more than smaller instances that handle the same workloads adequately. Blocking expensive sizes proactively is simpler than reviewing every deployment manually.

**When to skip:** Teams with existing cost review processes, or organizations that exclusively use serverless database engines (which scale capacity automatically). Also less relevant when every database configuration is reviewed before deployment.


> **Warning:** Each instance size must be listed individually. Blocking `db.r5.4xlarge` does not automatically block `db.r5.8xlarge` or `db.r6g.4xlarge` — add every variant you want to prevent.


## VPC-only databases

The `require-vpc-databases` guardrail enforces that all databases must use VPC-only accessibility with no public internet access. When `enabled` is `true`, any database without VPC-only accessibility is blocked.

Guardrail definition shape (configured in the Stacktape Console):

```typescript
{
  type: 'require-vpc-databases',
  properties: {
    enabled: true
  }
}
```

For the accessibility modes available on databases and how to configure them, see the [relational database](/resources/databases/relational-database) documentation.

**When to enable:** Production environments, regulated industries, or any organization handling sensitive data — PII, financial records, or health information. Most compliance frameworks (SOC 2, HIPAA, PCI-DSS) require databases to be unreachable from the public internet. Enabling this guardrail ensures no team can accidentally expose a database.

**When to skip:** Development-only environments where developers need to connect to databases directly from their local machines without a VPN or bastion. For production stages, the friction of requiring VPC-only access is worth the security benefit.

**Tradeoff:** VPC-only databases remove public internet access, meaning workloads that need database connectivity must be configured for VPC networking. A [bastion host](/resources/security/bastion-host) can provide local access to VPC-only databases during development.

## Deletion protection

The `require-deletion-protection` guardrail enforces that all [relational databases](/resources/databases/relational-database) have `deletionProtection` set to `true`. When `enabled` is `true`, any relational database without explicit deletion protection is blocked.

Guardrail definition shape (configured in the Stacktape Console):

```typescript
{
  type: 'require-deletion-protection',
  properties: {
    enabled: true
  }
}
```

AWS RDS deletion protection is a safeguard that prevents a database instance from being accidentally deleted. The guardrail ensures your team always has this flag active — every relational database in the stack must include `deletionProtection: true` in its configuration. This guardrail targets relational databases specifically.

**When to enable:** Any production environment, or as a blanket policy to prevent accidental database deletion. The cost of losing production data far outweighs the minor friction of managing the protection flag explicitly.

**When to skip:** Development and testing stages where databases are ephemeral and frequently recreated. Enforcing deletion protection on short-lived dev databases adds friction without meaningful benefit.

**Tradeoff:** With this guardrail active, you cannot deploy a relational database without `deletionProtection: true` in its configuration.

## Combining database guardrails

Database guardrails work independently and can be enabled simultaneously to enforce a comprehensive database policy. A typical production setup enables all four: standardize on PostgreSQL engines, block oversized instances, require VPC isolation, and enforce deletion protection.

When multiple guardrails are active, a stack must satisfy every one of them that applies to its resources.

| Guardrail | What it prevents |
|---|---|
| Engine restriction | Non-standard engine types (e.g., MySQL when only PostgreSQL is allowed) |
| Instance restriction | Oversized or expensive instance sizes |
| VPC-only databases | Publicly accessible databases |
| Deletion protection | Accidentally deletable relational databases |

**Recommended starting point:** Enable VPC-only databases and deletion protection first — they provide the highest-value safety net for production with minimal configuration overhead. They prevent the two most costly mistakes: data exposure and accidental deletion. Add engine restriction once your team has standardized on an engine family, and instance restriction once cost control across teams becomes a priority.

The following database configuration satisfies all four guardrails — it uses a PostgreSQL engine, a non-blocked instance size, VPC-only accessibility, and deletion protection:


Example (TypeScript):

```typescript
import { defineConfig, RelationalDatabase, RdsEnginePostgres } from 'stacktape';
export default defineConfig(() => {
  const mainDatabase = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      primaryInstance: {
        instanceSize: 'db.t4g.micro'
      }
    }),
    accessibility: {
      accessibilityMode: 'vpc'
    },
    deletionProtection: true
  });

  return { resources: { mainDatabase } };
});
```


## FAQ

### What's the difference between guardrails and alarms for databases?

[Guardrails](/guardrails/overview) are **preventive** — they block non-compliant configurations. [Alarms](/observability/alarms) are **reactive** — they monitor runtime metrics (CPU usage, connection count, storage) and notify you when thresholds are crossed. Use guardrails to enforce policy on resource configurations and alarms to monitor database health at runtime. They complement each other but serve different purposes.

### Where are database guardrails configured?

Database guardrails are managed at the organization level in the [Stacktape Console](/stacktape-console/console-overview) — they are not defined in your `stacktape.ts` config file. See the [guardrails overview](/guardrails/overview) for the full setup and management workflow.

### Does the engine restriction use an allowlist or blocklist?

The `database-engine-restriction` guardrail uses an **allowlist** (`allowedEngines`). You specify which engine types are permitted, and any engine not in the list is blocked. The `database-instance-restriction` guardrail uses the opposite approach — a **blocklist** (`blockedInstanceSizes`) of forbidden instance sizes. The allowlist approach is safer for standardization because new engine types are blocked by default until explicitly added.

### How is engine restriction different from resource type restriction?

The `resource-type-restriction` guardrail (covered in [resource limit guardrails](/guardrails/resource-limits)) blocks entire resource types — for example, preventing anyone from provisioning a `relational-database` at all. The `database-engine-restriction` guardrail is more granular: it allows relational databases but limits which engine types can be used within them. Use engine restriction when you want databases but need to standardize on specific engines.

### What engine type identifiers can I put in the allowedEngines list?

The type definition gives `postgres` and `aurora-postgresql` as examples. The `allowedEngines` array accepts engine type identifier strings — use the exact identifiers supported by your [relational database](/resources/databases/relational-database) configuration.

### What happens when a guardrail blocks my deployment?

Active guardrails block non-matching values during deployment. Update the database configuration to match the guardrail requirements, then deploy again.

### Should I enable all four database guardrails at once?

Start with the guardrails that match your current priorities. VPC-only databases and deletion protection provide the highest-value safety net for production with minimal friction — they prevent data exposure and accidental deletion. Engine restriction is worth enabling once your team has standardized on an engine family. Instance restriction is most useful for cost control in larger organizations where teams independently choose their own instance sizes.

### How much does AWS RDS cost compared to Aurora Serverless?

AWS RDS single-instance databases bill per hour of runtime based on instance size, plus storage. Aurora Serverless v2 bills based on consumed capacity units (ACUs) and can scale down when idle, making it cost-effective for variable workloads. The `database-instance-restriction` guardrail helps control RDS costs by blocking expensive instance sizes. See the [managing costs overview](/managing-costs/overview) for Stacktape-specific cost monitoring.
