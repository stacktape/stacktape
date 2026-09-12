# Stacktape homepage: content (launch draft)

This file is the homepage as text. Every word the page shows is here, verbatim, and every visual is described in a **Visual** block. The three layouts (`/stack`, `/sheet`, `/lens`) share all of it; only the arrangement differs (see the last section).

How to edit:

- Text inside a blockquote (`>`) is shown on the page exactly as written.
- A **Visual** block describes a picture or a product window. Change the description and the picture changes.
- Every "thing Stacktape does" has the same four fields: name, explanation, what you get, screen. Keep the fields; change the content.
- Facts about the example app (names, prices, URLs, releases) live in one place at the end and are reused by every screen. All of them are illustrative sample data, not measurements.

---

## 1. Navigation

Sticky bar, 64px tall.

| Position | Item               | Goes to                                                     |
| -------- | ------------------ | ----------------------------------------------------------- |
| left     | Stacktape wordmark | `/`                                                         |
| left     | How it works       | `#designs` (the first section)                              |
| left     | Docs               | https://docs.stacktape.com                                  |
| left     | Pricing            | `/pricing`                                                  |
| left     | Blog               | `/blog`                                                     |
| left     | GitHub             | https://github.com/stacktape/stacktape                      |
| right    | Sign in            | https://console.stacktape.com (text link)                   |
| right    | Book a demo        | https://cal.com/stacktape/30min (secondary button)          |
| right    | Get started        | `#get-started` (primary button, scrolls to the command box) |

On phones: the wordmark, the Get started button and a menu button that opens a panel with the same links.

---

## 2. Hero

**Announcement pill** (links to `/blog/stacktape-v4`)

> Stacktape **v4** is out · Read what changed →

**Headline** (two lines)

> AWS DevOps,
> fully automated.

**Subheadline**

> Run one command. Stacktape reads your project on your machine, designs the infrastructure like a senior
> DevOps team would and deploys it to your own AWS account. Then it keeps doing the job: builds, releases,
> monitoring, security and costs, with you in the loop for every decision that needs a human.

**Command box** (the only call to action; the same box appears again in the closing)

| Tab     | Command                                                       |
| ------- | ------------------------------------------------------------- |
| npx     | `npx stacktape init`                                          |
| macOS   | `curl -L https://installs.stacktape.com/macos.sh \| sh`       |
| Linux   | `curl -L https://installs.stacktape.com/linux.sh \| sh`       |
| Windows | `iwr https://installs.stacktape.com/windows.ps1 -useb \| iex` |

Button: `Copy` (becomes `Copied` for a moment). Hint next to the tabs: `opens the wizard in your browser`.

**Trust line**

> Open-source CLI (MIT) · Standard AWS resources you own · Override or extend with CloudFormation or CDK

**Visual: the cover composite.** A Stacktape Console window tilted slightly in 3D, with a terminal window
lying flat in front of its bottom-right corner, both on soft shadows with a faint teal glow behind them.
The terminal shows the project's very first production deploy; the Console shows the same project weeks
later.

- The Console window: browser chrome with a URL pill reading
  `console.stacktape.com/projects/acme-project/production`; a top bar with the wordmark and
  `acme-project / production`; a left nav with seven items (Overview, Deployments, Monitoring, Incidents,
  Security, Guardrails, Costs; Overview selected). The main area shows three things: a status row (`Live`
  badge · `v43` · `eu-west-1` · `deployed 12 min ago`), six resource tiles in a 3×2 grid (name, type,
  `healthy`), and three KPIs (`Deployments 30 d · 48` · `Open incidents · 0` · `AWS cost 30 d · $112.90`).
- The terminal window: title `stacktape · deploy · zsh`; the command `$ stacktape deploy --stage production`;
  four phases (`Initialize ✓`, `Package ✓`, `Deploy ● 91 %`, `Outputs`); a green progress bar at 91 %; six
  resource rows (`web`, `apiService`, `worker`, `cache` marked `created`; `mainDatabase`, `firewall` marked
  `creating…`).

---

## 3. What Stacktape does (seven sections, in this order)

Every product window is dark (the Console's own material) and shows a real address in its chrome: a URL
pill with a lock for Console pages, `127.0.0.1:4242/review` without a lock for the local wizard, and a
title such as `stacktape · deploy · zsh` for a terminal. Windows contain at most five elements and no
annotations. Under every window sits a small grey caption: `Sample project · illustrative data`.

### 01 · Designs your infrastructure

**Explanation**

> One command opens a wizard in your browser. Click Start and it reads your project on your machine,
> through Claude Code or Codex on your own AI account, or with a plain file scan and no AI. It proposes
> each resource with the file that justifies it, fills the rest with sensible defaults and shows an
> estimated AWS price before anything exists.

**What you get**

- > One file for the whole stack, YAML or TypeScript: app, API, workers, database, cache, firewall.
- > Every proposal shows its evidence and its reason. Change one, and the config and the estimate follow.
- > Source goes only to the AI provider you already use, never to Stacktape. No account needed until you deploy.

**Screen** — browser window, `127.0.0.1:4242/review` (the init wizard, Review step)

**Visual.** Heading `Here's your app on AWS`, line `Read 41 files on this machine · nothing created on AWS yet`.
Left: the six resources as rows, each with a coloured dot for its category, the name in mono, the type,
one line naming the file that justifies it, and its estimated monthly price (see the example app). Right:
the interactive isometric architecture diagram of the same app (public web and API behind the firewall;
worker, cache and database inside the private network); a small `Click to zoom and pan` label. Bottom row:
`14 AWS resources · ~$112 / month at AWS list prices` on the left, a primary `Continue to deploy →` button
on the right.

### 02 · Packages it

**Explanation**

> Stacktape builds your code itself. A built-in buildpack turns an entry file into a Lambda package or a
> container image, or you bring your own Dockerfile, another buildpack or a prebuilt image. Builds run in
> parallel and are content-aware, so an unchanged service is reused rather than rebuilt while its last
> artifact is still around.

**What you get**

- > Built-in buildpacks for the common languages, or your own Dockerfile, another buildpack or any prebuilt image.
- > Parallel, content-aware builds with caches: a change to one service does not rebuild the others.
- > Remote builds run on a build runner inside your AWS account; images land in a registry there.

**Screen** — terminal window, `stacktape · deploy · zsh`

**Visual.** `$ stacktape deploy --stage production`, then `✓ Initialize`, `✓ Package` with three rows under
it: `web · Next.js · bundled`, `apiService · container image · built · pushed to registry`, `worker · Lambda ·
reused · unchanged` (the reused row is the point). A summary line `3 workloads packaged in parallel · 1 reused
from cache`, then `● Deploy starting…` and a dimmed `Outputs`.

### 03 · Deploys it

**Explanation**

> Connect GitHub, GitLab or Bitbucket and a push to main deploys. Every pull request gets a complete stack
> of its own, deleted when the PR closes. Before production changes, you see what will change and what
> will be replaced. A release can shift traffic gradually, run your checks through a bake window and roll
> back on its own if they fail.

**What you get**

- > Push to deploy, a preview stack per pull request that cleans itself up, or the CLI from the CI you already have.
- > Gradual rollouts for Lambda and eligible load-balanced container services; migrations and other hooks run at the right step.
- > Release gates that verify, wait and roll back, and one-command rollback to any retained release.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/deployments`

**Visual.** Heading `Deployments`, line `push to main → production · pull request → preview`. Four rows:
`v43 · main c3d4e5f · "orders: run fulfillment migration before traffic"` with a `Rolling out` badge, a thin
traffic bar `10 % → 100 %` labelled `canary · verifying · 2 of 2 checks passed · bake 6 min left`, and a
secondary `Roll back to v41` button; `v42 · main a1b2c3d · "orders: fulfillment status"` with a `Rolled back`
badge and the note `release gate · 5xx above threshold`; `v41 · main 9f8e7d6` with a `Live` badge;
`pr-128 · "checkout: apple pay"` with a `Preview` badge and the link `https://pr-128.preview.acme.com`.

### 04 · Monitors it

**Explanation**

> Logs and infrastructure metrics arrive with the deploy. Switch on the rest per stack: an issue inbox that
> groups exceptions, tracing that instruments supported Lambda runtimes automatically and containers
> through the SDK, uptime probes from several regions, and synthetic checks that run a Playwright script
> or an API call. A trace opens its logs, and a chart shows the deploy that moved it.

**What you get**

- > Issues: exceptions grouped and counted with their stack traces, paging you only on severity, spike or regression thresholds.
- > A page per service: request rate, error rate, latency percentiles and the operations behind them.
- > Uptime probes from several regions and Playwright or API synthetic checks, with no separate monitoring vendor.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/monitoring/apiService`

**Visual.** Heading `apiService · web service · GET /orders and 11 other operations`. Three metric tiles with
sparklines: `Requests 184 req/s`, `p95 latency 212 ms`, `5xx 0.02 %`; each sparkline carries one thin
vertical marker labelled `v43`. Below them one trace waterfall for `GET /orders · 212 ms` with five spans
(`GET /orders`, `handler`, `SELECT … FROM orders`, `redis GET`, `POST /events`), each a bar placed by its
start and duration, and a `Logs for this trace` link at the end of the row. At the bottom an uptime row:
`api.acme.com/health · 99.98 % · 30 d` and three regions with latencies (`Ireland 212 ms · Virginia 318 ms ·
Singapore 402 ms`).

### 05 · Secures it

**Explanation**

> Secret values stay in AWS Secrets Manager, referenced from config and never copied into it. Guardrails
> your organization sets once, like private databases, backups or approved regions, stop a deploy before
> it changes anything. And every deploy is scanned: dependencies, container images, secrets in code and
> history, and the deployed configuration, with each finding tied to a resource and stage where the
> evidence allows.

**What you get**

- > Service permissions, network access and connection variables from one line of config, private networking included.
- > Guardrails enforced before a deploy runs, and scan results that can stop one after the build, across the whole organization.
- > Exposure and, where one exists, the fixed version on every finding; rotation-first steps for a leaked key; a fix PR to review; rechecks against new CVEs without a rebuild.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/security`

**Visual.** Heading `Security`, line `scanned with v43 · 12 min ago`. A coverage row of five chips:
`Dependencies · 3 workloads`, `Images · 1 image`, `Secrets · code and history`, `Config posture · 14 AWS
resources`, each with a green check, and a greyed `Account-wide · 2 findings to review`. Three findings,
each with a severity dot, the resource and stage, the exposure and the next step: `High · apiService image ·
libssl · fixed version available · public web service` with a `Fix PR` button; `High · repository · AWS access
key in commit 4e5f… · value redacted · Rotate first →`; `Medium · mainDatabase · deletion protection off ·
production`. Under them one red-tinted notice from Guardrails: `Deploy to staging blocked · mainDatabase
would get a public address` with a secondary `Fix in config` button.

### 06 · Handles incidents

**Explanation**

> When a probe fails, an alarm fires, an error group spikes or a certificate nears expiry, Stacktape opens
> one incident with every related signal grouped by stack, time and release. See the release it started
> after and jump to the logs and traces that matter. Then press one button: an isolated job in your own
> AWS account, with no AWS or git credentials in the model's hands, returns a proposed diagnosis and a
> fix pull request for you to review.

**What you get**

- > One incident, all the evidence: alarms, probe results, grouped errors, infrastructure events and the release timeline.
- > Hand it to an agent: a redacted evidence bundle or read-only MCP tools for your own coding agent, or the hosted job, which opens the PR when your repo is connected with write access. A person merges.
- > Alerts to your team's channels, with severity, acknowledgement and suppression, and a public status page for the updates you choose to publish.

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/incidents/inc_8f2k`

**Visual.** Header `5xx alarm and error spike · apiService` with a green `Resolved` badge and `29 min`. A
timeline of six rows: `14:02 v42 rolling out · canary 10 %`; `14:04 incident opened · 5xx alarm · error group
PrismaClientKnownRequestError: column "fulfillment_status" does not exist · 214 occurrences` (red);
`14:05 rolled back to v41 by the release gate · checks passing`; `14:06 investigation started · isolated job in
eu-west-1 · scoped to acme-project/production · no credentials`; `14:15 proposed diagnosis: the
fulfillment_status migration never ran in production · fix PR #131 opened for review`; `14:31 resolved ·
PR #131 merged · v43 verified` (green). Under the timeline one line: `Acknowledged by on-call · 14:05 · alerted
#alerts`. Top right, two buttons: `Copy for agent` and a greyed `Investigate`.

### 07 · Tracks costs

**Explanation**

> See an estimated price before you deploy and the real cost afterwards, derived from your AWS bill and
> broken down by project, stage and resource wherever AWS attributes it. Set a budget for one stack or the
> whole organization and get an alert when spend crosses a threshold, or as soon as the forecast says it
> will. AWS bills you directly; Stacktape's fee is separate.

**What you get**

- > Costs per project, stage and resource from your AWS billing data, with shared costs shown as shared.
- > Budgets with actual and forecast alerts. A budget warns you early; it is not a cap on AWS.
- > Free for one member up to $100 of AWS spend a month, then a percentage of what you run. [See pricing](/pricing).

**Screen** — browser window, `console.stacktape.com/projects/acme-project/production/costs`

**Visual.** Heading `Costs · last 30 days`, the total `$112.90` large with `from your AWS bill · data through
8 Sept` under it. Seven horizontal bars, longest first, name on the left and amount on the right: the six
resources and `shared · $0.90` (see the example app). A budget row: `Budget $150 / month · alert at 80 % ·
September forecast $131` with a thin bar filled to 75 % and a marker at 80 %.

---

## 4. Closing

> That is the whole DevOps job, in your own AWS account. Start with one command.

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

| Product          | Docs            | Company  | Legal          |
| ---------------- | --------------- | -------- | -------------- |
| How it works     | Getting started | Blog     | Privacy policy |
| Pricing          | Resources       | Contact  | Terms of use   |
| Starter projects | Packaging       | GitHub   |                |
| Changelog        | CI/CD & GitOps  | LinkedIn |                |
| Console          | Observability   | X        |                |
| Status           | Guardrails      |          |                |
|                  | Costs           |          |                |
|                  | Using with AI   |          |                |

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

## 7. The example app (facts every screen reuses; all illustrative)

Project `acme-project`, stage `production`, region `eu-west-1`. Public URLs `https://acme.com` and
`https://api.acme.com`; preview URL `https://pr-128.preview.acme.com`. Releases `v41` (previous, stable),
`v42` (rolled back by the release gate), `v43` (current). Incident `inc_8f2k`, fixed by PR `#131`.

| Resource       | Type                     | Why it exists (wizard)            | Monthly |
| -------------- | ------------------------ | --------------------------------- | ------- |
| `web`          | Next.js                  | next.config.js in ./web           | $3.80   |
| `apiService`   | Web service (Fargate)    | Dockerfile in ./api               | $34.20  |
| `worker`       | Lambda function          | worker.ts subscribes to the queue | $0.70   |
| `mainDatabase` | Aurora PostgreSQL 16     | Prisma schema targets PostgreSQL  | $61.40  |
| `cache`        | Redis (ElastiCache)      | ioredis in package.json           | $11.90  |
| `firewall`     | Web application firewall | public web app                    | $0.90   |

Shared: `$0.90` (costs screen only). Total `$112.90`; the wizard rounds it to `~$112 / month` and counts
`14 AWS resources`. Budget `$150` a month, alert at 80 %, September forecast `$131`.

Every name, price, latency, percentage, count, commit and timestamp above and in the screens is sample data
chosen to look plausible. None is a measurement, a benchmark or a real bill. The screens are snapshots of
one afternoon at different moments: the deployments screen during the v43 rollout, the incident screen
after it resolved, the hero after v43 finished.

---

## 8. How the three layouts arrange this content

- **`/stack`**: dark, warm ground with copper section numbers. A normal hero (copy left, cover composite
  right). The seven sections are full-viewport cards that pile up as you scroll: each slides over the last,
  and the cards already passed stay as thin numbered edges at the top. Text on the left of each card, the
  screen on the right. Closing card, testimonials, footer.
- **`/sheet`**: light. Warm paper with a faint isometric grid as texture; the product windows stay dark and
  sit on the paper on real shadows. Hero (copy left, composite right). A sticky index `01 … 07` on the left
  ticks as you read; each section is a paper card with the text above its window. Closing on a dark band,
  testimonials, footer.
- **`/lens`**: deep green-black. Centred hero with the cover composite below it, full width. Then one product
  window stays pinned on the right while the seven sections scroll past on the left; the window crossfades
  to each section's screen and resizes to it (the security page and the incident page are the two tallest).
  A rail of seven dots between the columns shows progress. On phones each section shows its own screen
  inline. Closing, testimonials, footer.
