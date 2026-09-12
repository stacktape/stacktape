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

> Stacktape reads your repository, designs the infrastructure like a senior DevOps team would, deploys it
> to your own AWS account and makes sure your app runs flawlessly forever after. It keeps you in the loop
> for any decision that requires human attention.

**Command box** (the only call to action; the same box appears again in the closing)

| Tab     | Command                                                   |
| ------- | --------------------------------------------------------- |
| npx     | `npx stacktape init`                                      |
| macOS   | `curl -L https://installs.stacktape.com/macos.sh \| sh`   |
| Linux   | `curl -L https://installs.stacktape.com/linux.sh \| sh`   |
| Windows | `iwr https://installs.stacktape.com/windows.ps1 -useb \| iex` |

Button: `Copy` (becomes `Copied` for a moment). Hint next to the tabs: `opens the wizard in your browser`.

**Trust line**

> Open-source CLI (MIT) · Extend or override anything · Eject anytime

**Visual: the cover composite.** A Stacktape Console window tilted slightly in 3D, with a terminal window
lying flat in front of its bottom-right corner, both on soft shadows with a faint teal glow behind them.

- The Console window: browser chrome with a URL pill reading
  `console.stacktape.com/projects/acme-project/production`; a top bar with the wordmark and
  `acme-project / production`; a left nav with five items (Overview, Deployments, Monitoring, Guardrails,
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

> Run one command and Stacktape reads your project on your machine, with the coding agent you already use.
> It writes the whole AWS setup into one typed file, with production defaults already applied, and shows
> you every resource, the line of code behind it and what it will cost per month, before anything exists.

**What you get**

- > One file for the whole stack: app, API, workers, database, cache, firewall, with autocompletion in your editor.
- > Every decision explained and changeable with one click. The price updates with it.
- > Your code never leaves your machine. Nothing is sent to Stacktape.

**Screen** — browser window, `127.0.0.1:4242/review` (the init wizard, Review step)

**Visual.** Heading `Here's your app on AWS`, line `Read 41 files on this machine · nothing created on AWS yet`.
Left: the six resources as rows, each with a coloured dot for its category, the name in mono, the type,
one line saying why it exists, and its monthly price (see the example app below). Right: the interactive
isometric architecture diagram of the same app (public web and API behind the firewall; worker, cache and
database inside the private network); a small `Click to zoom and pan` label. Bottom row: `14 AWS resources
· ~$112 / month` on the left, a primary `Deploy →` button on the right.

### 02 · Packages it

**Explanation**

> Stacktape builds your code into Lambda packages and container images itself. Point it at an entry file
> and it bundles TypeScript, Python, Java, Go, Ruby, PHP or .NET with zero configuration, or bring your
> own Dockerfile. Builds run in parallel and are cached by content, so unchanged code is never built twice.

**What you get**

- > Zero-config builds for eight languages, or your own Dockerfile, Nixpacks or any prebuilt image.
- > Parallel, content-cached builds: a change to one service rebuilds one service.
- > Images land in a managed registry in your account. No build scripts to maintain.

**Screen** — terminal window, `stacktape — deploy · zsh`

**Visual.** `$ stacktape deploy --stage production`, then `✓ Initialize`, `✓ Package` with three rows under
it: `web · Next.js · bundled · 41 s`, `apiService · container image · built · 58 s`, `worker · Lambda ·
skipped · unchanged` (the skipped row is the point). A summary line `3 workloads packaged in parallel · 58 s`,
then `● Deploy starting…` and a dimmed `Outputs`.

### 03 · Deploys it

**Explanation**

> A push to main deploys. Stacktape's build runner is a dedicated EC2 machine in your AWS account that keeps
> its caches warm between runs and resumes in about fifteen seconds, so a build starts working immediately
> instead of waiting on a cold CodeBuild container. Every pull request gets its own environment, every
> release can be rolled out gradually and any release can be rolled back with one command.

**What you get**

- > Push to deploy, with a preview environment per pull request that deletes itself when the PR closes.
- > Gradual rollouts: canary or linear traffic shifting with automatic rollback if errors rise.
- > Zero-downtime deploys, hot-swap in seconds for dev stages, one-command rollback to any version.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/deployments`

**Visual.** Heading `Deployments`, line `push to main → production · pull request → preview`. Three rows:
`v42 · main a1b2c3d · "orders: fulfillment status"` with a `Rolling out` badge, a thin traffic bar
`10 % → 100 %` labelled `canary · 4 min left`, and a secondary `Roll back to v41` button; `v41 · main 9f8e7d6`
with a `Live` badge; `pr-128 · "checkout: apple pay"` with a `Preview` badge and the link
`https://pr-128.preview.acme.com`.

### 04 · Monitors it

**Explanation**

> Logs, metrics, traces, uptime checks and an error inbox are set up by the deploy itself, with nothing to
> install and no monitoring vendor. Errors from every service are grouped and counted, one request can be
> followed across your services, and your public URLs are checked from several AWS regions.

**What you get**

- > An error inbox: exceptions grouped, counted and kept with their stack trace.
- > Traces with one switch: OpenTelemetry auto-instrumentation, stored in your own account.
- > Uptime checks from multiple AWS regions, run inside your account, with no per-check fee.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/monitoring`

**Visual.** Three metric tiles with sparklines: `Requests 184 req/s`, `p95 latency 212 ms`, `5xx 0.02 %`.
Below them one trace waterfall for `GET /orders · 212 ms` with five spans (`GET /orders`, `handler`,
`SELECT … FROM orders`, `redis GET`, `POST /events`), each a bar placed by its start and duration. At the
bottom an uptime row: `api.acme.com/health · 99.98 %` and three regions with latencies (`Ireland 212 ms ·
Virginia 318 ms · Singapore 402 ms`).

### 05 · Secures it

**Explanation**

> The setup is safe by default: databases in a private network with no public address, each service
> allowed to reach only the resources it is connected to, secrets kept in AWS Secrets Manager and never in
> your config. Guardrails your team sets once, such as keeping SQL private or requiring backups, block a
> deploy that would break them before anything changes.

**What you get**

- > Private networking and scoped permissions wired automatically from one line of config.
- > Eighteen guardrail types, enforced before a deploy runs, across the whole organization.
- > Everything runs in your AWS account. Stacktape's access is one role you can revoke any time.

**Screen** — browser window, `console.stacktape.com/organizations/acme/guardrails`

**Visual.** Heading `Guardrails`, line `18 rule types · applied to every deploy in the organization`. Four
rules, each with an on-switch: `Keep SQL databases private`, `Require recoverable data stores`, `Require
WAF on load balancers`, `Allowed regions: eu-west-1, us-east-1`. Under them, one red-tinted notice:
`Deploy to staging blocked · mainDatabase would get a public address` with a secondary `Fix in config` button.

### 06 · Handles incidents

**Explanation**

> When an uptime check fails or errors spike, Stacktape opens an incident with the evidence in one place:
> what fired, the grouped error with its stack trace and the release the trouble started after. Your coding
> agent can read the same logs and issues through Stacktape's MCP server and propose the fix; you review
> the pull request and merge.

**What you get**

- > One incident, all the evidence: alarms, uptime results, grouped errors and the release timeline.
- > Alerts where your team already is: Slack, Microsoft Teams, email or a webhook.
- > An MCP server for your coding agent: logs, issues and status, with destructive actions always confirmed by you.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/incidents/inc_8f2k`

**Visual.** Header `Uptime check failed · api.acme.com/health` with a green `Resolved` badge and `11 min`.
A timeline of five rows: `13:58 v41 deployed`; `14:02 incident opened · 3 of 3 regions failing` (red);
`14:03 error grouped · PrismaClientKnownRequestError: column "fulfillment_status" does not exist · 214
occurrences`; `14:08 fix PR #131 opened by your agent, reviewed and merged`; `14:13 resolved · checks
passing` (green). Under the timeline one line: `Alerted #alerts on Slack · 14:02`.

### 07 · Tracks costs

**Explanation**

> See what each environment and each resource costs this month, straight from your AWS bill, with no
> markup. Set a budget once and get an alert before you reach it, or as soon as the forecast says you will.
> AWS bills you directly; Stacktape's own fee is a separate line and starts at zero.

**What you get**

- > Costs per project, stage and resource, from AWS Cost and Usage Reports.
- > Budgets with threshold and forecast alerts, for the organization or for one stack.
- > Free up to $100 of managed AWS spend a month, then a percentage of what you run. Never per seat.

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
