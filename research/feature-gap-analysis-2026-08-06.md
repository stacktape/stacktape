# Stacktape feature-gap analysis — categories the 08-05 audit missed

Research snapshot: **2026-08-06**
Companion to `research/competitive-landscape-2026-08-05.md`. That document mapped Stacktape against SST, Serverless
Framework, Ravion, Render, CDK and Pulumi. This one does three things it did not:

1. **Verifies its code-level claims** and adds new ones found by reading the implementation rather than the docs.
2. **Adds the competitor categories it omitted entirely** — BYOC PaaS (Qovery/Porter/Northflank), frontend platforms
   (Vercel/Netlify/Amplify), AWS's own first-party app tooling, and infrastructure-from-code.
3. **Produces a single ranked gap list**, which is what the request actually asked for.

The headline conclusion is that the 08-05 audit compared Stacktape against the wrong short-list. Its six competitors
are the ones Stacktape _resembles technically_. The products Stacktape competes with _for the same buyer_ — a team that
wants a PaaS but keeps its own AWS account — are Qovery, Porter, Northflank and Amplify, and every one of them is
architecturally weaker than Stacktape in a way that is easy to state and hard for them to fix.

---

## 1. Verified against the code

### Confirmed from the previous audit

**Drift detection is documented but dead.** `apps/docs/content/cli/deploy.mdx:76` states "By default, Stacktape blocks
updates to a stack that has drifted," and `--disableDriftDetection` is a documented flag. The implementation is
commented out in [`apps/cli/src/aws/sdk-manager/index.ts:537`](../apps/cli/src/aws/sdk-manager/index.ts) and the
assignment in
[`apps/cli/src/domain/cloudformation-stack-manager/index.ts:187`](../apps/cli/src/domain/cloudformation-stack-manager/index.ts).
`validateStackDrift` in `apps/cli/src/utils/validator.ts:48` is never called. The flag is parsed and ignored.

This remains P0: it is a documented safety guarantee that does not exist.

### New findings

**`connectTo` covers 14 resource types, not the 5 the docs imply — but excludes AgentCore.**
The authoritative list is
[`apps/cli/src/domain/config-manager/resolved-types/resources.ts:205`](../apps/cli/src/domain/config-manager/resolved-types/resources.ts):
IAM grants for `function`, `multi-container-workload`, `batch-job`, `state-machine`, `event-bus`, `bucket`,
`dynamo-db-table`, `open-search-domain`, `user-auth-pool`, `sqs-queue`, `sns-topic`, `kinesis-stream`; security-group
changes for `relational-database` and `redis-cluster`.

Two consequences:

- The `connectTo` doc block in `packages/config/src/shared.ts:3317` **omits `open-search-domain`, `kinesis-stream` and
  `state-machine`**. The docs undersell the flagship feature. This is a free win.
- **None of the five AgentCore resources are `connectTo`-able for IAM.** A Lambda that needs to call an AgentCore
  Runtime receives environment variables through the generic `referencableParams` path but no
  `bedrock-agentcore:InvokeAgentRuntime` permission. `hosting-bucket` and `efs-filesystem` are likewise absent
  (`hosting-bucket` is explicitly commented out at `role-helpers.ts:380`). Stacktape's newest and most marketable
  resource family does not participate in its most marketable feature.

**There is exactly one AWS service macro, and it grants `ses:*` on `*`.**
`CONNECT_TO_AWS_SERVICE_MACROS = ['aws:ses']` (`packages/config/src/aws-service-macros.ts:9`), and
`getStatementsForAwsServiceMacro` (`role-helpers.ts:293`) returns an unscoped wildcard. Stacktape markets automatic
least-privilege IAM; this one grant is the opposite. It is also the tell that **SES is a missing resource type** — the
macro exists precisely because users need to send email and there is nothing to `connectTo`.

**Container workloads cannot scale to zero.** `ContainerWorkloadScaling` documents it directly:
`packages/config/src/multi-container-workloads.ts:913` — _"Minimum running instances. Set to 0 is not supported —
minimum is 1."_ There is no sleep mode, no scheduled scale-down, and no `stop`/`sleep` command in the CLI surface.

**Cost estimation exists but only runs in `init`.** `fetchCostEstimate` is called from
`apps/cli/src/commands/init/using-starter-project/index.ts:97` and `apps/cli/src/commands/init/wizard/index.ts:144`.
Nothing in `deploy`, `diff` or `synth` touches pricing. The most differentiated asset in the product runs once, at the
moment the user has the least invested.

**No stage TTL.** `apps/docs/content/ci-cd-and-gitops/stacks-per-git-branch-pattern.mdx:209` tells users to "schedule a
script that lists stacks and deletes those older than N days." A docs table recommending a cron script is a feature
request with extra steps.

**No secret rotation.** `apps/docs/content/configuration/secrets.mdx:370` says rotation must be configured in the AWS
Console and the stack redeployed afterwards.

**Confirmed present, and worth marketing more loudly than the site does:** BYO-VPC and cross-stage/cross-project VPC
sharing (`packages/config/src/shared.ts:2662-2789`), a standalone shareable `application-load-balancer` with listener
rules, `$CfStackOutput()` for cross-stack references, and pricing that is a percentage of managed AWS spend with **no
per-seat fee** (`apps/docs/content/stacktape-console/billing-and-subscription.mdx:18`).

---

## 2. The competitive map, redrawn

The 08-05 audit used one axis (abstraction level). The buying decision has two: **who owns the account** and **what the
runtime substrate is**. That produces the categories that matter.

|                            | Vendor-hosted                         | Your AWS account                                           |
| -------------------------- | ------------------------------------- | ---------------------------------------------------------- |
| **Kubernetes substrate**   | —                                     | Qovery, Porter, Northflank, Coherence, Massdriver          |
| **Managed AWS primitives** | Render, Railway, Fly, Vercel, Netlify | **Stacktape**, SST, Ravion, Amplify, ECS Express Mode, CDK |

Stacktape's cell has four occupants that matter, and Stacktape is the only one that is simultaneously
application-level, AWS-native and operations-complete. That is the position the website should defend.

### 2a. BYOC PaaS — the closest positional competitors, entirely absent from the 08-05 audit

[Qovery](https://www.qovery.com/docs), [Porter](https://docs.porter.run/cloud-accounts/overview) and
[Northflank](https://northflank.com/blog/best-options-for-byoc-in-cloud-computing) all sell exactly Stacktape's pitch:
_a PaaS experience, in your own cloud account, with your own bill._ Qovery's own docs summarise it as "Managed
Kubernetes on AWS, GCP, Azure, Scaleway. Ready in 30 min."

**Every one of them runs on Kubernetes.** That is the entire differentiation argument, and it is structural:

- **They provision a cluster.** Porter's docs state provisioning takes ~30–45 minutes. An EKS control plane is ~$75/mo
  before a single node, and a realistic multi-AZ node group takes the floor to several hundred dollars a month. A
  Stacktape stack of Lambda + API Gateway + DynamoDB has a floor near zero.
- **They own a permanent upgrade treadmill.** Qovery markets "automated version upgrades and node patching" as a
  _feature_ — which tells you it is a problem their customers have. CloudFormation stacks have no equivalent.
- **They abstract AWS rather than expose it.** Their output is Kubernetes manifests and Terraform, not CloudFormation
  that composes with the rest of the customer's AWS estate.
- **Their pricing is per seat.** Qovery is $29/user/month on paid plans. Stacktape charges a percentage of managed AWS
  spend with no seat fee — which inverts as the team grows and is a genuinely strong page.

Where they are ahead, and Stacktape should copy rather than dismiss:

| Qovery capability                                                                         | Stacktape today                                  |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Deployment pipelines with ordered stages and dependency control                           | Not present — custom CI only                     |
| **Sleep mode / auto-stop for non-prod environments**                                      | Not present, and containers cannot scale below 1 |
| **Environment cloning** (duplicate an environment, service or database)                   | Not present                                      |
| Hierarchical variables (org → project → environment → service) with aliases and overrides | Stage-level only                                 |
| External secret manager sync (AWS Secrets Manager, Parameter Store, Doppler)              | Own store + `$SsmParam`                          |
| **Blueprints / service templates** for self-service golden paths                          | Starter projects (init-time only)                |
| Audit logs                                                                                | `info:operations` only                           |
| Multi-cloud (AWS, GCP, Azure, Scaleway, BYOK)                                             | AWS only — a deliberate choice, keep it          |

The three most worth taking are **sleep mode**, **environment cloning** and **deployment stages**. All three are things
a Stacktape user will eventually ask for, and the first is a cost feature, which is territory Stacktape already owns.

### 2b. AWS's own tooling just moved — and this is time-sensitive

- **AWS Copilot CLI reached end of support on June 12, 2026.**
  ([AWS announcement](https://aws.amazon.com/blogs/containers/announcing-the-end-of-support-for-the-aws-copilot-cli/).)
  AWS's recommended migration paths are ECS Express Mode or CDK L3 constructs. There is a population of teams actively
  looking for a replacement _right now_, and Stacktape's `web-service` / `worker-service` / `private-service` map onto
  Copilot's service types almost one-to-one. **A "migrating from AWS Copilot" page is the highest-intent, lowest-effort
  acquisition asset available, and its window is open now.**
- **Amazon ECS Express Mode** is GA and is the new AWS-native floor for "container to URL"
  ([docs](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-overview.html)). Give it a
  container image and it creates a Fargate service, an auto-generated domain, HTTPS, autoscaling and monitoring, at no
  additional charge. Two things matter for Stacktape:
  - It is **not** a competitor at the application level: no databases, no packaging/buildpacks, no local dev, no
    queues, no wiring, no cost attribution, no guardrails. The comparison writes itself.
  - It **shares one ALB across multiple services** as an explicit cost optimisation. Stacktape's ALB is
    ~$18/month and `web-service` provisions one per service unless the user drops to
    `multi-container-workload` + a standalone `application-load-balancer`. **AWS has now made ALB consolidation a
    documented baseline expectation.** Stacktape should make shared-ALB routing the default for `web-service`, or at
    minimum a one-line opt-in, and should support sharing one ALB across per-branch stages.
- **App Runner is not deprecated.** Its [FAQ](https://aws.amazon.com/apprunner/faqs/) still presents it as generally
  available and open to new customers. Secondary blog posts claiming otherwise are wrong. Do not put that claim on a
  comparison page.

### 2c. Frontend platforms — a real surface the audit ignored

Stacktape ships eight SSR framework resources (Next.js, Astro, Nuxt, SvelteKit, SolidStart, TanStack Start, Remix, plus
static hosting), with ISR, image optimization and middleware handled (`packages/config/src/nextjs-web.ts:10`),
streaming, warm instances, edge Lambda, CDN and WAF. That is a Vercel-class surface, and the site does not compete for
that traffic at all.

- **vs Vercel/Netlify:** the honest trade is DX polish and edge network against cost at scale, no per-seat pricing, and
  the fact that the frontend sits in the same stack as the database and queues it talks to. Vercel's per-seat plus
  usage pricing at scale is the standard reason teams leave.
- **vs AWS Amplify Hosting:** this is the closest match — same AWS account, same "Vercel-like flow." Amplify is
  narrower (weaker on advanced Next.js features, no container/database/queue story, no cost attribution or guardrails)
  and it is a hosting product, not an application platform. **"Amplify Hosting for your whole application, not just the
  frontend"** is a defensible page.

### 2d. Infrastructure-from-code — a consolidating category; do not chase it

[Winglang shut down as a company in early 2026](https://thenewstack.io/wing-the-startup-failed-but-the-language-has-potential/).
Ampt is effectively gone. [Nitric](https://github.com/nitrictech/nitric) and [Architect](https://arc.codes/) remain
active but small. [Encore](https://encore.dev/docs/platform) is the live one worth watching, and its lesson is
unchanged from the 08-05 audit: automatic service catalog, distributed tracing and preview environments seeded with
cloned data. Encore's tracing is the single most-cited reason developers pick it.

**Conclusion: the "new language / new programming model" bet is losing. Stacktape's YAML+TypeScript-over-CloudFormation
position is the surviving one.** That is worth saying on the website.

---

## 3. Resource-catalog gaps against SST

SST's full component list (from [sst.dev/llms.txt](https://sst.dev/llms.txt)) against Stacktape's union in
`packages/config/src/shared.ts:42`. Only genuine absences are listed.

| SST component                 | Stacktape                                    | Assessment                                                                                                             |
| ----------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Email` (SES)                 | **Missing**                                  | Highest-value gap. Every application sends email. The `aws:ses` wildcard macro is the workaround, and it is a bad one. |
| `ApiGatewayWebSocket`         | **Missing**                                  | Real-time apps have no serverless path; only ALB + containers.                                                         |
| `ApiGatewayV1` (REST)         | **Missing**                                  | Blocks API keys, usage plans and per-consumer throttling — i.e. anyone selling an API.                                 |
| `AppSync` (+ resolvers)       | **Missing**                                  | Lower priority; GraphQL demand is softening.                                                                           |
| `Realtime` (IoT Core pub/sub) | **Missing**                                  | Niche, but pairs with WebSocket demand.                                                                                |
| `Vector`                      | **Missing**                                  | Notable given five AgentCore resources exist. RAG has no storage primitive.                                            |
| `Dsql` (Aurora DSQL)          | **Missing**                                  | Low priority.                                                                                                          |
| `Auth` (OpenAuth)             | Cognito only                                 | Different philosophy; not a gap.                                                                                       |
| Managed Kafka                 | Self-managed trigger only (`events.ts:1353`) | Low priority.                                                                                                          |

Stacktape has and SST does not: MongoDB Atlas, Upstash Redis, Convex, five AgentCore resources, WAF, bastion, NLB,
GPU batch jobs, custom resource definitions, embedded CDK constructs, deployment scripts, and RDS engine breadth
(Oracle and SQL Server included).

**The catalog is not where Stacktape is losing.** SES and WebSocket are the only two that will cost deals.

---

## 4. The ranked gap list

Ordered by (user value × competitive necessity) ÷ effort. This is the answer to "are we missing something obvious and
useful."

### Tier 1 — obvious, and users will hit these in their first month

**1. Fix drift detection.** Restore fail-closed pre-deploy detection with tests, or delete the flag and the docs claim.
It is a false safety guarantee today, it is a prerequisite for resource import (the preflight diff and drift detection
are the same machinery), and it cannot appear in marketing until it works.

**2. Add an SES / email resource.** Domain identity, DKIM records wired into the existing custom-domain machinery,
configuration sets, bounce/complaint event destinations to SNS/EventBridge, sandbox-exit guidance, and a scoped
`connectTo` grant replacing `ses:*` on `*`. This is the most-used AWS service with no Stacktape representation, and the
wildcard macro is evidence the need is already known.

**3. Put cost into `diff` and `deploy`, and into PR comments.** The pricing package exists and already runs at `init`.
Wiring it into the change preview turns a one-time nicety into the product's signature moment: _"this PR adds
~$47/month."_ No competitor in any category does per-change cost preview against the customer's own account. Add
absolute and delta thresholds that can warn or block, reusing the guardrails mechanism.

**4. Sleep schedules and stage TTL.** Two halves of one feature:

- _Sleep:_ scheduled scale-down for non-production stages — ECS desired count to zero, Aurora Serverless v2 minimum ACU
  to zero, RDS stop (with automatic re-stop, since AWS force-starts after 7 days). Qovery markets up to 60% savings
  from this. Requires lifting the `minimum is 1` restriction for stages that opt in.
- _TTL:_ per-stage maximum lifetime and inactivity expiry with warning notifications. The docs currently instruct users
  to write this themselves. Forgotten stacks are the most common way a Stacktape user gets a surprise AWS bill, and
  cost control is the pillar Stacktape already owns — this gap is directly on-brand and directly embarrassing.

**5. Complete `connectTo`.** Add AgentCore (all five), `hosting-bucket` and `efs-filesystem`; scope the `ses:*` grant;
add `aws:bedrock` alongside `aws:ses`; and fix the doc block to list the three supported types it currently omits. This
is small, and it closes the credibility gap between "automatic IAM wiring" as a headline and its actual coverage.

**6. Default to shared ALB routing for `web-service`.** AWS has made ALB consolidation a documented baseline with ECS
Express Mode. Today each `web-service` using ALB load balancing gets its own (~$18/month), and per-branch stages
multiply it. Support host/path-based sharing within a stack by default, and one ALB shared across stages.

### Tier 2 — strategic, and each is a comparison-page line

**7. Typed runtime resource SDK.** `Resource.mainDb.connectionString` with types and completion, generated from the
config. Keep environment variables underneath. This is SST's most visible DX win and the logical completion of
`connectTo` — Stacktape already knows the resource, the permissions and the values.

**8. Release pipeline above GitOps.** Ordered stages with dependencies, pre-deploy checks, cost and change preview,
role-based approval, artifact promotion (not rebuild) from staging to production, bake time with automatic rollback,
and same-stack operation locks. Closes the gap against Qovery's deployment stages, CDK Pipelines, Pulumi Deployments
and Ravion. Keep zero-config GitOps as the default.

**9. WebSocket API Gateway resource.** With `connectTo` for connection management and the existing authorizer story.

**10. Environment cloning.** `stacktape stage:clone --from production --to staging` producing a reviewable config diff.
Qovery ships this; it is a common real workflow currently done by hand.

**11. Distributed tracing and a service map.** Opt-in OpenTelemetry/X-Ray across API Gateway/ALB → Lambda → containers
→ queues → databases, with a topology derived from `connectTo`, triggers and the synthesized template, plus deployment
markers. This is Encore's headline and Stacktape's largest genuine observability gap. Do not market Issues as APM
until this exists.

### Tier 3 — worth scheduling, not worth blocking on

**12.** REST API Gateway with API keys, usage plans and per-consumer throttling — unblocks selling an API.
**13.** Audit log in Console (the operations record is most of the data already).
**14.** Extensible guardrails: per-project/stage/team scope, exceptions with owner and expiry, warn-vs-block, custom
rules over the normalized config.
**15.** Multi-stack orchestration for monorepos — deploy N stacks in dependency order with shared outputs. Serverless
Compose is the benchmark; `$CfStackOutput()` is half the mechanism already.
**16.** Service templates / blueprints — a self-service catalog above starter projects, for platform teams.
**17.** Secret rotation configuration, and optional sync from external managers.
**18.** Database lifecycle workflows: PITR restore to a new stage, clone-and-sanitize, upgrade prechecks.
**19.** Resource rename/move refactors preserving physical resources (reuses the import machinery).
**20.** `Vector` / RAG storage primitive to complete the AgentCore story.

---

## 5. Ground nobody occupies

Confirmed across every product reviewed in both documents. These are where a differentiated roadmap lives.

1. **Declarative data import as part of provisioning.** Neon does it as a console wizard for one engine; DMS makes it
   infrastructure you operate; Render, Railway and Fly ship documentation telling you to run `pg_dump` yourself. An
   `initialData:` block versioned in the repo and executed inside the deploy is genuinely unoccupied. Already designed
   in `research/adopt-and-bootstrap-design-2026-08-05.md`.
2. **Cost delta per change, in the customer's own account.** Hosted PaaS products know their own prices but not the
   customer's AWS bill; IaC tools know the resources but not the prices. Stacktape has both.
3. **Preview stages seeded with anonymized production data**, with masking rules, allow/deny lists, size caps, audit
   records and automatic cleanup. Render and Railway cannot offer this at all; Encore's version has no masking policy.
4. **Reversible adoption** — reference → adopt → eject, with ownership detection ("this resource belongs to another
   CloudFormation stack / is tagged by Terraform"). SST _documents_ the warning; Stacktape could _enforce_ it.
5. **Cost-capped, self-expiring ephemeral environments in your own cloud.** Sleep schedules plus TTL plus a per-stage
   spend ceiling is a combination no BYOC competitor has, and it is the enterprise objection to preview environments.

---

## 6. Website and comparison-page material

### Positioning

The 08-05 audit's three-part structure (PaaS speed / your AWS without a ceiling / production included) is right. The
sharper one-line version, given the redrawn map:

> **A PaaS in your own AWS account — with no Kubernetes cluster to run, and no per-seat bill.**

Both clauses are load-bearing. The first separates Stacktape from Qovery, Porter and Northflank. The second separates
it from all of them plus Vercel. Both are verifiable.

### Comparison pages, reprioritised

The 08-05 order optimised for technical similarity. This order optimises for intent and timing:

1. **vs AWS Copilot** — _build this first._ Copilot hit end of support on June 12, 2026; those teams are searching now
   and AWS's own suggested alternatives (ECS Express Mode, CDK L3) are both a downgrade in scope. Frame as a migration
   guide, not a comparison.
2. **vs SST** — closest technical competitor, highest-intent evaluation traffic. Unchanged from 08-05.
3. **vs Qovery / Porter / Northflank** — same pitch, different substrate. Lead with cluster cost, the upgrade
   treadmill and per-seat pricing. One page covering the category, plus a per-vendor page if search demand justifies.
4. **vs Render** — own-AWS PaaS positioning. Unchanged.
5. **vs AWS Amplify** — "your whole application, not just the frontend." Genuinely uncontested traffic today.
6. **vs Serverless Framework** — migration from Lambda-first projects.
7. **vs AWS CDK** — build-vs-buy-your-platform.
8. **vs Vercel** — cost at scale and no per-seat pricing; expect this to be the highest-volume, lowest-conversion page.
9. **vs Ravion/Flightcontrol** and **vs Pulumi** — as scoped in the 08-05 audit.

### Claims to avoid

Everything in the 08-05 audit's list still applies. Additions:

- **Do not say App Runner is deprecated.** Its FAQ says otherwise; only Copilot has a confirmed end-of-support date.
- **Do not imply Stacktape is cheaper than Kubernetes BYOC in every case.** It is structurally cheaper at rest and at
  small scale; at high sustained container utilisation Fargate is not obviously cheaper than well-packed EC2 nodes.
  The honest claim is about the floor, the operational surface and the absence of seat fees.
- **Do not claim ECS Express Mode is a Stacktape competitor.** It is a primitive, and saying otherwise invites the
  reader to notice it is free.
- **Do not market `connectTo` as covering every resource** until AgentCore, `hosting-bucket` and `efs-filesystem` are
  wired — and fix the doc block either way, since it currently undersells what does work.
- **Do not market cost control without shipping cost-in-preview and stage TTL.** Cost is the strongest pillar and
  currently the one with the most visible hole: the product tells users to write their own cleanup cron.

---

## 7. Suggested sequencing

Nothing here changes the 08-05 recommendation that adopt-and-bootstrap is the flagship. It sharpens what should ship
around it.

**Before the website launches:** fix drift detection (or remove the claim); complete and re-document `connectTo`; scope
the `ses:*` grant.

**With, or just before, import:** cost in `diff`/`deploy` and PR comments; stage TTL; sleep schedules. All three are
cost-pillar features, all three are cheap relative to import, and together they make the "cost control built in"
claim defensible rather than aspirational.

**Next:** SES resource; shared-ALB default; typed runtime SDK; release pipeline.

**Then:** tracing and topology; WebSocket; environment cloning.

---

## Sources

Competitors: [Qovery docs](https://www.qovery.com/docs) and [docs index](https://www.qovery.com/docs/llms.txt),
[Porter cloud accounts](https://docs.porter.run/cloud-accounts/overview),
[Northflank BYOC overview](https://northflank.com/blog/best-options-for-byoc-in-cloud-computing) (vendor-authored —
treat as a lead, not a citation),
[SST component list](https://sst.dev/llms.txt),
[AWS Copilot end of support](https://aws.amazon.com/blogs/containers/announcing-the-end-of-support-for-the-aws-copilot-cli/),
[Amazon ECS Express Mode](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-overview.html),
[AWS App Runner FAQ](https://aws.amazon.com/apprunner/faqs/),
[Encore platform](https://encore.dev/docs/platform),
[Winglang shutdown](https://thenewstack.io/wing-the-startup-failed-but-the-language-has-potential/),
[Nitric](https://github.com/nitrictech/nitric), [Architect](https://arc.codes/),
[Railway cron jobs](https://docs.railway.com/cron-jobs) and [private networking](https://docs.railway.com/networking/private-networking).

Stacktape: the canonical docs under `apps/docs/content`, `packages/config/src`, and the CLI implementation paths cited
inline in section 1.
