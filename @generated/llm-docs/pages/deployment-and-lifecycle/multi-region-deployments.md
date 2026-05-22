# Multi-Region Deployments

Stacktape deploys each stack to a single AWS region. To serve users across multiple continents with low latency — or to satisfy data-residency regulations — deploy the same configuration to multiple regions as independent stacks. Each region runs its own CloudFormation stack with its own compute, databases, and networking.

## When to use multi-region

Multi-region deployments solve two distinct problems: **latency** and **compliance**. If your users are concentrated on one continent and response time is acceptable (under ~200 ms for APIs), a single region with a [CDN](/resources/networking/cdn) gives you global static-asset performance without the operational overhead of multiple regions. Multi-region is the right choice when:

- Your API or database latency is unacceptable for users far from the primary region (a CDN only helps static or cacheable responses).
- Regulations (GDPR, data sovereignty) require data to physically reside in a specific jurisdiction.
- You need active-active redundancy where a regional outage should not take down your product.

## When NOT to use multi-region

Most applications do not need multi-region. The additional cost and operational complexity are substantial:

- You pay for duplicate compute, databases, and networking in every region.
- Cross-region data consistency requires DynamoDB global tables, Aurora Global Database, or application-level replication — none of which Stacktape configures automatically.
- Monitoring, debugging, and incident response multiply per region.
- DNS-based routing (failover, latency, geo) must be configured outside Stacktape.

For most teams, a single region plus a CDN for static content is the right starting point. Revisit multi-region when latency data or compliance requirements force the issue.

## How it works

To deploy the same application to two regions, run [`stacktape deploy`](/cli/deploy) twice — once per target region — passing `--region` each time.

Deploy to the primary region:

```bash
stacktape deploy --stage production --region eu-west-1
```

Deploy to the secondary region:

```bash
stacktape deploy --stage production --region us-east-1
```

Each command creates an independent CloudFormation stack in its target region. The two stacks have no automatic relationship to each other — Stacktape does not configure cross-region replication, failover, or shared state on your behalf.

## Choosing regions

Deploy each stack to the AWS region you target. Pick regions close to your users and verify that every AWS service your stack uses is available in that region — service availability varies by region and is published by AWS. For multi-region setups, the most common pattern is one region per continent your users live on (for example `eu-west-1` for Europe and `us-east-1` for North America).

## Sharing configuration across regions

A single `stacktape.ts` file typically works unchanged across regions. The same resource definitions produce the same infrastructure regardless of where they are deployed. The `defineConfig` callback receives a `params` object that exposes deploy-time context such as the target `region` — use it to conditionally adjust configuration per region:


Example (TypeScript):

```typescript
import { defineConfig, WebService, CustomDockerfilePackaging } from 'stacktape';
export default defineConfig(({ region }) => {
  const isPrimary = region === 'eu-west-1';

  const api = new WebService({
    packaging: new CustomDockerfilePackaging({
      dockerfilePath: './Dockerfile'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    scaling: {
      minInstances: isPrimary ? 2 : 1,
      maxInstances: isPrimary ? 10 : 5
    }
  });

  return { resources: { api } };
});
```


For simpler cases where only one or two values differ, [deploy-time parameters](/deployment-and-lifecycle/deploy-time-parameters) or [directives](/configuration/directives) may be a cleaner approach than conditional logic.

## Multi-region patterns

### Active-active

Both regions serve production traffic simultaneously. A DNS routing policy (latency-based, geo-location, or weighted) directs users to the nearest region. Both regions run identical infrastructure and each must handle its share of traffic independently.

**Data strategy**: Use DynamoDB global tables for eventually-consistent multi-region access, Aurora Global Database for read replicas with single-writer, or application-level replication for custom sync logic. Each approach involves tradeoffs between consistency, latency, and cost — see the cross-region data section below.

**DNS routing**: Configure Route 53 latency-based or geo-location routing policies outside Stacktape (directly in the AWS Console or via [overrides](/configuration/overrides-and-escape-hatches)). Stacktape creates per-region resources but does not manage cross-region routing policies.

**When to choose**: Active-active suits products with a global user base where both latency and availability matter — real-time collaboration tools, trading platforms, global SaaS. The cost is roughly 2x (or Nx for N regions) since every region runs full infrastructure.

### Active-passive (failover)

One region handles all traffic. The passive region stays deployed and ready but receives no requests until the primary fails. Route 53 failover routing automatically redirects traffic when health checks detect the primary is down.

This pattern is simpler than active-active because only one region processes writes at any time, eliminating cross-region consistency challenges. The tradeoff is that failover introduces downtime equal to the DNS TTL plus health-check detection time (typically 30–90 seconds with Route 53).

**When to choose**: Active-passive works when you need disaster-recovery capability but can tolerate brief downtime. The passive region costs compute and database resources even while idle, though you can reduce this with smaller instance sizes or scaling to minimum capacity.

### Region per audience

Deploy separate stages to regions matching your user base segments — for example, EU customers hit `eu-west-1` and US customers hit `us-east-1`. Each region operates independently with its own data, and customers are routed by geography or explicit selection.

**When to choose**: This works well for SaaS products with regional data-residency requirements (GDPR, HIPAA) or where data isolation between regions is a feature, not a bug. There is no cross-region replication needed because each region is a separate data silo by design.

## Cross-region data considerations

Stacktape does not automatically replicate data between regions. Each region's databases, buckets, and caches are independent. You must choose a cross-region data strategy based on your consistency and latency requirements:

| Strategy | Service | Consistency | Best for |
|----------|---------|-------------|----------|
| DynamoDB global tables | DynamoDB | Eventually consistent (seconds) | Session stores, user preferences, feature flags |
| Aurora Global Database | Aurora PostgreSQL/MySQL | Async replication (<1s lag typically) | Read-heavy workloads with single-region writes |
| S3 Cross-Region Replication | S3 | Eventually consistent (minutes) | Static assets, backups, uploaded files |
| Application-level sync | Custom | You control | Complex business logic, selective replication |

Configure these AWS-native replication features through [overrides](/configuration/overrides-and-escape-hatches) or directly in the AWS Console. Stacktape resource definitions create per-region resources; replication links between regions are outside Stacktape's resource model.


> **Warning:** Cross-region replication adds cost. DynamoDB global tables charge for replicated write capacity in each region. Aurora Global Database charges for the secondary cluster's reader instances. S3 CRR charges for PUT requests and cross-region data transfer. Factor these into your cost model before enabling replication.


## Automating multi-region deploys

### CI/CD pipelines

The most common multi-region setup uses parallel CI/CD jobs — one per target region. In GitHub Actions, GitLab CI, or any pipeline tool, define a matrix of regions and run `stacktape deploy` for each. See [Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) for integration patterns.

Each job runs independently. A failure in one region does not affect others — the failed region rolls back via CloudFormation's automatic rollback while successful regions continue serving traffic.

### GitOps with Console

[GitOps with Console](/ci-cd-and-gitops/gitops-with-console) can trigger deployments on every push to a branch. To deploy to multiple regions, create separate GitOps configurations for each target region. When a push arrives, each matching configuration triggers its own deployment independently.

This approach requires no custom CI scripts. You manage regions as separate GitOps configurations — add a region by adding a configuration, remove it by deleting one.

## Restricting allowed regions

The `region-restriction` guardrail prevents deployments to unapproved regions — useful for compliance, cost control, or organizational policy. Configure an `allowedRegions` list on the guardrail and a deploy targeting a region outside the list is rejected.


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/api.ts'
    })
  });

  return {
    guardrails: [
      {
        type: 'region-restriction',
        properties: {
          allowedRegions: ['eu-west-1', 'eu-central-1', 'us-east-1']
        }
      }
    ],
    resources: { api }
  };
});
```


`stacktape deploy` validates configured guardrails before packaging and the CloudFormation deployment begins, so a forbidden region fails fast — no artifacts are uploaded and no stack operations run.

Other guardrail types (`stage-restriction`, `command-restriction`, `resource-type-restriction`) can further lock down your deployment posture. See [Guardrails](/guardrails/overview) for the full set.

## Monitoring multi-region stacks

Each region's stack is monitored independently. Use [`stacktape debug:logs`](/cli/debug-logs) with the appropriate `--region` flag to view logs for a specific region:

```bash
stacktape debug:logs --stage production --region eu-west-1 --resourceName api
```

For the secondary region:

```bash
stacktape debug:logs --stage production --region us-east-1 --resourceName api
```

Configure [alert channels](/observability/alert-channels) per region so the right team gets notified about region-specific incidents. Each region's alarms, metrics, and issues are scoped to that region's stack.

## Deleting multi-region stacks

Delete each region's stack independently using [`stacktape delete`](/cli/delete):

```bash
stacktape delete --stage production --region eu-west-1
```

```bash
stacktape delete --stage production --region us-east-1
```

Order matters if you have DNS routing configured externally — remove DNS records pointing to a region before deleting the stack, or you will have DNS pointing to non-existent infrastructure during the deletion window.

## FAQ

### How many regions can I deploy to?

You can deploy to any number of AWS regions your account supports — each region runs an independent CloudFormation stack. The practical limit is operational: more regions mean more stacks to monitor, more data replication to manage, and higher costs. Most multi-region setups use 2–3 regions.

### Does Stacktape handle cross-region failover automatically?

No. Stacktape deploys independent stacks per region but does not configure DNS failover, health-check routing, or automatic traffic shifting between regions. Use Route 53 routing policies (failover, latency-based, or weighted) configured directly in AWS or via [overrides](/configuration/overrides-and-escape-hatches) to control how traffic flows between regions.

### Can I use the same stage name in multiple regions?

Yes. The same stage name (e.g., `production`) can be deployed to multiple regions. Each region creates its own independent CloudFormation stack, so resources in different regions do not collide.

### How do I keep databases in sync across regions?

Stacktape does not manage cross-region data replication. Use AWS-native solutions: DynamoDB global tables for key-value data with eventual consistency, Aurora Global Database for relational data with async replication under 1 second lag, or S3 Cross-Region Replication for object storage. Choose based on whether you need strong consistency (single-writer Aurora) or can tolerate eventual consistency (DynamoDB global tables).

### Is multi-region more expensive than single-region with a CDN?

Significantly. Multi-region duplicates compute, databases, and networking costs across every active region. A single-region deployment with a [CDN](/resources/networking/cdn) caches static and cacheable responses at CloudFront edge locations at a fraction of the cost. Multi-region is justified only when your dynamic API responses are latency-sensitive and your users span multiple continents — or when compliance mandates data residency.

### How does the defineConfig callback know which region is being deployed to?

The `defineConfig` callback receives a `params` object exposing deploy-time context including the target `region`. Use `params.region` (or destructure it directly) to write conditional logic — different scaling targets, instance sizes, or feature flags per region — all from a single `stacktape.ts` file.

### What happens if one region's deployment fails?

Each region deploys independently. A failure in one region does not affect others. The failed region rolls back via CloudFormation's automatic rollback (when enabled), while successful regions continue serving traffic. Check [`stacktape debug:logs`](/cli/debug-logs) with the failing region's `--region` flag to investigate. See [Rollbacks](/deployment-and-lifecycle/rollbacks) for recovery options.

### How do custom domains work with multi-region?

Stacktape creates DNS records per region via [custom domains](/resources/networking/custom-domains). For multi-region routing (latency-based, failover, geo), configure Route 53 routing policies outside Stacktape — either directly in the AWS Console or via [overrides](/configuration/overrides-and-escape-hatches). Alternatively, use an external DNS provider like Cloudflare for multi-region traffic management.

### Should I use multi-region or a single region with CloudFront?

Start with a single region and a CDN. AWS CloudFront caches responses at edge locations worldwide, reducing latency for cacheable content globally. Move to multi-region only when: (1) your dynamic API latency exceeds acceptable thresholds for distant users, (2) compliance requires in-region data processing, or (3) you need active-active redundancy for disaster recovery. Most web applications perform well with a single region plus CDN.

### How do I test a multi-region setup without affecting production?

Deploy to a separate stage (e.g., `staging`) in multiple regions first. The same `stacktape.ts` works for staging and production — only the stage name differs. This lets you validate DNS routing, data replication, and monitoring before cutting over production traffic.
