# Stacktape homepage — content (future-launch draft)

This file is the homepage as text. Visitor-visible words sit in blockquotes (`>`); a **Visual** block describes a picture or product window. Every "thing Stacktape does" keeps the same four fields: name, explanation, what you get, screen. Facts for the example app live in one place at the end (section 7) and are reused by every screen — **all names, prices, identifiers, percentages and timings in screens are illustrative, not real data**. Status: editorial draft for review; see accompanying review notes.

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

> One command opens a wizard in your browser. It reads your project on your machine and writes the whole
> AWS setup into one typed file — every resource, why it's there, its monthly price. Deploy to your own
> AWS account when you're ready. After that, Stacktape runs the rest of the DevOps job — watching,
> securing, responding, accounting — and keeps you in the loop for anything that needs a human.

**Command box** (the only call to action; the same box appears again in the closing)

| Tab     | Command                                                   |
| ------- | --------------------------------------------------------- |
| npx     | `npx stacktape init`                                      |
| macOS   | `curl -L https://installs.stacktape.com/macos.sh \| sh`   |
| Linux   | `curl -L https://installs.stacktape.com/linux.sh \| sh`   |
| Windows | `iwr https://installs.stacktape.com/windows.ps1 -useb \| iex` |

Button: `Copy` (becomes `Copied` for a moment). Hint next to the tabs: `opens the wizard in your browser`.

**Trust line**

> Open-source CLI (MIT) · Runs in your AWS account · Extend or override anything · Eject anytime

**Visual: the cover composite.** A Stacktape Console window tilted slightly in 3D, with a terminal window
lying flat in front of its bottom-right corner, both on soft shadows with a faint teal glow behind them.

- The Console window: browser chrome with a URL pill reading
  `console.stacktape.com/projects/acme-project/production`; a top bar with the wordmark and
  `acme-project / production`; a left nav with five items (Overview, Deployments, Monitoring, Security,
  Costs; Overview selected). The main area shows three things: a status row (`Live` badge · `v42` ·
  `eu-west-1` · `deployed 12 min ago`), six resource tiles in a 3×2 grid (name, type, `healthy`), and three
  KPIs (`Deployments 30d 48` · `Error rate 0.02 %` · `AWS cost MTD $112.90`).
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

> Run the command and the wizard reads your project locally — with Claude Code or Codex under your own AI
> account, or files-only if you'd rather skip AI — then writes the AWS setup into one typed file. Every
> resource shows the code behind it, why it's there, a sensible default where a choice is open, and its
> monthly cost. Nothing is sent to Stacktape, and nothing exists on AWS until you approve a deploy.

**What you get**

- > One typed file for the whole stack — app, API, workers, database, cache, firewall — with autocompletion in your editor.
- > Every proposal carries its evidence and reason; defaults fill the gaps, choices are changeable, and the price updates as you go.
- > Stacktape receives no source, filenames or config. If you use AI, it runs under your own account and plan.

**Screen** — browser window, `127.0.0.1:4242/review` (the init wizard, Review step)

**Visual.** Heading `Here's your app on AWS`, line `Read 41 files on this machine · nothing created on AWS yet`.
Left: the six resources as rows, each with a coloured dot for its category, the name in mono, the type,
one line saying why it exists, and its monthly price (see the example app below). Right: the interactive
isometric architecture diagram of the same app (public web and API behind the firewall; worker, cache and
database inside the private network); a small `Click to zoom and pan` label. Bottom row: `14 AWS resources
· ~$112 / month` on the left, a primary `Deploy →` button on the right.

### 02 · Packages it

**Explanation**

> Point Stacktape at an entry file and it builds with zero configuration — built-in buildpacks cover
> TypeScript, Python, Java, Go, Ruby, PHP and .NET — or bring your own Dockerfile, another buildpack, or a
> prebuilt image. Builds run in parallel and are cached by content, so a change to one service rebuilds
> that service, not the stack. Remote builds run on a dedicated runner inside your AWS account, and
> artifacts land in your own registry.

**What you get**

- > Zero-config buildpacks for mainstream languages; your own Dockerfile or prebuilt image when you want the control.
- > Parallel, content-aware builds: change one service, rebuild one service.
- > No build scripts to write or maintain.

**Screen** — terminal window, `stacktape — deploy · zsh`

**Visual.** `$ stacktape deploy --stage production`, then `✓ Initialize`, `✓ Package` with three rows under
it: `web · Next.js · bundled · 41 s`, `apiService · container image · built · 58 s`, `worker · Lambda ·
skipped · unchanged` (the skipped row is the point). A summary line `3 workloads packaged in parallel · 58 s`,
then `● Deploy starting…` and a dimmed `Outputs`.

### 03 · Deploys it

**Explanation**

> A push to main deploys. Builds run on a warm, dedicated EC2 runner in your AWS account, starting from
> cache instead of from zero. Every pull request gets its own complete stack — separate resources, no
> production data copied in — cleaned up when the PR closes. Ship gradually: shift traffic to a new release
> step by step, watch it through a bake window, and roll back with one command if the conditions you set
> trip.

**What you get**

- > Push-to-deploy from GitHub, GitLab or Bitbucket; a full preview stack per pull request, deleted when it closes.
- > Canary or linear traffic shifting for Lambda and ALB-backed services, with a bake window and automatic rollback on the failures you configure.
- > Hooks for migrations and deploy-time work; one-command rollback to any retained version — a migration, once run, is never silently undone.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/deployments`

**Visual.** Heading `Deployments`, line `push to main → production · pull request → preview`. Three rows:
`v42 · main a1b2c3d · "orders: fulfillment status"` with a `Rolling out` badge, a thin traffic bar
`10 % → 100 %` labelled `canary · 4 min left`, and a secondary `Roll back to v41` button; `v41 · main 9f8e7d6`
with a `Live` badge; `pr-128 · "checkout: apple pay"` with a `Preview` badge and the link
`https://pr-128.preview.acme.com`.

### 04 · Monitors it

**Explanation**

> Logs and infrastructure metrics come with what you deploy; the rest you turn on per project: grouped
> production errors, traces, uptime probes from several AWS regions, synthetic Playwright and API checks.
> Each service gets an APM page — request rate, error rate, latency percentiles, top operations — and a
> slow trace pivots straight to its logs. Instrumentation is automatic for supported Lambda runtimes and
> takes a small SDK setup for containers; the docs list exactly what's covered.

**What you get**

- > Service pages with request rate, error rate, latency percentiles and top operations, plus raw logs and infrastructure metrics.
- > Error groups: production exceptions clustered and counted with their stack traces. Opt-in, per project.
- > Traces across services; uptime probes and synthetic checks from multiple regions, run inside your account.
- > Opt-in extras: anomaly alarms; browser errors and web vitals linked to the backend traces they called.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/monitoring/apiService`

**Visual.** Heading `apiService · last 24 h`. Three metric tiles with sparklines: `Requests 184 req/s`,
`p95 latency 212 ms`, `5xx 0.02 %`. One trace waterfall for `GET /orders · 212 ms` with five spans
(`GET /orders`, `handler`, `SELECT … FROM orders`, `redis GET`, `POST /events`), each a bar placed by start
and duration, with a small `Logs →` affordance on the `SELECT` span. At the bottom an uptime row:
`api.acme.com/health · 99.98 %` and three regions with latencies (`Ireland 212 ms · Virginia 318 ms ·
Singapore 402 ms`).

### 05 · Secures it

**Explanation**

> Set the rules once; they hold for every deploy. Guardrails keep databases private, data recoverable and
> regions approved, and a deploy that would break one stops before anything changes. Every deploy is
> scanned — dependencies, container images, git history for leaked keys. Findings arrive redacted, mapped
> to project, stage and resource, with a fix attached. New CVEs are re-checked against your saved
> inventory, no rebuild needed.

**What you get**

- > Connecting resources wires permissions, networking and connection variables automatically — no hand-written policies.
- > Dependency, image and secret scanning, a per-deployment SBOM, and a coverage view that says what wasn't scanned and why.
- > Validated fix pull requests; leaked keys get rotation guidance — moving a leaked secret isn't enough.
- > Deeper AWS checks — GuardDuty, account posture — are opt-in, with extra AWS costs shown before you switch them on.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/security`

**Visual.** Heading `Security`, line `scanned on every deploy · guardrails enforced org-wide`. Three
findings rows: `High · CVE-2026-1044 · prisma 5.22.0 → fixed in 5.22.1 · apiService · staging` with an
`Open fix PR` button; `High · live API key pattern in git history · web · production` with a
`Rotation guide` link; an amber coverage row `1 of 13 workloads not scanned · prebuilt image, no source`.
Under them a red-tinted notice: `Deploy to staging blocked · mainDatabase would get a public address` with
a secondary `Fix in config` button.

### 06 · Handles incidents

**Explanation**

> When something breaks, you get one incident, not five pings. Related signals — a failed probe, a spiking
> error group, an alarm, an unhealthy stack — are grouped by stack, time and release. One click assembles a
> redacted evidence bundle for your coding agent: errors with frames, the git SHA, the relevant config
> diff, infrastructure events. Ask for a fix and you get a labeled hypothesis and a pull request to review.
> Stateful changes always wait for you.

**What you get**

- > Alarms, failed checks and error groups roll up into one incident, with severity levels and notification suppression.
- > Agent evidence bundles: errors, frames, git SHA, config diff, infra events — redacted; credentials never leave your account.
- > Fixes arrive as pull requests you review. Destructive or stateful actions are never taken automatically.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/incidents/inc_8f2k`

**Visual.** Header `Uptime check failed · api.acme.com/health` with a green `Resolved` badge and `11 min`.
A timeline of five rows: `13:58 v42 deployed`; `14:02 incident opened · 3 of 3 regions failing` (red);
`14:03 error grouped · PrismaClientKnownRequestError: column "fulfillment_status" does not exist · 214
occurrences`; `14:06 diagnosis (hypothesis) · missing migration · fix PR #131 opened`; `14:13 resolved ·
checks passing` (green). Under the timeline one line: `Alerted #alerts on Slack · 14:02 · evidence bundle
copied for agent`.

### 07 · Tracks costs

**Explanation**

> Before a deploy, the wizard shows the estimated AWS list price of the stack. After it, Stacktape shows
> actual costs per project, stage and resource, straight from your AWS bill — AWS bills you directly, no
> markup. Set a budget and get an alert at your threshold, or when the forecast says you'll cross it. A
> budget is an alert, not a cap: AWS keeps running what you deployed, and the page says so plainly.

**What you get**

- > Estimated price before every deploy; actual AWS-derived costs after, per project, stage and resource.
- > Budget alerts on thresholds and forecasts, for the whole organization or a single stack.
- > Free plan: one member, up to $100/month in AWS costs. Paid plans are a percentage of what you run.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/costs`

**Visual.** Heading `Costs · September`, the total `$112.90` large with `from your AWS bill · no markup` under
it. Six horizontal bars, longest first, name on the left and amount on the right (see the example app).
A budget row: `Budget $150 · alert at 80 %` with a thin bar filled to 75 % and a marker at 80 %.

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
| Status           | Security         |          |                |
|                  | Guardrails       |          |                |
|                  | Costs            |          |                |
|                  | Using with AI    |          |                |

Link targets:

- Product: How it works `#designs` · Pricing `/pricing` · Starter projects
  https://docs.stacktape.com/getting-started/starter-projects · Changelog
  https://github.com/stacktape/stacktape/releases · Console https://console.stacktape.com · Status
  https://status.stacktape.com
- Docs: https://docs.stacktape.com/getting-started/configure-your-stack · /resources · /packaging/overview ·
  /ci-cd-and-gitops/overview · /observability/overview · /security/overview · /guardrails/overview ·
  /managing-costs/overview · /using-with-ai/overview
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
(current). **Everything below is illustrative example-app data — no real deployment, customer, CVE or
measurement.**

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

Security-screen facts (illustrative): `CVE-2026-1044`, package `prisma 5.22.0`, fixed in `5.22.1`, workload
`apiService`, stage `staging`; a leaked-key finding on `web` in `production`; coverage `1 of 13 workloads not
scanned (prebuilt image, no source)`. Incident-screen facts: `PrismaClientKnownRequestError` about column
`"fulfillment_status"`, `214` occurrences, fix `PR #131`.

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
