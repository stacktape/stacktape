# Guardrails overview

A guardrail is an organization rule that the Stacktape CLI checks before it changes anything: allowed stages and
regions, blocked commands, size limits, and settings every stack must have, such as private databases or backups. A
deploy that breaks a rule stops before it touches AWS, with an error that names the rule. Owners and Admins set
guardrails in the [Stacktape Console](/getting-started/add-the-console), and they apply to every project of the
organization.

## What guardrails check, and when

The CLI loads the organization's guardrails when it runs `deploy`, `diff`, `delete`, `dev`, `rollback`,
`stack recover`, `script run` or `deployment-script run`, and checks them against the command, the target stage and
region, and the config. `validate` and `synth` don't check them.

Guardrails bind every run that is signed in to the organization: developers' CLIs, CI with an organization key, and
[Git deployments](/ci-cd-and-gitops/gitops-with-console). A run with AWS credentials alone, without a Stacktape
account, doesn't load them. Guardrails are a shared team standard, not an access control: to make sure nobody can
deploy outside the rules, also limit what the AWS credentials can do with IAM policies or AWS Organizations service
control policies. See [AWS permissions](/stacktape-console/aws-permissions).

Guardrails check what a deploy asks for, not what already runs. A stack that breaks a new rule keeps running; its next
deploy stops until the config complies.

## Set up a guardrail

1. In the Console sidebar, open **Security → Guardrails** and choose **All rules**.
2. For a rule with a value, such as allowed regions, click **Set up**, enter the values and click **Turn on**. For an
   on/off rule, such as private databases, flip its switch.
3. The **On** tab lists the rules your organization enforces. **Edit** changes a rule's values; **Turn off** removes
   it.

For rules that match a [security scanning](/stacktape-console/security-scanning) check, the row shows which stacks the
rule would block on their next deploy, before you turn it on. You can also turn a finding's check into a guardrail from
the finding's page. Changing guardrails needs the `org:manage-guardrails` permission (Owners and Admins); every member
can see them.

## All guardrails

| Guardrail | Requires | Page |
|---|---|---|
| Stage restriction | Only the listed stage names | [Deployment](/guardrails/deployment#stage-restriction) |
| Region restriction | Only the listed AWS regions | [Deployment](/guardrails/deployment#region-restriction) |
| Command restriction | The listed commands don't run | [Deployment](/guardrails/deployment#command-restriction) |
| Require custom domains | Web services and hosting buckets use your own domain | [Deployment](/guardrails/deployment#require-custom-domains) |
| Keep SQL and OpenSearch private | Databases and OpenSearch use a VPC access mode | [Security](/guardrails/security-and-data-protection#keep-sql-and-opensearch-private) |
| Protect stacks from deletion | CloudFormation termination protection | [Security](/guardrails/security-and-data-protection#protect-stacks-from-deletion) |
| Protect databases from deletion | `deletionProtection` on SQL and Aurora DSQL databases | [Security](/guardrails/security-and-data-protection#protect-databases-from-deletion) |
| Require recoverable data stores | Backups for SQL databases, DynamoDB and EFS | [Security](/guardrails/security-and-data-protection#require-recoverable-data-stores) |
| Require dead-letter queue | A dead-letter queue for every SQS queue | [Security](/guardrails/security-and-data-protection#require-dead-letter-queue) |
| Require WAF on application load balancers | A web application firewall on every load balancer | [Security](/guardrails/security-and-data-protection#require-waf-on-application-load-balancers) |
| Require two container instances | At least two instances of each container service | [Security](/guardrails/security-and-data-protection#require-two-container-instances) |
| Function memory limit | Function memory at or under a maximum | [Resource limits](/guardrails/resource-limits#function-memory-limit) |
| Function timeout limit | Function timeout at or under a maximum | [Resource limits](/guardrails/resource-limits#function-timeout-limit) |
| Container resource limit | Container vCPU and memory at or under a maximum | [Resource limits](/guardrails/resource-limits#container-resource-limit) |
| Stacktape resource count limit | At most so many resources in one config | [Resource limits](/guardrails/resource-limits#stacktape-resource-count-limit) |
| Allowed database engines | Only the listed SQL engines | [Databases](/guardrails/databases#allowed-database-engines) |
| Allowed database instance sizes | Only the listed instance sizes | [Databases](/guardrails/databases#allowed-database-instance-sizes) |
| Blocked resource types | None of the listed resource types | [Databases](/guardrails/databases#blocked-resource-types) |

All rules apply to the whole organization; there are no per-project or per-stage exceptions. A team that needs
different rules for an experiment uses a separate Stacktape organization.

## When a deploy is blocked

The CLI stops with a `GUARDRAIL_…` error that starts with the rule's name and says what broke it:

```text
Blocked by the organization guardrail "Keep SQL and OpenSearch private". Database `mainDb` uses accessibility mode
`internet`. It must use `vpc` or `scoping-workloads-in-vpc`.
```

Change the config and deploy again, or ask an Owner or Admin to change the rule. `stacktape diff` shows the same error,
so you can check a fix without deploying.

Guardrails stop a deploy before it happens. [Security scanning](/stacktape-console/security-scanning) reports risky
settings and vulnerable packages after each deploy and never blocks one. [Alarms](/observability/alarms) watch the
running stack.
