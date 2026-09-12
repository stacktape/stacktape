# Stacktape homepage — content

This file is the homepage as text. Every word the page shows is here, verbatim, and every visual is
described in a **Visual** block. The three layouts (`/stack`, `/sheet`, `/lens`) share all of it; only the
arrangement differs (see the last section).

How to edit:

- Text inside a blockquote (`>`) is shown on the page exactly as written.
- A **Visual** block describes a picture or a product window. Change the description and the picture changes.
- Every "thing Stacktape does" has the same four fields: name, explanation, what you get, screen. Keep the
  fields; change the content.
- Facts about the example app (names, prices, URLs) live in one place at the end and are reused by every
  screen.
- All product windows use that example app. Status, timestamps, error text, finding rows, metric values,
  and git SHAs in those windows are illustrative — not measured customer results.

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

> Stacktape reads your repository on your machine, writes the AWS setup into one file you can review,
> and deploys it to your own account. After that it monitors production, flags security findings, and
> tracks the AWS bill — and it stops for you whenever a decision needs a human.

**Command box** (the only call to action; the same box appears again in the closing)

| Tab     | Command                                                   |
| ------- | --------------------------------------------------------- |
| npx     | `npx stacktape init`                                      |
| macOS   | `curl -L https://installs.stacktape.com/macos.sh \| sh`   |
| Linux   | `curl -L https://installs.stacktape.com/linux.sh \| sh`   |
| Windows | `iwr https://installs.stacktape.com/windows.ps1 -useb \| iex` |

Button: `Copy` (becomes `Copied` for a moment). Hint next to the tabs: `opens the wizard in your browser`.

**Trust line**

> Open-source CLI (MIT) · Your AWS account · CloudFormation, overrides and CDK when you need them

**Visual: the cover composite.** A Stacktape Console window tilted slightly in 3D, with a terminal window
lying flat in front of its bottom-right corner, both on soft shadows with a faint teal glow behind them.

- The Console window: browser chrome with a URL pill reading
  `console.stacktape.com/projects/acme-project/production`; a top bar with the wordmark and
  `acme-project / production`; a left nav with five items (Overview, Deployments, Monitoring, Security,
  Costs; Overview selected). The main area shows three things: a status row (`Live` badge · `v42` ·
  `eu-west-1` · `deployed 12 min ago`), six resource tiles in a 3×2 grid (name, type, `healthy`), and three
  KPIs (`AWS cost MTD $112.90` · `Budget 75% of $150` · `Incidents 0 open`).
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

> Run one command. A local wizard reads the project on your machine — with the coding agent you already
> use, or a files-only scan that never calls an AI. It proposes the stack from evidence in your repo,
> fills gaps with defaults, and shows every resource, why it exists, and the AWS list price. Deploying
> is a separate step you confirm.

**What you get**

- > One typed file for the whole stack: frontend, containers, functions, database, cache, and firewall. YAML or TypeScript.
- > Every proposal is explained and changeable. The estimate updates with it. Existing provider-managed resources are not taken over.
- > No Stacktape or AWS account is required to analyze. Source is not sent to Stacktape.

**Screen** — browser window, `127.0.0.1:4242/review` (the init wizard, Review step)

**Visual.** Heading `Here's your app on AWS`, line `Read on this machine · nothing created on AWS yet`.
Left: the six resources as rows, each with a coloured dot for its category, the name in mono, the type,
one line saying why it exists, and its monthly price (see the example app below). Right: the interactive
isometric architecture diagram of the same app (public web and API behind the firewall; worker, cache and
database inside the private network). Bottom row: `14 AWS resources · ~$112 / month` on the left, a
primary `Write stacktape.yml` button on the right.

### 02 · Packages it

**Explanation**

> Stacktape turns your code into Lambda packages and container images. Point a function at an entry file
> and the buildpack bundles JavaScript, TypeScript, Python, Java, Go, Ruby, PHP, or .NET. Containers can
> use a Stacktape buildpack, your Dockerfile, Nixpacks, another buildpack, or a prebuilt image. Work runs
> in parallel and reuses content-aware caches when the artifact is still available.

**What you get**

- > Functions and containers in the same stack, without a separate build pipeline to maintain.
- > Unchanged work is skipped when a reusable artifact is still there.
- > GitOps builds run on a dedicated EC2 runner in your AWS account.

**Screen** — terminal window, `stacktape — deploy · zsh`

**Visual.** `$ stacktape deploy --stage production`, then `✓ Initialize`, `✓ Package` with three rows under
it: `web · Next.js · bundled`, `apiService · container image · built`, `worker · Lambda · skipped ·
unchanged` (the skipped row is the point). A summary line `3 workloads packaged in parallel`, then
`● Deploy starting…` and a dimmed `Outputs`.

### 03 · Deploys it

**Explanation**

> A push can update production. A pull request can get a complete independent stack, deleted when the PR
> closes. Previews do not copy live production data. You can preview configuration changes and replacements
> before they apply. Rollback restores retained artifacts; it does not undo database migrations or other
> external side effects.

**What you get**

- > Push and pull-request deploys for GitHub, GitLab, and Bitbucket. Existing CI can call the CLI.
- > Gradual traffic shifting for Lambda and eligible load-balanced containers — not every resource.
- > One-command rollback to a retained version. You confirm the target before anything changes.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/deployments`

**Visual.** Heading `Deployments`, line `push to main → production · pull request → preview`. Three rows:
`v42 · main a1b2c3d · "orders: fulfillment status"` with a `Rolling out` badge, a thin traffic bar
`10 % → 100 %` labelled `canary`, and a secondary `Roll back to v41` button; `v41 · main 9f8e7d6`
with a `Live` badge; `pr-128 · "checkout: apple pay"` with a `Preview` badge and the link
`https://pr-128.preview.acme.com`.

### 04 · Monitors it

**Explanation**

> Logs and infrastructure metrics come from your AWS account. You can opt into error grouping, add uptime
> probes from multiple regions, and run Playwright or API checks. Tracing is configurable: supported Lambda
> runtimes can be auto-instrumented; containers need SDK setup. These do not all appear automatically with
> every deploy.

**What you get**

- > An error inbox you enable — grouped exceptions with stack traces, after a redeploy.
- > Tracing you enable, stored in your account.
- > Uptime probes and synthetics in your account, on URLs you configure.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/monitoring`

**Visual.** Three metric tiles with sparklines: `Requests`, `p95 latency`, `5xx` (illustrative values).
Below them one trace waterfall for `GET /orders` with five spans (`GET /orders`, `handler`,
`SELECT … FROM orders`, `redis GET`, `POST /events`), each a bar placed by its start and duration. At the
bottom an uptime row: `api.acme.com/health · passing` and three regions (`Ireland · Virginia · Singapore`).

### 05 · Secures it

**Explanation**

> Organization guardrails can require private databases, backups, allowed regions, and supported firewalls,
> and they block a non-compliant deploy before AWS changes. A resource connection grants access and injects
> connection variables — some of those policies are broad. Secrets are referenced from AWS Secrets Manager,
> so values stay out of committed config. Stacktape also scans dependencies, container images, secret
> patterns, and config posture, and maps findings to the resource and stage.

**What you get**

- > Eighteen guardrail types you set once, enforced on every deploy in the organization.
- > Findings include the deployed version, exposure, and a fixed version when one exists — not a proof of exploitability.
- > A leaked key must be rotated and revoked, not only referenced as a secret.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/security`

**Visual.** Heading `Security`, line `Guardrails plus scans · mapped to this stage` (illustrative). Two
finding rows: `apiService · lodash 4.17.20 · fix 4.17.21 · public service`; `Secret pattern in git
history · rotate, then use $Secret()`. Under them, one red-tinted notice: `Deploy to staging blocked ·
mainDatabase would get a public address` with a secondary `Fix in config` button. No secret values shown.

### 06 · Handles incidents

**Explanation**

> When an uptime check fails, a synthetic fails, an alarm fires, production errors spike, a stack is
> unhealthy, or a certificate is expiring, Stacktape opens one incident and groups related signals by
> stack, time, and release. Alerts go to Slack, Microsoft Teams, email, or a webhook. Production error
> groups page only when they cross the thresholds you set.

**What you get**

- > One incident with the evidence: probes, alarms, grouped errors, and the release it started after.
- > Copy an evidence bundle for your coding agent, or the CLI. Credentials stay where the bundle is composed.
- > A job in your AWS account can open a fix PR for you to review. CLI-only projects get a local handoff. No migrations, and no deploy unless you opt a stage in.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/incidents/inc_8f2k`

**Visual.** Header `Uptime check failed · api.acme.com/health` with a green `Resolved` badge. A timeline
of five rows: `13:58 v42 deployed`; `14:02 incident opened · 3 of 3 regions failing` (red); `14:03 error
grouped · TypeError: Cannot read properties of undefined (reading 'id') · GET /orders`; `14:08 fix PR
#131 opened — you reviewed and merged`; `14:13 resolved · checks passing` (green). Under the timeline:
`Copy for agent` and `Alerted #alerts on Slack · 14:02`.

### 07 · Tracks costs

**Explanation**

> See an AWS list-price estimate before you deploy, then actual costs from AWS reports, by stack, project,
> stage, and resource where they are attributed. Set a budget and get an alert when actual or forecasted
> spend crosses it. A budget does not cap spend. Reports lag, and some costs stay shared or unattributed.

**What you get**

- > Costs from your AWS bill, with no markup on infrastructure.
- > Budget alerts for the organization or one stack — an alert, not a hard cap.
- > Free for one member up to $100/month of managed AWS spend, then percentage tiers. [See pricing](/pricing).

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/costs`

**Visual.** Heading `Costs · September`, the total `$112.90` large with `from your AWS bill · no markup` under
it. Six horizontal bars, longest first, name on the left and amount on the right (see the example app).
A budget row: `Budget $150 · alert at 80 %` with a thin bar filled to 75 % and a marker at 80 %.

---

## 4. Closing

> That's design through the bill, in your AWS account. Start with one command.

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
