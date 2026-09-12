# Stacktape homepage — content

This file is the homepage as text. Every word the page shows is here, verbatim, and every visual is
described in a **Visual** block. The three layouts (`/stack`, `/sheet`, `/lens`) share all of it; only the
arrangement differs (see the last section).

---

## 1. Navigation

Sticky bar, 64px tall.

| Position | Item          | Goes to                                             |
| -------- | ------------- | --------------------------------------------------- |
| left     | Stacktape wordmark | `/`                                            |
| left     | How it works  | `#designs` (the first section)                      |
| left     | Docs          | https://docs.stacktape.com                          |
| left     | Pricing       | `/pricing`                                          |
| left     | Blog          | `/blog`                                             |
| left     | GitHub        | https://github.com/stacktape/stacktape              |
| right    | Sign in       | https://console.stacktape.com (text link)           |
| right    | Book a demo   | https://cal.com/stacktape/30min (secondary button)  |
| right    | Get started   | `#get-started` (primary button, scrolls to the command box) |

On phones: the wordmark, the Get started button and a menu button that opens a panel with the same links.

---

## 2. Hero

**Announcement pill** (links to `/blog/stacktape-v4`)

> Stacktape **v4** is out · Automated security scanning, unified incidents & AI remediation →

**Headline** (two lines)

> AWS DevOps,
> fully automated.

**Subheadline**

> Stacktape inspects your application, configures production-grade AWS infrastructure with sensible defaults, deploys directly to your own AWS account, and safeguards health and security across the entire software lifecycle. You stay in complete control of every architectural decision, with zero vendor lock-in.

**Command box** (the only call to action; the same box appears again in the closing)

| Tab     | Command                                                   |
| ------- | --------------------------------------------------------- |
| npx     | `npx stacktape init`                                      |
| macOS   | `curl -L https://installs.stacktape.com/macos.sh \| sh`   |
| Linux   | `curl -L https://installs.stacktape.com/linux.sh \| sh`   |
| Windows | `iwr https://installs.stacktape.com/windows.ps1 -useb \| iex` |

Button: `Copy` (becomes `Copied` for a moment). Hint next to the tabs: `opens the wizard in your browser`.

**Trust line**

> Open-source CLI (MIT) · Deploys to your own AWS account · CloudFormation & CDK escape hatches · Eject anytime

**Visual: the cover composite.** A Stacktape Console window tilted slightly in 3D, with a terminal window
lying flat in front of its bottom-right corner, both on soft shadows with a faint teal glow behind them.

- The Console window: browser chrome with a URL pill reading
  `console.stacktape.com/projects/acme-project/production`; a top bar with the wordmark and
  `acme-project / production`; a left nav with six items (Overview, Deployments, Monitoring, Security, Incidents,
  Costs; Overview selected). The main area shows three things: a status row (`Live` badge · `v42` ·
  `eu-west-1` · `deployed 12 min ago`), six resource tiles in a 3×2 grid (name, type, `healthy`), and three
  KPIs (`Deployments 30d 48` · `Vulnerabilities 0 critical` · `AWS cost MTD $112.90`).
- The terminal window: title `stacktape — deploy · zsh`; the command `$ stacktape deploy --stage production`;
  four phases (`Initialize ✓`, `Package ✓`, `Deploy ● 91 %`, `Outputs`); a green progress bar at 91 %; six
  resource rows (`web`, `apiService`, `worker`, `cache` marked `created`; `mainDatabase`, `firewall` marked
  `creating…`).

---

## 3. What Stacktape does (seven sections, in this order)

Every product window is dark (the Console's own material) and shows a real address in its chrome: a URL
pill with a lock for Console pages, `127.0.0.1:4242/review` without a lock for the local wizard, and a
title such as `stacktape — deploy · zsh` for a terminal. Windows contain at most five elements and no
annotations.

### 01 · Designs your infrastructure

**Explanation**

> Run one command on your laptop. Stacktape inspects your application files locally, using the coding agent
> you already have or pure file heuristics. It drafts a complete, typed infrastructure specification in
> TypeScript or YAML, with production-ready defaults for networking, compute, and databases. You see the exact
> resource graph, the source code lines that triggered each resource, and an estimated monthly AWS bill
> before a single cloud resource is created.

**What you get**

- > One typed file defines your entire stack: web apps, APIs, background workers, databases, caches, and networking.
- > Every resource is mapped to your code with clear architectural rationales and editable AWS defaults.
- > Strict source privacy: code inspection runs locally. Your source code and configs are never sent to Stacktape.

**Screen** — browser window, `127.0.0.1:4242/review` (the init wizard, Review step)

**Visual.** Heading `Here's your app on AWS`, line `Read 41 files on this machine · nothing created on AWS yet`.
Left: the six resources as rows, each with a coloured dot for its category, the name in mono, the type,
one line saying why it exists, and its estimated monthly price. Right: the interactive isometric architecture
diagram of the same app (public web and API behind the firewall; worker, cache, and database inside the private
VPC subnets); a small `Click to zoom and pan` label. Bottom row: `14 AWS resources · ~$112 / month` on the
left, a primary `Deploy →` button on the right. *(Illustrative screen data based on example app).*

### 02 · Packages it

**Explanation**

> Stacktape turns your application code into optimized container images and Lambda deployment packages
> automatically. Point it at an entry file or directory, and built-in buildpacks package Node.js, Python,
> Go, Java, Ruby, PHP, or .NET with zero configuration. When you need custom runtime dependencies, bring your
> own Dockerfile or Nixpacks. Remote builds execute inside your own AWS account on an EC2 runner, using
> content-addressed artifact caching to bypass unchanged workloads.

**What you get**

- > Zero-config packaging for major runtimes, with native support for custom Dockerfiles and Nixpacks.
- > Content-hashed build caching: only modified services rebuild, cutting pipeline runtimes.
- > Container images land directly in Amazon ECR inside your account, with no external registry dependencies.

**Screen** — terminal window, `stacktape — deploy · zsh`

**Visual.** `$ stacktape deploy --stage production`, then `✓ Initialize`, `✓ Package` with three rows under
it: `web · Next.js · bundled · 41 s`, `apiService · container image · built · 58 s`, `worker · Lambda ·
skipped · unchanged`. A summary line `3 workloads packaged in parallel · 58 s`, then `● Deploy starting…`
and a dimmed `Outputs`. *(Illustrative screen data).*

### 03 · Deploys it

**Explanation**

> Connect your repository and push code. Stacktape orchestrates declarative GitOps workflows for GitHub,
> GitLab, and Bitbucket. Every pull request can spin up an isolated preview environment with dedicated
> resources that automatically tear down when the pull request closes. For production stages, preview
> infrastructure diffs before applying changes, configure gradual traffic shifting for supported compute,
> and roll back immediately to retained deployment artifacts if a release misbehaves.

**What you get**

- > Push-to-deploy GitOps pipelines with automatic preview environments per pull request.
- > Safe production rollouts: configurable canary and linear traffic shifting for Lambda and ALB container services.
- > One-command rollbacks to immutable deployment artifacts, plus automated release health bake gates.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/deployments`

**Visual.** Heading `Deployments`, line `push to main → production · pull request → preview`. Three rows:
`v42 · main a1b2c3d · "orders: fulfillment status"` with a `Rolling out` badge, a thin traffic bar
`10 % → 100 %` labelled `canary · 4 min left`, and a secondary `Roll back to v41` button; `v41 · main 9f8e7d6`
with a `Live` badge; `pr-128 · "checkout: apple pay"` with a `Preview` badge and the link
`https://pr-128.preview.acme.com`. *(Illustrative screen data).*

### 04 · Monitors it

**Explanation**

> Gain complete observability across your stack without third-party monitoring vendors or agent installations.
> Stacktape captures structured logs, tracks core infrastructure metrics, groups application error spikes,
> and executes synthetic uptime probes across multiple AWS regions. OpenTelemetry tracing connects incoming
> HTTP requests to backend database queries and queue dispatches, keeping all operational telemetry secure
> inside your own cloud account.

**What you get**

- > Centralized structured log streaming and AWS infrastructure metrics with zero third-party agent overhead.
- > Distributed request tracing via OpenTelemetry with automatic instrumentation on supported runtimes.
- > Multi-region uptime checks and synthetic API tests run directly from your AWS account.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/monitoring`

**Visual.** Three metric tiles with sparklines: `Requests 184 req/s`, `p95 latency 212 ms`, `5xx 0.02 %`.
Below them one trace waterfall for `GET /orders · 212 ms` with five spans (`GET /orders`, `handler`,
`SELECT … FROM orders`, `redis GET`, `POST /events`), each a bar placed by its start and duration. At the
bottom an uptime row: `api.acme.com/health · 99.98 %` and three probe regions (`Ireland 212 ms ·
Virginia 318 ms · Singapore 402 ms`). *(Illustrative screen data).*

### 05 · Secures it

**Explanation**

> Enforce enterprise-grade security posture by default. Stacktape isolates databases in private subnets,
> provisions IAM roles scoped strictly to connected services, and stores credentials in AWS Secrets Manager.
> Pre-deploy guardrails reject misconfigurations across your organization before AWS changes apply. Integrated
> scanning detects vulnerable dependencies, container CVEs, and committed secrets, while deployment SBOMs
> continuously recheck against newly published advisories without requiring rebuilds.

**What you get**

- > Automated private VPC networking, least-privilege service connections, and encrypted Secrets Manager references.
- > Organizational guardrails that block non-compliant deployments before cloud resources change.
- > Continuous vulnerability and secret scanning (Trivy, Gitleaks) with customer-stored deployment SBOMs.

**Screen** — browser window, `console.stacktape.com/organizations/acme/guardrails`

**Visual.** Heading `Guardrails & Security`, line `18 policy rules active · SBOM recheck clean 14 min ago`.
Four rules with status toggles: `Keep SQL databases private`, `Require recoverable data stores`, `Require
WAF on public endpoints`, `Allowed regions: eu-west-1, us-east-1`. Under them, one red-tinted notice:
`Deploy to staging blocked · mainDatabase missing private subnet placement` with a secondary `View fix in config` button. *(Illustrative screen data).*

### 06 · Handles incidents

**Explanation**

> When uptime probes fail or production error rates spike, Stacktape opens an incident that correlates alarms,
> error groups, and telemetry with the exact triggering git commit. For rapid troubleshooting, export redacted
> CLI and MCP evidence bundles directly into your local coding agent. For hosted triage, an isolated, scoped
> job in your AWS account analyzes telemetry and opens a validated fix pull request for developer review.

**What you get**

- > Unified incident correlation uniting uptime probes, synthetic alerts, error groups, and deployment timelines.
- > Real-time alerts routed to Slack, Microsoft Teams, email, or custom webhooks.
- > Local MCP evidence export and hosted AI triage generating validated pull requests with mandatory human review.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/incidents/inc_8f2k`

**Visual.** Header `Uptime check failed · api.acme.com/health` with a green `Resolved` badge and duration `11 min`.
A timeline of five rows: `13:58 v41 deployed`; `14:02 incident opened · 3 of 3 regions failing` (red);
`14:03 error grouped · PrismaClientKnownRequestError: column "fulfillment_status" does not exist · 214
occurrences`; `14:08 fix PR #131 opened by triage agent, reviewed and merged`; `14:13 resolved · checks
passing` (green). Under the timeline: `Alerted #alerts on Slack · 14:02`. *(Illustrative screen data).*

### 07 · Tracks costs

**Explanation**

> Monitor infrastructure expenditures directly from your AWS Cost and Usage Reports, broken down by project,
> environment stage, and individual resource with zero vendor markup. Set organization-wide or stack-level
> budgets with automated threshold and forecast alerts to catch unexpected spikes before your invoice arrives.
> AWS bills your account directly; Stacktape charges a transparent, separate fee with a generous free tier.

**What you get**

- > Granular cost attribution per project, stage, and cloud resource derived from native AWS billing data.
- > Actual spend and predictive forecast alerts delivered straight to your notification channels.
- > Free tier covers up to $100/month of managed AWS spend, followed by predictable usage tiers with zero per-seat fees.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/costs`

**Visual.** Heading `Costs · September`, the total `$112.90` large with `from your AWS bill · no markup` under
it. Six horizontal bars, longest first, name on the left and amount on the right. A budget row: `Budget $150 ·
alert at 80 %` with a thin bar filled to 75 % and a marker at 80 %. *(Illustrative screen data based on example app).*

---

## 4. Closing

> That is the whole DevOps job. Start with one command.

The command box again (no hint text), then the trust line, then:

> Already set up? [Sign in to the Console](https://console.stacktape.com)

---

## 5. Testimonials

Title:

> Teams running on Stacktape

Three quotes, each with the name and role under it:

1. > "As a startup founder & CTO, every hour is crucial. With Stacktape, we fast-tracked our AWS deployment
   > process. Our development and production environments were operational in just two days. Stacktape's
   > speed and efficiency have been game-changing for us"
   >
   > — Eric Allam, CTO & Founder, Trigger.dev

2. > "Stacktape (the product) and Stacktape (the team) have helped us move extremely fast. They abstract
   > away so much of the complexity of AWS, and let us focus on our application logic, instead of
   > infrastructure configuration. The team is second to none, hopping in to be true partners with us on
   > our development journey. We would not be where we are today without Stacktape."
   >
   > — Henry Garrett, Founding Engineer, Receipts

3. > "Stacktape has been a game-changer for Lastmyle, providing a secure and intuitive way to manage our
   > AWS deployments. It's allowed our small team to efficiently handle environments using GitOps, all
   > while keeping a tight rein on costs."
   >
   > — Rhys Williams, CTO & Founder, Lastmyle

---

## 6. Footer

Four columns above a bottom row.

| Product          | Docs             | Company  | Legal          |
| ---------------- | ---------------- | -------- | -------------- |
| How it works     | Getting started  | Blog     | Privacy policy |
| Pricing          | Resources        | Contact  | Terms of use   |
| Starter projects | Packaging        | GitHub   |                |
| Changelog        | CI/CD & GitOps   | LinkedIn |                |
| Console          | Observability    | X        |                |
| Status           | Guardrails       |          |                |
|                  | Costs            |          |                |
|                  | Using with AI    |          |                |

Link targets:

- Product: How it works `#designs` · Pricing `/pricing` · Starter projects
  https://docs.stacktape.com/getting-started/starter-projects · Changelog
  https://github.com/stacktape/stacktape/releases · Console https://console.stacktape.com · Status
  https://status.stacktape.com
- Docs: https://docs.stacktape.com/getting-started/configure-your-stack · /resources · /packaging/overview ·
  /ci-cd-and-gitops/overview · /observability/overview · /guardrails/overview · /managing-costs/overview ·
  /using-with-ai/overview
- Company: Blog `/blog` · Contact `mailto:info@stacktape.com` · GitHub https://github.com/stacktape/stacktape ·
  LinkedIn https://www.linkedin.com/company/stacktape · X https://x.com/stacktape
- Legal: `/privacy-policy` · `/terms-of-use`

Bottom row: the wordmark · `© 2026 Stacktape` · `Open-source CLI (MIT)` · `Made in the EU` · `System status`
with a small green dot (links to the status page).

No Slack, Discord or community links anywhere on the page.

---

## 7. The example app (facts every screen reuses)

Project `acme-project`, stage `production`, region `eu-west-1`. Public URLs `https://acme.com` and
`https://api.acme.com`; preview URL `https://pr-128.preview.acme.com`. Releases `v41` (previous) and `v42`
(current).

| Resource       | Type                      | Why it exists (wizard)             | Monthly |
| -------------- | ------------------------- | ---------------------------------- | ------- |
| `web`          | Next.js                   | next.config.js in ./web            | $3.80   |
| `apiService`   | Web service (Fargate)     | Dockerfile in ./api                | $34.20  |
| `worker`       | Lambda function           | worker.ts subscribes to the queue  | $0.70   |
| `mainDatabase` | Aurora PostgreSQL 16      | Prisma schema targets PostgreSQL   | $61.40  |
| `cache`        | Redis (ElastiCache)       | ioredis in package.json            | $11.90  |
| `firewall`     | Web application firewall  | public web app                     | $0.90   |

Other: `$0.90` (costs screen only). Total `$112.90`; the wizard rounds it to `~$112 / month` and counts
`14 AWS resources`. Budget `$150`, alert at 80 %.

---

## 8. How the three layouts arrange this content

- **`/stack`** — dark, warm ground with copper section numbers. A normal hero (copy left, cover composite
  right). The seven sections are full-viewport cards that pile up as you scroll: each slides over the last,
  and the cards already passed stay as thin numbered edges at the top. Text on the left of each card, the
  screen on the right. Closing card, testimonials, footer.
- **`/sheet`** — light. Warm paper with a faint isometric grid as texture; the product windows stay dark and
  sit on the paper on real shadows. Hero (copy left, composite right). A sticky index `01 … 07` on the left
  ticks as you read; each section is a paper card with the text above its window. Closing on a dark band,
  testimonials, footer.
- **`/lens`** — deep green-black. Centred hero with the cover composite below it, full width. Then one product
  window stays pinned on the right while the seven sections scroll past on the left; the window crossfades
  to each section's screen and resizes to it. A rail of seven dots between the columns shows progress. On
  phones each section shows its own screen inline. Closing, testimonials, footer.
