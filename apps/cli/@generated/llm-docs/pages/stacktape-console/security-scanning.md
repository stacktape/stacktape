# Security scanning

Every deploy checks the stack for risky settings and records which packages it uses. The **Security** section of the
Stacktape Console then shows, for each deployed stack, what should change, which packages have known vulnerabilities
and what the internet can reach.

Scanning only reports. It never stops a deploy, even for a critical finding. To block deploys that break a rule, use
[guardrails](/guardrails/overview). An owner or admin can turn on a finding's matching guardrail from the finding's
page (see [Blocking deploys with a guardrail](#blocking-deploys-with-a-guardrail)).

Scanning is on by default. It adds no AWS resources to your stack.

## What is checked

Each AWS account runs two kinds of checks, both on unless an organization owner or admin turns them off.

### Configuration checks

While you deploy, the Stacktape CLI evaluates the stack's resolved configuration against the rules below. It adds no
noticeable time to the deploy.

| Finding | Severity | Notes |
|---|---|---|
| Database reachable from the internet | High; low outside production | Guardrail: **Keep SQL and OpenSearch private** |
| Production database without deletion protection | Medium | Production only. Guardrail: **Protect databases from deletion** |
| Production data store without backups | Medium | Production only. Guardrail: **Require recoverable data stores** |
| Public load balancer without a web application firewall | Medium; low outside production | Guardrail: **Require WAF on application load balancers** |
| Bucket readable or writable by anyone | Medium | |
| IAM statement allows every action | High | |
| IAM statement grants a whole service on every resource | Medium | For example `s3:*` on `*` |
| Production stack without termination protection | Low | Production only. Guardrail: **Protect stacks from deletion** |
| Production container service runs a single instance | Low | Production only. Guardrail: **Require two container instances** |
| Queue without a dead-letter queue | Low; info outside production | Guardrail: **Require dead-letter queue** |
| Secret stored as a plain environment variable | Critical | A value in `environment` that looks like a credential |

### Dependency checks

The CLI also lists the packages the deployment uses: the packages in your lockfiles and the operating-system and
language packages inside every container image the deploy rebuilt. Images that were not rebuilt keep the packages from
the previous list. The CLI uses the Trivy scanner for this, which it downloads once (about 50 MB).

The list is a CycloneDX file stored in the stack's deployment bucket in your AWS account. After the deploy, the Console
reads it through your AWS account connection, checks every package against the [OSV.dev](https://osv.dev)
vulnerability database, and keeps only the vulnerabilities it finds. It checks every stack's latest list again every
night, so a vulnerability published after your deploy shows up without a new deploy.

Dependency checks run only when configuration checks run.

## The Security pages

Open **Overview** in the sidebar's Security group. The other pages are next to it.

- **Overview** (the **Security** page) has one row per deployed stack: its **Score**, open **Posture** findings, open
  **Vulnerabilities** and the **Last scan**. A stack starts at a score of 100 and loses 25 points for each open
  critical finding, 10 for each high, 3 for each medium and 1 for each low. Ignored findings do not count. A stack that
  was deployed but never reported shows **Not scanned**, so a quiet row is not mistaken for a clean one. **Settings**
  opens the security settings.
- **Posture** lists configuration findings and secrets found in environment variables. Filter by project, stage,
  severity and status.
- **Vulnerabilities** lists known vulnerabilities by package, with the versions in use, the workloads that run them and
  the version that fixes the problem (**Fixed in**), or **No fix yet**.
- **Exposure** lists what the internet can reach in each stack: public endpoints and whether a web application firewall
  protects them, how databases can be reached, and buckets that anyone can read or write. Being reachable is not a
  finding by itself; the Posture page lists what should change.

Click a finding to open its page. It shows **What was found** and **How to fix it**. A configuration finding also
explains **Why it matters**, and a vulnerability shows its **Advisory**: the advisory ID with a link to OSV.dev, other
IDs such as the CVE, the affected and fixed versions, the CVSS rating and references.

## When results appear

The CLI prints a one-line summary and the most severe findings in the output of `stacktape deploy` and
`stacktape validate`. `validate` also lists the findings that only apply to production.

The Console receives the findings after the deploy succeeds:

- **Configuration findings** appear right after the deploy.
- **Vulnerabilities** appear a few minutes later, once the Console has checked the package list. Until then the
  Overview shows **Checking…**. If the check fails, it shows **Check failed**; hover it for the reason. A failed check
  is retried automatically.

A stack is scanned only when it is deployed with Stacktape 4 or newer. Run `stacktape upgrade`, then deploy.

### How a finding changes over time

| Status | Meaning |
|---|---|
| Open | The last deploy (or, for a vulnerability, the last check) found the problem. |
| Resolved | A later deploy or check no longer found it. It reopens on its own if the problem returns. |
| Ignored | Someone accepted the risk. It no longer counts as open, also after later deploys, until someone reopens it. |

An ignored finding reopens on its own when it comes back after being resolved, or when its severity rises to high or
critical, for example because the stage became a production stage. The earlier decision to ignore it does not carry
over.

## Production and non-production stages

Some rules matter only once real users depend on the stack, so their findings are reported for production stages only.
Others are reported at a lower severity outside production: a password-protected database that the internet can reach
is a reasonable default for a dev or preview stage, but a real exposure in production. The table in
[Configuration checks](#configuration-checks) shows both.

A stage counts as production when:

1. its `stackConfig.stageType` is `production`; otherwise,
2. it was created as a production stage in the Stacktape Console; otherwise,
3. its name is `prod`, `production`, `prd` or `live`, also with a number such as `prod2`.

The deploy output says which of these decided, for example ``stage `dev` is non-production by its name``. When a
non-production deploy skips production-only findings, it says how many there are; `stacktape validate` lists them.

## Choosing what is scanned

### For an AWS account

Click **Settings** on the Security overview to open **Security settings**. The **AWS accounts** section has two
switches per connected account:

- **Configuration** turns the configuration checks on or off. Off means the account's stacks are not scanned at all.
- **Dependencies** turns the dependency checks on or off. It can be on only while **Configuration** is on.

A newly connected account runs both checks. Only organization owners and admins can change the switches. A change
applies from each stack's next deploy. Findings already reported stay visible but stop updating.

### For a stack or some stages

Use `deploymentConfig.securityScanning` in the stack's configuration:

```yaml
deploymentConfig:
  securityScanning:
    enabled: true        # default; false turns scanning off for this stack
    stages: [production] # omitted or empty means every stage; names must match exactly
```

```ts
export default defineConfig(() => ({
  deploymentConfig: { securityScanning: { stages: ['production'] } },
  resources: { /* ... */ }
}));
```

When scanning is off for a stack or stage, nothing is evaluated, recorded or sent for it.

### Which setting wins

The AWS account's setting in the Console wins over the configuration:

1. If the account has **Configuration** off, the stack is not scanned, whatever its configuration says.
2. Otherwise, `enabled: false` turns scanning off for the stack.
3. Otherwise, a stage that is missing from `stages` is not scanned.
4. Otherwise, the stack is scanned. Its dependencies are checked unless the account has **Dependencies** off.

The deploy output names the reason, for example
``Security scanning: off (turned off for AWS account `Production` in the Stacktape Console).``

## Ignoring and reopening a finding

Open the finding and click **Ignore**. You can add a reason, which everyone in the organization sees on the finding.
Click **Reopen** on an ignored finding to count it as open again in the lists, the score and the sidebar badge.
Ignoring and reopening need the `security:manage` permission.

A finding resolves on its own when you fix the problem; you do not need to mark it.

## Fixing a finding

- **Configuration findings:** **How to fix it** lists the steps and the configuration change, in TypeScript or YAML
  (it starts with the format the stack was last deployed from). Change your configuration and deploy. The finding
  resolves after the next deploy that no longer has the problem.
- **Secrets in environment variables:** store the value with `stacktape secret set`, reference it with
  `$Secret('...')`, and rotate the credential. The old value stays in your Git history and in earlier deployments, and
  it stays valid until you revoke it. See [Secrets](/configuration/secrets).
- **Vulnerabilities:** upgrade the package to a version listed under **Fixed in**, in your lockfile or in the container
  image, and deploy. The vulnerability resolves after the next check that no longer finds it.

### Blocking deploys with a guardrail

When a finding's rule has a matching guardrail, its page has a **Guardrail** section. It lists the stacks that the
guardrail would block, because they have the same finding open or ignored. An organization owner or admin can click
**Enforce as guardrail** to turn it on for the whole organization.

Once the guardrail is on, the next deploy of a stack that breaks the rule is blocked until the problem is fixed.
Ignoring the finding does not lift the block. Guardrails apply to every stage, including the non-production stages
where a production-only finding is not reported. See [Security and data protection
guardrails](/guardrails/security-and-data-protection).

## Notifications

To hear about new findings, add a rule with the event **New critical or high security findings** to an
[alert channel](/observability/alert-channels). A new Slack (Stacktape app) channel has this rule by default. A channel
receives one message per deploy or nightly check that opens new critical or high findings in a stack. It lists the
first ten and links to the Console. The **When something is found** section of Security settings lists the channels
that receive these messages.

## Permissions

| Action | Permission | Roles |
|---|---|---|
| See the Security pages | `security:view` | Owner, Admin, Developer, Viewer |
| Ignore and reopen findings | `security:manage` | Owner, Admin, Developer |
| Change an AWS account's checks, enforce a finding as a guardrail | `org:manage-guardrails` | Owner, Admin |

Members limited to some projects see only the stacks of those projects. See
[Team and access control](/stacktape-console/team-and-access-control).

## What leaves your AWS account

The CLI sends one report per deploy to the Stacktape Console. It contains:

- **Each configuration finding:** the rule ID, severity, title, message, fix description, resource name and type, an
  identifier that keeps the finding stable across deploys, and a few details: the database's accessibility mode, the
  index and actions of an IAM statement, or, for a secret, the kind of credential it looks like, the variable name and
  where it is set. **The value of a secret is never sent.**
- **Each exposure entry:** the resource name and type, how it can be reached, and whether a firewall protects it.
- **The package list's location:** the bucket, object key, SHA-256 hash, size, format and package count, the scanner
  name and version, and for each workload its name, how its packages were read, its package count and its image digest.
- **About the report:** the deployment it belongs to, the rule catalog version and the Stacktape version.

The package list itself stays in your deployment bucket. To check it, the Console reads the file through your AWS
account connection, keeps it in memory only, and sends each package's identifier (name and version) to OSV.dev. It
stores only the vulnerabilities it finds: the package, the versions in use, the workloads that run them, and the
advisory's IDs, summary, affected and fixed versions, rating and references.

## Related pages

- [Guardrails overview](/guardrails/overview): rules that block deploys
- [Stages and environments](/configuration/stages-and-environments): `stackConfig.stageType`
- [Connecting your AWS account](/stacktape-console/connecting-your-aws-account)
- [Console overview](/stacktape-console/console-overview)
