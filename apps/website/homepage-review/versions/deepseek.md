<!-- DRAFT — future-launch editorial version. Sections 04–06 include capabilities that are not all shipped. See review notes before publishing. -->

# Stacktape homepage — content

This file is the homepage as text. Every word the page shows is here, verbatim, and every visual is described in a **Visual** block. The three layouts (`/stack`, `/sheet`, `/lens`) share all of it; only the arrangement differs (see the last section).

How to edit:

- Text inside a blockquote (`>`) is shown on the page exactly as written.
- A **Visual** block describes a picture or a product window. Change the description and the picture changes.
- Every "thing Stacktape does" has the same four fields: name, explanation, what you get, screen. Keep the fields; change the content.
- Facts about the example app (names, prices, URLs) live in one place at the end and are reused by every screen. They are invented sample data.

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

> Stacktape **v4** is out · Read what changed →

**Headline** (two lines)

> AWS DevOps,
> fully automated.

**Subheadline**

> One command reads your project on your own machine and writes one typed file describing your AWS setup: every resource, the reason it exists, and what it costs per month. You approve the plan and the deploy. Stacktape runs it in your AWS account and keeps watch after that.

**Command box** (the only call to action; the same box appears again in the closing)

| Tab     | Command                                                   |
| ------- | --------------------------------------------------------- |
| npx     | `npx stacktape init`                                      |
| macOS   | `curl -L https://installs.stacktape.com/macos.sh \| sh`   |
| Linux   | `curl -L https://installs.stacktape.com/linux.sh \| sh`   |
| Windows | `iwr https://installs.stacktape.com/windows.ps1 -useb \| iex` |

Button: `Copy` (becomes `Copied` for a moment). Hint next to the tabs: `opens the wizard in your browser`.

**Trust line**

> Open-source CLI (MIT) · No Stacktape account needed to see the plan · Native CloudFormation, property overrides and CDK constructs when you need them

**Visual: the cover composite.** A Stacktape Console window tilted slightly in 3D, with a terminal window lying flat in front of its bottom-right corner, both on soft shadows with a faint teal glow behind them.

- The Console window: browser chrome with a URL pill reading `console.stacktape.com/projects/acme-project/production`; a top bar with the wordmark and `acme-project / production`; a left nav with five items (Overview, Deployments, Monitoring, Security, Incidents; Overview selected). The main area shows three things: a status row (`Live` badge · `v42` · `eu-west-1` · `deployed 12 min ago`), six resource tiles in a 3×2 grid (name, type, `healthy`), and three KPIs (`Deployments 30d 48` · `Error rate 0.02 %` · `AWS cost MTD $112.90`). All figures are illustrative sample data.
- The terminal window: title `stacktape — deploy · zsh`; the command `$ stacktape deploy --stage production`; four phases (`Initialize ✓`, `Package ✓`, `Deploy ● 91 %`, `Outputs`); a green progress bar at 91 %; six resource rows (`web`, `apiService`, `worker`, `cache` marked `created`; `mainDatabase`, `firewall` marked `creating…`).

---

## 3. What Stacktape does (seven sections, in this order)

Every product window is dark and shows a real address in its chrome: a URL pill with a lock for Console pages, `127.0.0.1:4242/review` without a lock for the local wizard, and a title such as `stacktape — deploy · zsh` for a terminal. Windows contain at most five elements and no annotations. Every figure shown in these screens comes from the invented example app in section 7 and is illustrative, not a measurement or a real bill.

### 01 · Designs your infrastructure

**Explanation**

> One command reads your project on your machine — files only, or with the coding agent you already use, under your own AI account and read-only tools. It proposes the AWS resources your app needs, shows the evidence behind each one, applies production defaults to what you left open, and prices the setup before it exists.

**What you get**

- > One typed file for the whole stack — app, API, workers, database, cache, firewall — in YAML or TypeScript, with autocompletion in your editor.
- > Every proposal carries its reason. Change your mind in the wizard or the file, and the estimate moves with the resources.
- > Nothing is created on AWS while you look, and no account is needed to get the file. Nothing is sent to Stacktape; an agent reads under your own AI account.

**Screen** — browser window, `127.0.0.1:4242/review` (the init wizard, Review step)

**Visual.** Heading `Here's your app on AWS`, line `Read 41 files on this machine · nothing created on AWS yet`. Left: the six resources as rows, each with a coloured dot for its category, the name in mono, the type, one line saying why it exists, and its monthly price (see section 7). Right: the interactive isometric architecture diagram of the same app (public web and API behind the firewall; worker, cache and database inside the private network); a small `Click to zoom and pan` label. Bottom row: `14 AWS resources · ~$112 / month` on the left, a primary `Deploy →` button on the right, disabled until the AWS account, region and stack are confirmed.

### 02 · Packages it

**Explanation**

> Stacktape builds the code itself: built-in buildpacks, your own Dockerfile, a prebuilt image, or another buildpack. Point it at an entry file and TypeScript, Python, Java, Go, Ruby, PHP and .NET bundle with no build scripts to maintain. Packaging runs in parallel and reuses artifacts while the inputs they were built from stay unchanged.

**What you get**

- > Lambda buildpacks, your Dockerfile, prebuilt images and other buildpacks — mixed in one stack.
- > Parallel, content-aware packaging: a change to one service usually means work for one service.
- > Remote builds run on an EC2 runner in your own AWS account; optional local build tests run code before any AWS cost starts.

**Screen** — terminal window, `stacktape — deploy · zsh`

**Visual.** `$ stacktape deploy --stage production`, then `✓ Initialize`, `✓ Package` with three rows under it: `web · Next.js · bundled`, `apiService · container image · built`, `worker · Lambda · skipped · unchanged` (the skipped row is the point). A summary line `3 workloads packaged in parallel`, then `● Deploy starting…` and a dimmed `Outputs`.

### 03 · Deploys it

**Explanation**

> A push to main deploys. The build runner is an EC2 machine inside your AWS account, so caches and artifacts stay with you. Every pull request can get a complete environment of its own — its own resources, its own URL — deleted when the PR closes. Releases can shift traffic gradually, roll back to a retained version, or preview what they will replace, and supported workloads run locally with hot reload between deploys.

**What you get**

- > Push to deploy, with a preview environment per pull request that deletes itself on close. Production data is not copied into previews.
- > Preview which resources a config change replaces, and separate stages with their own configuration.
- > Gradual traffic shifting for Lambda and load-balanced container services, plus rollback to a retained release. Rollback does not reverse migrations or external side effects.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/deployments`

**Visual.** Heading `Deployments`, line `push to main → production · pull request → preview`. Three rows: `v42 · main a1b2c3d · "orders: fulfillment status"` with a `Rolling out` badge, a thin traffic bar `10 % → 100 %` labelled `canary`, and a secondary `Roll back to v41` button; `v41 · main 9f8e7d6` with a `Live` badge; `pr-128 · "checkout: apple pay"` with a `Preview` badge and the link `https://pr-128.preview.acme.com`.

### 04 · Monitors it

**Explanation**

> Logs, infrastructure metrics, traces, uptime probes and an error inbox come from the deploy itself: nothing to install, no monitoring vendor, and the data stays in your AWS account. Service pages show request rate, error rate and latency percentiles, and one request can be followed across your services.

**What you get**

- > Errors grouped, counted and kept with their stack trace. Grouping is opt-in and needs a redeploy to switch on.
- > Tracing when you enable it: Lambda runtimes instrument automatically; containers attach through the OpenTelemetry SDK.
- > Uptime probes and Playwright or API synthetic checks from several AWS regions, run inside your account, with no per-check fee.
- > Optional depth: anomaly alarms, browser vitals and JavaScript errors linked to backend traces, broader container tracing, configurable retention.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/monitoring`

**Visual.** Three metric tiles with sparklines: `Requests 184 req/s`, `p95 latency 212 ms`, `5xx 0.02 %`. Below them one trace waterfall for `GET /orders · 212 ms` with five spans (`GET /orders`, `handler`, `SELECT … FROM orders`, `redis GET`, `POST /events`), each a bar placed by its start and duration. At the bottom an uptime row: `api.acme.com/health · 99.98 %` and three regions with latencies (`Ireland 212 ms · Virginia 318 ms · Singapore 402 ms`).

### 05 · Secures it

**Explanation**

> Networking and permissions are wired from the same config: each service reaches only the resources it is connected to, and secrets are referenced from AWS Secrets Manager instead of living in committed files. Guardrails your team sets once — private databases, recoverable data stores, approved regions, supported firewalls — block a deploy that would break them before anything changes.

**What you get**

- > Eighteen guardrail types, enforced before a deploy runs, across the whole organization.
- > An opt-in security home scans dependencies and lockfiles, container images and repository history. Findings show the deployed version, the exposure and the fixed version where one exists, mapped to the resource and stage where evidence allows — with coverage gaps named. Exposure is context, not proof that your code is exploitable.
- > Validated fix pull requests for dependencies, base images and posture, plus rotation-first guidance for leaked secrets: the key is rotated and revoked, not merely moved. AWS-native depth — runtime monitoring, account posture, drift, IAM hygiene — is opt-in, with its AWS cost shown first. The bill of materials per release is stored in your AWS account.
**Screen** — browser window, `console.stacktape.com/organizations/acme/security`

**Visual.** Heading `Security`, line `Coverage: 3 of 4 inputs scanned · last recheck 40 min ago`. A four-row coverage list with states (`dependencies ✓`, `container images ✓`, `repository history ✓`, `prebuilt image · no source to scan`). Below it two findings, each with severity, package, deployed version and fixed version: `high · lodash 4.17.20 → 4.17.21 · apiService · production` and `medium · Dockerfile base image 3.19 → 3.20 · web`. At the bottom an on-switch row `Require private databases` and a red-tinted notice `Deploy to staging blocked · mainDatabase would get a public address` with a secondary `Fix in config` button.

### 06 · Handles incidents

**Explanation**

> Failures stop arriving as five notifications. A failed uptime probe, a broken synthetic check, an alarm, an error spike in production, or monitoring that goes quiet becomes one incident, with related signals grouped by stack, time and release. You see what fired, the error and stack trace, the release it started after, and the deployment events around it.

**What you get**

- > One incident with the evidence attached: errors and frames, git SHA, config diff, infrastructure events, probe results, redaction and verification steps.
- > Copy it for your agent or read it through the CLI: project-scoped API keys and MCP read tools, with mutating commands explicitly confirmed.
- > A remediation job you opt into per stage. It runs in your AWS account, the model holds no AWS or git credentials, and it opens a pull request for you to review. It never applies stateful changes or migrations on its own.
- > Alerts to Slack, Teams, email or a webhook with severity and suppression; a status page publishes only what you choose.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/incidents/inc_8f2k`

**Visual.** Header `Uptime check failed · api.acme.com/health` with a green `Resolved` badge and `11 min`. A timeline of five rows: `13:58 v41 deployed`; `14:02 incident opened · 3 of 3 regions failing` (red); `14:03 error grouped · PrismaClientKnownRequestError: column "fulfillment_status" does not exist · 214 occurrences`; `14:08 fix PR #131 opened by your agent, reviewed and merged`; `14:13 resolved · checks passing` (green). Under the timeline one line: `Alerted #alerts on Slack · 14:02`.

### 07 · Tracks costs

**Explanation**

> Every resource is priced before it exists. After deploy you see AWS-derived cost by project, stage and resource, with no markup, and budget alerts fire on thresholds and forecasts. AWS bills you directly; Stacktape's fee is separate.

**What you get**

- > List-price estimates while you design, actual AWS cost after deploy, attributed where AWS attributes it.
- > Budget alerts on actual and forecast spend. They warn; they do not cap spending, and AWS reports can lag.
- > Free for one member up to $100 a month of managed AWS spend, then rate tiers. Billing follows the AWS costs your stacks generate, not seats.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/costs`

**Visual.** Heading `Costs · September`, the total `$112.90` large with `from your AWS bill · no markup` under it. Six horizontal bars, longest first, name on the left and amount on the right (see section 7). A budget row: `Budget $150 · alert at 80 %` with a thin bar filled to 75 % and a marker at 80 %.

---

## 4. Closing

> That is the whole DevOps job: designed, deployed, watched, secured, answered. Start with one command.

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

Illustrative only: `acme-project` is an invented company, and every price, count, URL and duration below is sample data for the screens. None of it is a measurement, a benchmark or a real customer bill, and none of it should be presented as one.

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
