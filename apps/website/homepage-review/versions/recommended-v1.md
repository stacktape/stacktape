# Stacktape homepage — recommended launch copy

Future-launch editorial draft. Visitor-facing text is in blockquotes and the marked navigation, command, and footer
fields. Visuals remain descriptions. Unshipped claims and release prerequisites are recorded in
`homepage-review/research.md`; they are not badges to put inside the eventual product page.

The existing eight-part structure and seven product sections are preserved. The three layouts share this content. All
product-window data is illustrative, not a captured customer environment or benchmark.

---

## 1. Navigation

| Position | Item               | Goes to                                |
| -------- | ------------------ | -------------------------------------- |
| left     | Stacktape wordmark | `/`                                    |
| left     | How it works       | `#designs`                             |
| left     | Docs               | https://docs.stacktape.com             |
| left     | Pricing            | `/pricing`                             |
| left     | Blog               | `/blog`                                |
| left     | GitHub             | https://github.com/stacktape/stacktape |
| right    | Sign in            | https://console.stacktape.com          |
| right    | Book a demo        | https://cal.com/stacktape/30min        |
| right    | Get started        | `#get-started`                         |

On phones: wordmark, Get started, and a menu containing the same links.

---

## 2. Hero

**Announcement pill** — `/blog/stacktape-v4`, shown when the release and article are available.

> Meet Stacktape v4 · See what's new →

**Headline**

> AWS DevOps, fully automated.

**Subheadline**

> Stacktape reads your repository, designs the infrastructure like a senior DevOps team would, and deploys it to your
> own AWS account. It keeps watching your app, catches problems, and brings you the evidence and a proposed fix when you
> need to step in.

**Command box** — primary CTA; repeat in the closing.

| Tab     | Command                                                       |
| ------- | ------------------------------------------------------------- |
| npx     | `npx stacktape init`                                          |
| macOS   | `curl -L https://installs.stacktape.com/macos.sh \| sh`       |
| Linux   | `curl -L https://installs.stacktape.com/linux.sh \| sh`       |
| Windows | `iwr https://installs.stacktape.com/windows.ps1 -useb \| iex` |

Button: `Copy`, then `Copied`. The npx tab is selected. The other tabs are installation instructions; each must also
show `stacktape init` as the next command.

**Hint under the command**

> Run it in your project. See the AWS setup and estimated cost in your browser. No Stacktape or AWS account needed to
> see the plan. Deploy when you're ready.

**Trust line**

> Open-source CLI (MIT) · Your AWS account · Your config, in your repository

**Visual: from your repository to a running app.** One local wizard window, with a smaller Console window behind it. The
wizard reads `Here's your app on AWS` and shows three recognisable findings: `Next.js storefront`, `Orders API`,
`Postgres database`. Each has a source-file link. Below: `Background processing and permissions connected` and
`Review estimate →`. The Console shows the same project, `acme-project / production`, with `Latest deploy`,
`Application health`, and `AWS costs`. Use the shared example throughout the page. Do not fill the hero with unrelated
charts.

---

## 3. What Stacktape does (seven sections, in this order)

Section introduction:

> From your first deploy to the problem nobody expected.

> Your app needs more than a place to run. Stacktape connects the infrastructure, releases, monitoring, security and
> costs, so your team can work on the product.

Each product window should demonstrate the section's claim with one recognisable situation. Its description below is
editorial direction, not a second paragraph of visitor-facing copy.

### 01 · Designs the stack your app needs

**Explanation**

> Your app already tells us a lot: the framework, the database, the background jobs. Stacktape reads your repository
> with your coding agent and proposes an AWS setup with sensible defaults. Review why each resource is there, how it
> connects to your code, and what the setup is likely to cost.

**What you get**

- > Private networking, database recovery and scaling settings in the same stack. Review the choices and their costs.
- > Services, databases and queues connected, including their permissions and connection settings.
- > One YAML or TypeScript config you own. Add native AWS resources or CDK constructs as your app grows.

**Screen** — local init wizard, Review.

**Visual.** `Here's your app on AWS`. Three evidence rows: `Postgres · found your Prisma schema`,
`Orders API → Postgres · connection and permissions configured`, `Order queue → worker · background processing`. A small
architecture diagram includes the storefront and storage. A decision card reads
`Database recovery: 7 days of backups · Change`. The footer reads `Estimated AWS cost · View breakdown` and
`Save configuration`. A separate `Continue to deployment` action makes the next commitment clear. Show neither a
fabricated resource count nor an unverified price quote.

### 02 · Builds your app, service by service

**Explanation**

> Keep the stack your team likes. A TypeScript API, a Python worker, a Next.js frontend: Stacktape packages them
> together, using built-in builds or your own Dockerfile. It builds independent services in parallel and reuses cached
> work and unchanged artifacts where available.

**What you get**

- > Containers and Lambda functions in the same project, with managed build and artifact storage.
- > Hosted builds run in your AWS account, with caches ready for the next release.
- > Run supported services and databases locally with `stacktape dev`, using the same configuration.

**Screen** — deployment terminal, packaging phase.

**Visual.** `$ stacktape deploy --stage production`. The change is `orders: add fulfillment status`. Three rows:
`apiService · building changed code`, `web · build complete, artifact unchanged`, `worker · reusing image`. A short
footer: `Artifacts stored in your AWS account`. No invented stopwatch or fixed speed claim.

### 03 · Turns a pull request into a working environment

**Explanation**

> Review the change in a working copy of your app, with its own database and background services. Merge when it's ready.
> Stacktape deploys production, runs your configured checks, and watches the release for regressions before calling it
> healthy.

**What you get**

- > Connect GitHub, GitLab or Bitbucket. Configure push-to-deploy and PR environments that clean up on closure.
- > Test critical flows after deployment, with a health-check window and rollback where it's safe.
- > Return to a retained release using its saved artifacts. No old checkout or rebuild needed.

**Screen** — Console, project deployments.

**Visual.** Two cards. `PR #128 · fulfillment status` shows `App + API + worker + database` and `Open preview`.
`Production · v42` shows three checks in order: `Infrastructure updated`, `Order API accepts request · passed`,
`Watching errors and latency · in progress`. A link reads `Compare with v41`. A small scope note beside rollback reads
`Application release; database changes require review`. This shows the future release-verification workflow, not today's
basic deploy status.

### 04 · Checks that your app works for your users

**Explanation**

> A running server can still have a broken checkout. Stacktape brings together uptime checks, browser tests, errors,
> logs and traces. See whether customers can use your app, then follow a slow or failing request to the service behind
> it.

**What you get**

- > Check availability from multiple regions and test flows such as sign-in and checkout on a schedule.
- > Follow browser errors and page performance through to backend traces, with monitoring enabled.
- > Give customers a public status page with availability history and the updates you choose to publish.

**Screen** — Console, application health.

**Visual.** The main card says `Checkout test failed · order confirmation missing`. Beneath it:
`Storefront responds · API responds · Checkout fails`. The selected test step links to the successful API request and a
related worker error: `Message format not recognized`. The window also contains one quiet link, `Public status page`.
The visual proves why checking a URL alone would miss this problem. All monitoring in this example is configured; don't
imply Stacktape guessed the checkout flow or installed browser instrumentation without setup.

### 05 · Finds the risks in what you're running

**Explanation**

> A vulnerability discovered today can affect code you deployed weeks ago. Stacktape scans dependencies and container
> images, saves an inventory of each release, and checks it again as new vulnerabilities are disclosed. Findings point
> to the affected service and environment, with a fix where one is available.

**What you get**

- > Prioritize findings with deployment and exposure context. See which production services are affected.
- > Keep a software bill of materials (SBOM) in your AWS account, ready to export or recheck.
- > Catch leaked secrets and unsafe configuration. Set rules that block releases which violate your team's policy.

**Screen** — Console, security finding.

**Visual.** `New vulnerability · deployed 12 days ago`. A fictional advisory, clearly marked as demo data, identifies
`worker / production`, the installed package, and `Fixed version available`. Four evidence lines:
`Found in deployed inventory`, `Also affects staging`, `Worker has no public endpoint`,
`Update pull request ready for review`. Footer: `View deployment SBOM`. Private networking does not dismiss the finding;
show it as context, not proof that the vulnerability cannot be exploited. Do not invent a real CVE or show a secret
value.

### 06 · Investigates failures and proposes a fix

**Explanation**

> When something breaks, you need more than an alert. Stacktape groups the related failures, connects them to recent
> deployments, and investigates with the relevant logs, traces and code. You get the evidence, a proposed explanation,
> and a fix pull request to review when a code change is appropriate.

**What you get**

- > One incident for related signals, with alerts in Slack, Teams, email or your webhook.
- > Use the built-in investigation or copy the incident context into the coding agent you already use.
- > Review the fix and its checks, then verify recovery. You decide what gets merged and deployed.

**Screen** — Console, incident detail.

**Visual.** Continue the checkout failure from section 04. Header: `Checkout failures · production`. The evidence shows
`Started after v42`, a rejected queue message, and a config/code diff. A panel labelled `Proposed cause` says
`v42 writes a message format the worker does not understand`, with links to the evidence. Next:
`Fix PR #131 · restores message compatibility · checks passed`. Actions: `Review pull request` and
`Copy details for my agent`. The incident remains open until recovery is verified. A separate public-update draft says
only `Some orders are failing. We're working on a fix.` Publishing requires approval; private logs and diagnosis never
become the public status narrative.

### 07 · Shows where the money goes

**Explanation**

> Know what the setup is likely to cost before deploying, then see what each project, environment and resource actually
> costs. When the bill grows, you can find the service behind it. Set budgets and get alerts when actual or forecast
> spending crosses your thresholds.

**What you get**

- > Compare estimated AWS costs as you change the setup, before creating resources.
- > Track production, previews and client projects separately, with resource-level cost breakdowns.
- > AWS bills you directly. Stacktape's platform fee is separate, with a free plan to get started.

**Screen** — Console, project costs.

**Visual.** A dated report, `AWS costs · through September 9`, with a project/stage filter. Select
`acme-project / production`; bars show `apiService`, `worker`, `mainDatabase`, `uploads` and shared costs, with each
resource's type as a secondary label. Select the worker row to inspect its daily trend. A budget card reads
`Forecast exceeds your monthly budget · Alert sent`. Footer: `AWS usage charges · Stacktape fee shown separately` and
`View pricing`. Use illustrative chart shapes without dollar values until verified sample data is available. Budgets are
alerts, not spending caps.

---

## 4. Closing

> See what Stacktape makes of your app.

> Run it in your repository. Review the infrastructure, the decisions and the estimated AWS cost. You'll have a
> configuration you can keep before you decide to deploy.

Repeat the command box, its npx hint and trust line from the hero.

> Already using Stacktape? [Open the Console](https://console.stacktape.com)

---

## 5. Testimonials

**Title**

> What teams say about Stacktape

These are the supplied customer quotes, preserved verbatim. They describe previous product experiences, not endorsements
of the unshipped features pictured above.

1. > "As a startup founder & CTO, every hour is crucial. With Stacktape, we fast-tracked our AWS deployment process. Our
   > development and production environments were operational in just two days. Stacktape's speed and efficiency have
   > been game-changing for us"
   >
   > — Eric Allam, CTO & Founder, Trigger.dev

2. > "Stacktape (the product) and Stacktape (the team) have helped us move extremely fast. They abstract away so much of
   > the complexity of AWS, and let us focus on our application logic, instead of infrastructure configuration. The team
   > is second to none, hopping in to be true partners with us on our development journey. We would not be where we are
   > today without Stacktape."
   >
   > — Henry Garrett, Founding Engineer, Receipts

3. > "Stacktape has been a game-changer for Lastmyle, providing a secure and intuitive way to manage our AWS
   > deployments. It's allowed our small team to efficiently handle environments using GitOps, all while keeping a tight
   > rein on costs."
   >
   > — Rhys Williams, CTO & Founder, Lastmyle

---

## 6. Footer

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

- Product: How it works `#designs`; Pricing `/pricing`; Starter projects
  https://docs.stacktape.com/getting-started/starter-projects; Changelog
  https://github.com/stacktape/stacktape/releases; Console https://console.stacktape.com; Status
  https://status.stacktape.com.
- Docs: https://docs.stacktape.com/cli/init; https://docs.stacktape.com/configuration/resources;
  https://docs.stacktape.com/packaging/overview; https://docs.stacktape.com/ci-cd-and-gitops/overview;
  https://docs.stacktape.com/observability/overview; https://docs.stacktape.com/guardrails/overview;
  https://docs.stacktape.com/managing-costs/overview; https://docs.stacktape.com/using-with-ai/overview.
- Company: Blog `/blog`; Contact `mailto:info@stacktape.com`; GitHub https://github.com/stacktape/stacktape; LinkedIn
  https://www.linkedin.com/company/stacktape; X https://x.com/stacktape.
- Legal: `/privacy-policy`; `/terms-of-use`.

Bottom row: wordmark · `© 2026 Stacktape` · `Open-source CLI (MIT)` · `Made in the EU` · `System status`. Show a live
status indicator only if it is backed by a status feed. Otherwise use the text link. No community links are added.

---

## 7. The example app (facts every screen reuses)

All values describe a fictional order-management application. Never label them as a benchmark, customer capture or
verified bill.

| Field                 | Shared value                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| Project               | `acme-project`                                                                                                  |
| Stage and region      | `production`, `eu-west-1`                                                                                       |
| Storefront            | `web` — Next.js                                                                                                 |
| API                   | `apiService` — TypeScript Lambda behind HTTP API Gateway                                                        |
| Background processing | `worker` — Python container service, polling `orderQueue`                                                       |
| Database              | `mainDatabase` — PostgreSQL, explicitly configured private with backups                                         |
| Queue                 | `orderQueue` — SQS                                                                                              |
| Storage               | `uploads` — S3                                                                                                  |
| Edge protection       | `firewall` — WAF attached to the storefront distribution                                                        |
| Public addresses      | `https://acme.example.com`, `https://api.acme.example.com`                                                      |
| Preview               | PR #128, independent resources and test data; no production data copied                                         |
| Releases              | `v41` previous, `v42` current; retained artifacts available                                                     |
| Incident              | v42 changes the API's queue-message format; the existing worker rejects it and order confirmation never arrives |
| Proposed fix          | PR #131 restores message compatibility; review and verification required                                        |
| Security example      | Separate fictional dependency advisory detected in an older worker inventory                                    |
| Pricing               | No fixed dollar figure; render the actual estimate or clearly labelled sample data                              |

The release in section 03 is still under observation. Sections 04 and 06 explain the evidence and recovery path if a
failure appears. They do not depict an automatically approved migration or a system declaring a failed release healthy.

---

## 8. How the three layouts arrange this content

- **`/stack`** — keep the stacked-card layout. Each card presents one outcome and one supporting screen. Give longer
  content enough height to remain readable; do not shrink type to force it into a viewport.
- **`/sheet`** — keep the light paper layout and section index. It is the clearest baseline for judging the copy because
  the full explanation, bullets and screen are visible together.
- **`/lens`** — keep the pinned product window with scrolling text. Change the screen only when its matching section is
  active. On phones, show each screen with its section.

All three keep navigation, hero, seven sections, closing, testimonials and footer in the same order. The accompanying
review document uses plain text placeholders for every visual.
