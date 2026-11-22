# Security and data protection guardrails

These guardrails require settings that protect data and keep services running, in every stack of the organization.
Each is an on/off switch under **Security & data protection** or **Reliability** on **Security → Guardrails**. When
one blocks a deploy, the error names the resource; the fix for each is below. [Guardrails
overview](/guardrails/overview) explains who they bind and how to turn them on.

## Keep SQL and OpenSearch private

[Relational databases](/resources/databases/relational-database) and
[OpenSearch domains](/resources/databases/opensearch) must accept connections only from inside your VPC. Their
`accessibilityMode` must be `vpc` or `scoping-workloads-in-vpc`; the default, `internet`, is refused, and so is
`whitelisted-ips-only`.

```yaml
resources:
  mainDb:
    type: relational-database
    properties:
      accessibility:
        accessibilityMode: vpc
```

[Aurora DSQL](/resources/databases/dsql) databases are refused while this guardrail is on: they use a public
service endpoint, and Stacktape can't set up the private endpoint they would need yet.

Once a database is private, tools on your machine reach it through a [bastion host](/resources/security/bastion-host),
for example with `stacktape query sql --bastion-resource`. DynamoDB has no network setting and isn't checked.

## Protect stacks from deletion

Every stack must set `deploymentConfig.terminationProtection: true`:

```yaml
deploymentConfig:
  terminationProtection: true
```

CloudFormation then refuses to delete the stack from any tool, including the AWS console, until someone turns protection
off and deploys. A [command restriction](/guardrails/deployment#command-restriction) on `delete` stops only Stacktape's
own command.

## Protect databases from deletion

Every relational database and Aurora DSQL database must set `deletionProtection: true`. AWS then refuses to delete the
database, and `stacktape delete` stops before deleting anything while a protected database is in the stack. A deploy
can't remove or replace it either. To delete it, set `deletionProtection: false` and deploy first.

```yaml
resources:
  mainDb:
    type: relational-database
    properties:
      deletionProtection: true
```

## Require recoverable data stores

Data stores must keep backups:

| Resource | Requirement |
|---|---|
| Relational database | `automatedBackupRetentionDays` at least 1 (the default is 1; 0 is refused) |
| DynamoDB table | `enablePointInTimeRecovery: true` |
| EFS filesystem | `backupEnabled: true` |
| Aurora DSQL database | Refused: Stacktape can't check an AWS Backup plan for it yet |

Backups add storage cost. They don't replace trying a restore; see the
[relational database backups](/resources/databases/relational-database#backups-and-maintenance) section.

## Require dead-letter queue

Every [SQS queue](/resources/messaging/sqs-queue) must have a `redrivePolicy`, so messages that keep failing move to a
dead-letter queue instead of being retried until they expire. A queue that another queue uses as its dead-letter queue
doesn't need one itself.

```yaml
resources:
  orders:
    type: sqs-queue
    properties:
      redrivePolicy:
        targetSqsQueueName: ordersDlq
        maxReceiveCount: 5
  ordersDlq:
    type: sqs-queue
```

## Require WAF on application load balancers

Every application load balancer must name a [web application firewall](/resources/security/web-application-firewall)
in `useFirewall`. This covers the load balancers you declare and those that web and private services create; on a web
service, `useFirewall` is a property of the service. The internal load balancer of a self-hosted Convex resource has no firewall setting and is skipped.

```yaml
resources:
  firewall:
    type: web-app-firewall
    properties:
      scope: regional
  api:
    type: web-service
    properties:
      useFirewall: firewall
```

A firewall adds a monthly AWS WAF charge per web ACL and per rule, plus a charge per million requests.

## Require two container instances

Every container service must run at least two instances (`scaling.minInstances: 2` or more), so one failing task
doesn't take it down. It roughly doubles the service's baseline compute cost. Self-hosted Convex runs one backend by
design and is skipped.

```yaml
resources:
  api:
    type: web-service
    properties:
      scaling:
        minInstances: 2
        maxInstances: 4
```

Other database rules, such as allowed engines and instance sizes, are on [Database guardrails](/guardrails/databases).
