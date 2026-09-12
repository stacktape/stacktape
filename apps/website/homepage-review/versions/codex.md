## Navigation

Sticky bar, 64px tall.

| Position | Item | Destination |
|---|---|---|
| Left | Stacktape wordmark | `/` |
| Left | How it works | `#designs` |
| Left | Docs | https://docs.stacktape.com |
| Left | Pricing | `/pricing` |
| Left | Blog | `/blog` |
| Left | GitHub | https://github.com/stacktape/stacktape |
| Right | Sign in | https://console.stacktape.com |
| Right | Book a demo | https://cal.com/stacktape/30min |
| Right | Get started | `#get-started` |

On phones: wordmark, Get started and a menu button containing the remaining links.

## Hero

**Pill** — links to `#designs`

> From first deploy to everyday operations

**Headline**

> AWS DevOps,  
> fully automated.

**Subheadline**

> Stacktape reads your repository, designs your infrastructure and deploys it to your own AWS account. It connects deployment, monitoring, security and costs, with sensible defaults and your team in control of the decisions that matter.

**Audience line**

> For teams building a product without a DevOps team.

**Command box** — anchor `#get-started`

```sh
npx stacktape init
```

Button: **Copy**, briefly becoming **Copied**.

> Opens a local browser wizard. You choose when analysis begins.

> No Stacktape or AWS account needed to analyze and generate configuration. Deployment is a separate step.

**Trust line**

> Your AWS account · Native AWS resources · Open-source CLI (MIT)

**Visual.** A dark Console window with a terminal overlapping its lower-right corner. Soft shadows and a restrained teal glow give the windows depth.

The Console chrome shows `console.stacktape.com/projects/acme-project/production`. Four content groups: project and stage; release `v42`; a compact architecture showing the shared example resources; an `Open incident · View evidence` card. The terminal shows `stacktape deploy --stage production` with completed Initialize, Package, Deploy and Outputs phases. No elapsed times or performance claims.

All product windows carry a small **Illustrative product view** label in their chrome. Screen data and scenarios are fictional.

## 01 · Designs your infrastructure

Anchor: `#designs`.

**Explanation**

> Start with the app you have. Stacktape recognizes supported services and proposes an AWS setup with source evidence, explained choices and sensible defaults. Change a choice and see the configuration and cost estimate update. Save the result as YAML or TypeScript.

**What you get**

- Containers, functions, databases, queues and more in one configuration.
- Connections wire permissions, network access and connection variables.
- Extend your setup with CloudFormation resources, property overrides or CDK constructs.

> With Claude Code or Codex, source goes to your AI provider under your plan. Stacktape receives no source, filenames or configuration contents. Files-only scanning uses no AI.

**Screen** — local browser wizard, `127.0.0.1:4242/review`, without a lock icon.

**Visual.** Five content groups:

1. `Your app, mapped to AWS` with `Review complete · nothing deployed`.
2. Resource rows using the shared names and source evidence below.
3. A selected database decision: `Private network · Backups enabled`, with its implications explained and an Edit control.
4. A diagram connecting the frontend, API, queue, worker and database; the firewall protects the public API entry.
5. `View AWS cost estimate` and `Save configuration`.

The database choices belong to this example. The screen does not imply they are universal defaults.

## 02 · Packages your app

**Explanation**

> Use built-in packaging for supported apps, or bring a Dockerfile, another buildpack or a prebuilt image. Containers and functions can share a stack. Build locally or use the EC2 runner in your AWS account.

**What you get**

- Parallel builds reuse cached artifacts when available.
- Run supported workloads locally with hot reload and local databases.
- Connect local services to deployed resources when needed.

**Screen** — terminal, `stacktape — deploy · zsh`.

**Visual.** A command line, a Package heading, one grouped workload list and a final transition to deployment. The list shows `web · packaged`, `apiService · image built` and `worker · cached artifact reused`. A small status line identifies `Build location · your AWS account`. No invented build durations or speed comparisons.

## 03 · Deploys your changes

**Explanation**

> Connect GitHub, GitLab or Bitbucket, or call the CLI from your existing CI. Configure push and PR deployments, review infrastructure changes and verify releases against the checks you choose.

**What you get**

- Independent PR environments, with their own resources and cleanup on closure.
- Gradual traffic shifts for Lambda and eligible container services.
- Release gates that check health after deployment and apply your rollback policy.

> Rollback restores retained deployment artifacts. Database migrations and external side effects need their own recovery plan.

**Screen** — `console.stacktape.com/projects/acme-project/production/deployments`.

**Visual.** Four content groups: configured branch rules; the `v42` release card; retained release `v41`; preview `pr-128`.

The `v42` card shows `Verifying release`, an order-history API check and an active observation window. Its rollback policy is accessible beside the verification status. The preview card links to `https://pr-128.preview.acme.example` and states `Independent resources · cleanup on PR closure`. No production-data copy is depicted.

## 04 · Monitors your app

**Explanation**

> When customers hit a slow page, start with the service behind it. See request rates, errors and latency by service and operation, then follow an instrumented request into traces and logs. Enable the monitoring each workload needs.

**What you get**

- Grouped application errors, with counts and stack traces where captured.
- Regional uptime probes and Playwright or API checks for important journeys.
- Deployment markers to connect changes with the trouble that followed.

> Tracing requires a supported runtime; containers need instrumentation setup.

**Screen** — `console.stacktape.com/projects/acme-project/production/monitoring`.

**Visual.** Four content groups: service selector with `apiService` selected; request, error and latency charts with a `v42` deployment marker; an operation detail for `GET /orders`; configured uptime and order-history checks.

Selecting the operation reveals a trace waterfall with API and database spans, plus a link to related logs. Charts are schematic, without numerical performance results. Tracing is explicitly shown as enabled for this instrumented service.

## 05 · Secures your stack

**Explanation**

> Set rules for private databases, backups and approved regions, enforced before deployment. Then see security findings in context: which deployed resource is affected, what was checked and what to do next.

**What you get**

- Scan dependencies, container packages and infrastructure settings.
- Find leaked secrets with redacted findings and guidance to rotate or revoke them.
- Recheck saved software inventories as vulnerability information changes.

> Coverage states show what could not be checked. Findings include fixed versions where available; exposure alone does not prove exploitability.

**Screen** — `console.stacktape.com/projects/acme-project/production/security`.

**Visual.** Five content groups: project and release; scan coverage; findings; the selected finding’s details; organization deployment rules.

Coverage distinguishes `Checked`, `Incomplete` and `Not checked`. An illustrative container finding belongs to `apiService`, identifies the deployed image and indicates that a fixed package version exists. A separate redacted secret finding says `Rotate or revoke this credential`. No secret value or invented CVE identifier appears.

The rules group shows private-database, backup and region requirements. Scan findings and pre-deployment rules have distinct statuses.

## 06 · Helps resolve incidents

**Explanation**

> An alert should come with somewhere to start. Stacktape groups related signals around the stack and release, with evidence your team can inspect. Ask the hosted agent to investigate and open a validated fix pull request. Its diagnosis is a hypothesis; your team reviews the change.

**What you get**

- Logs, errors, infrastructure events and probe results together.
- Copy an evidence bundle or give your coding agent scoped read access.
- Hosted investigations run in your AWS account, with attempt and spend limits.

**Screen** — `console.stacktape.com/projects/acme-project/production/incidents/inc_orders`.

**Visual.** Five content groups:

1. `Order history errors · Open`.
2. Related evidence: the failed API check, a grouped null-access error and affected requests carrying release `v42`.
3. `Working hypothesis · missing-order handling`.
4. `Fix PR #131 · validation completed · awaiting human review`.
5. `Copy evidence for your agent`.

The proposed application change handles a missing order and adds a regression test. The incident remains open; the screen claims neither a verified root cause nor a successful recovery.

## 07 · Tracks your costs

**Explanation**

> Know the likely AWS cost before deploying, then follow actual spend as AWS reports it. See attributed costs by project, stage and resource. AWS bills you directly; Stacktape’s fee is separate.

**What you get**

- Estimates update as you change the proposed setup.
- Budget alerts cover actual spending and forecasts.
- Budgets warn you; they do not cap spending.

> AWS reporting can lag, and some shared costs cannot be assigned to a resource.

> [See plans and pricing →](/pricing)

**Screen** — `console.stacktape.com/projects/acme-project/production/costs`.

**Visual.** Four content groups: period and stage selector; resource cost breakdown; shared or unattributed costs; budget settings.

The breakdown uses schematic horizontal bars labelled with the shared resource names, without invented dollar amounts. The budget settings read `Monthly budget $150 · threshold alert at 80% · forecast alerts enabled`. Those numbers are fictional user-selected settings, not an AWS bill or a savings claim.

## Closing

> See what running your app on AWS would take.

> Run the wizard. Review your setup. Decide when to deploy.

**Command box**

```sh
npx stacktape init
```

Button: **Copy**, briefly becoming **Copied**.

> Your AWS account · Native AWS resources · Open-source CLI (MIT)

> Already set up? [Sign in to the Console](https://console.stacktape.com)

## Testimonials

**Title**

> What teams have said about Stacktape

> "As a startup founder & CTO, every hour is crucial. With Stacktape, we fast-tracked our AWS deployment process. Our development and production environments were operational in just two days. Stacktape's speed and efficiency have been game-changing for us"
>
> — Eric Allam, CTO & Founder, Trigger.dev

> "Stacktape (the product) and Stacktape (the team) have helped us move extremely fast. They abstract away so much of the complexity of AWS, and let us focus on our application logic, instead of infrastructure configuration. The team is second to none, hopping in to be true partners with us on our development journey. We would not be where we are today without Stacktape."
>
> — Henry Garrett, Founding Engineer, Receipts

> "Stacktape has been a game-changer for Lastmyle, providing a secure and intuitive way to manage our AWS deployments. It's allowed our small team to efficiently handle environments using GitOps, all while keeping a tight rein on costs."
>
> — Rhys Williams, CTO & Founder, Lastmyle

## Footer

| Product | Docs | Company | Legal |
|---|---|---|---|
| [How it works](#designs) | [Getting started](https://docs.stacktape.com/getting-started/configure-your-stack) | [Blog](/blog) | [Privacy policy](/privacy-policy) |
| [Pricing](/pricing) | [Resources](https://docs.stacktape.com/resources) | [Contact](mailto:info@stacktape.com) | [Terms of use](/terms-of-use) |
| [Starter projects](https://docs.stacktape.com/getting-started/starter-projects) | [Packaging](https://docs.stacktape.com/packaging/overview) | [GitHub](https://github.com/stacktape/stacktape) | |
| [Changelog](https://github.com/stacktape/stacktape/releases) | [CI/CD & GitOps](https://docs.stacktape.com/ci-cd-and-gitops/overview) | [LinkedIn](https://www.linkedin.com/company/stacktape) | |
| [Console](https://console.stacktape.com) | [Observability](https://docs.stacktape.com/observability/overview) | [X](https://x.com/stacktape) | |
| [Status](https://status.stacktape.com) | [Guardrails](https://docs.stacktape.com/guardrails/overview) | | |
| | [Costs](https://docs.stacktape.com/managing-costs/overview) | | |
| | [Using with AI](https://docs.stacktape.com/using-with-ai/overview) | | |

Bottom row:

> Stacktape · © 2026 Stacktape · Open-source CLI (MIT) · Made in the EU · [System status](https://status.stacktape.com)

Any status indicator reflects the actual service status. It is not permanently green.

## Shared example-app facts

All names, source evidence, releases, findings and outcomes below are illustrative. Screens show different moments in the same example’s lifecycle.

- Project: `acme-project`; stage: `production`; region: `eu-west-1`.
- Frontend: `https://acme.example`; API: `https://api.acme.example`.
- Preview: `https://pr-128.preview.acme.example`.
- Releases: `v41` is the retained previous release; `v42` is the release being deployed and investigated.
- Incident: order-history requests encounter missing-order handling errors. PR `#131` proposes an application-code fix and remains awaiting review.
- Budget: a fictional `$150` monthly setting, with an `80%` threshold and forecast alerts.
- No monthly AWS price, measured latency, build duration or recovery time is asserted.

| Resource | Type | Illustrative wizard evidence or decision |
|---|---|---|
| `web` | Next.js frontend | `web/next.config.js` |
| `apiService` | Container web service on Fargate | `api/Dockerfile` |
| `worker` | Lambda function | `worker/process-order.ts` |
| `mainDatabase` | RDS PostgreSQL | PostgreSQL datasource in `api/prisma/schema.prisma` |
| `orderQueue` | SQS queue | Publisher and consumer references in the API and worker |
| `firewall` | Web application firewall | Protection selected for the public API entry |

The API uses the database and publishes to the queue. The worker consumes queued work and uses the database. Private database access and backups are selected protections for this example.

## Layout notes

All three layouts use identical copy and example facts. Product windows stay dark, use appropriate browser or terminal chrome, and contain at most five main content groups. No floating explanatory annotations.

- **`/stack`:** Warm dark background with copper section numbers. Hero copy left, composite right. Seven large cards stack during scrolling, retaining numbered edges above. Each card places text left and its screen right. Closing, testimonials, footer.
- **`/sheet`:** Warm light paper with a faint isometric grid. Dark windows sit on soft shadows. Hero copy left, composite right. A sticky `01–07` index tracks the sections; each paper card places text above its window. Dark closing band, testimonials, footer.
- **`/lens`:** Deep green-black background. Centered hero with the composite beneath. Section text scrolls on the left while a pinned window on the right transitions between screens. Seven dots indicate progress. Closing, testimonials, footer.

On phones, each section’s screen appears inline. Reduced-motion presentation uses ordinary scrolling and static windows.
