# Stacktape homepage — recommended launch copy, revision 2

Future-launch editorial draft. Visitor-facing text is in blockquotes and the marked navigation, command, and footer
fields. Visuals remain descriptions. Revision notes and launch prerequisites are recorded in
`homepage-review/versions/recommended-v2-notes.md`.

The seven product sections begin directly after the hero, without an introduction. The three layouts share this content.
All product-window data is illustrative, not a captured customer environment or benchmark.

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

**Headline** (two lines)

> AWS DevOps, fully automated.

**Subheadline**

> Stacktape reads your repository, designs the infrastructure like a senior DevOps team would, deploys it to your own
> AWS account and makes sure your app runs flawlessly forever after. It keeps you in the loop for any decision that
> requires human attention.

**Command box** — primary CTA; repeat in the closing.

| Tab     | Command                                                       |
| ------- | ------------------------------------------------------------- |
| npx     | `npx stacktape init`                                          |
| macOS   | `curl -L https://installs.stacktape.com/macos.sh \| sh`       |
| Linux   | `curl -L https://installs.stacktape.com/linux.sh \| sh`       |
| Windows | `iwr https://installs.stacktape.com/windows.ps1 -useb \| iex` |

Button: `Copy`, then `Copied`. The npx tab is selected. The other tabs are installation instructions; each must also
show `stacktape init` as the next command.

**Trust line**

> Open-source CLI (MIT) · Your AWS account · Your config, in your repository

**Visual: from your repository to a running app.** One local wizard window, with a smaller Console window behind it. The
wizard reads `Here's your app on AWS` and shows three recognisable findings: `Next.js storefront`, `Orders API`,
`Postgres database`. Each has a source-file link. Below: `Background processing and permissions connected` and
`Review estimate →`. The Console shows the same project, `acme-project / production`, with `Latest deploy`,
`Application health`, and `AWS costs`. Use the shared example throughout the page. Do not fill the hero with unrelated
charts.

---

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

### 02 · Packages it

**Explanation**

> Stacktape turns your code into Lambda packages and container images. Point it at an entry file and the built-in
> buildpacks handle the build, or use your own Dockerfile. Builds run in parallel, with caching that reuses work from
> previous releases. Stacktape handles packaging and uploads as part of the deploy.

**What you get**

- > Built-in builds for Node.js, Python, Java, Go, Ruby, PHP and .NET, or your own Dockerfile or prebuilt image.
- > Parallel builds, dependency caches and reuse of unchanged artifacts.
- > Hosted builds and a managed image registry in your AWS account.

**Screen** — deployment terminal, packaging phase.

**Visual.** `$ stacktape deploy --stage production`. The change is `orders: add fulfillment status`. Three rows:
`apiService · building changed code`, `web · build complete, artifact unchanged`, `worker · reusing image`. A short
footer: `Artifacts stored in your AWS account`. No invented stopwatch or fixed speed claim.

### 03 · Deploys it

**Explanation**

> A push to main deploys. Stacktape takes care of the infrastructure update, application rollout and post-deploy checks.
> Pull requests get isolated environments, production releases can shift traffic gradually, and a failed release can
> return to its previous version. You manage the deployment rules in one place.

**What you get**

- > Push-to-deploy from GitHub, GitLab or Bitbucket, with full PR environments that clean up when the pull request
  > closes.
- > Canary or linear rollouts for Lambda and supported containers, with verification checks and automatic rollback.
- > One-command rollback to a retained release, using its saved artifacts without a rebuild.

**Screen** — Console, project deployments.

**Visual.** Heading `Deployments`, with the rules `main → production` and `pull request → preview`. Three rows:
`v42 · orders: add fulfillment status · Rolling out`, `v41 · Previous release` and `PR #128 · Preview · Open app`.
Expand v42 to show `Canary · 10% traffic`, `API check passed` and `Watching errors and latency`. Actions:
`Compare with v41` and `Roll back to v41`. The preview includes its own API, worker and database. A small scope note
beside rollback reads `Application release; database changes require review`.

### 04 · Monitors it

**Explanation**

> Stacktape brings your logs, metrics, traces and errors into one Console. Exceptions are grouped across services,
> public URLs are checked from multiple regions, and browser tests verify critical flows. Follow a slow or failing
> request through your services, open its logs and compare what changed after a deployment.

**What you get**

- > An error inbox with grouped exceptions, stack traces and release context.
- > Service performance and request traces, with browser errors and page performance linked to the backend.
- > Multi-region uptime checks, scheduled browser and API tests, and a public status page for your customers.

**Screen** — Console, project monitoring.

**Visual.** Three metric tiles: `Requests`, `Response time` and `Error rate`, with a `v42 deployed` marker on their
charts. Below, a request waterfall for `POST /orders` shows the API handler, database write and queue send, with an
`Open logs` link. An error-inbox row reads `worker · Message format not recognized · first seen after v42`. A compact
availability strip shows the API responding from three regions and a failing checkout browser test. Link:
`Public status page`. Monitoring and instrumentation are configured for this sample project.

### 05 · Secures it

**Explanation**

> Security is part of the deployment. Stacktape wires resource permissions and network access, uses secret references to
> keep credentials out of configuration, and enforces your team's guardrails. Dependency, container and secret scans
> show which services need attention, with the affected environment and a fix where one is available.

**What you get**

- > Organization-wide rules for private databases, backups, approved regions and required firewalls.
- > Dependency and image scans, secret detection, and policies that block releases which fail your security checks.
- > Software inventories (SBOMs) stored in your AWS account, rechecks for new vulnerabilities, and fix pull requests to
  > review.

**Screen** — Console, project security.

**Visual.** Heading `Security`, with scan-coverage labels for dependencies, images, secrets and configuration. Two
findings: `worker / production · vulnerable dependency · fixed version available · Review fix PR` and
`Repository · secret detected in commit history · Rotate credential`. A guardrail notice reads
`Staging deploy blocked · mainDatabase would get a public address`. Footer: `View deployment SBOM` and
`Rechecked against new advisories`. The advisory is clearly fictional; show no secret value. Coverage distinguishes
scanned, unavailable and not enabled.

### 06 · Handles incidents

**Explanation**

> When a check fails or errors spike, Stacktape opens an incident with the signals, affected services and recent release
> in one place. Its built-in investigation uses logs, traces and code to propose a cause and prepare a fix pull request.
> You review the change and decide what gets deployed.

**What you get**

- > Related alarms, errors and failed checks grouped into one incident, with a release timeline.
- > Alerts in Slack, Microsoft Teams, email or a webhook, with acknowledgement and notification controls.
- > Give your coding agent the same context through an evidence bundle or Stacktape's MCP server.

**Screen** — Console, incident detail.

**Visual.** Header `Checkout failures · production`. A timeline shows `v42 deployed`,
`Worker errors and browser-test failure grouped`, `Investigation started` and `Fix PR #131 ready for review`. The
diagnosis panel reads `Proposed cause: v42 writes a message format the worker does not understand`, with links to the
rejected message, logs and code diff. The fix restores message compatibility. Actions: `Review pull request` and
`Copy for my agent`. Recovery remains unverified until the checks pass after deployment.

### 07 · Tracks costs

**Explanation**

> See what each project, environment and resource costs this month, using your AWS billing data. Set a budget and
> Stacktape alerts you when actual or forecast spending crosses your thresholds. AWS bills you directly. Stacktape's
> subscription is separate, with a free plan to get started.

**What you get**

- > Costs by project, stage and resource, with shared costs shown separately.
- > Budget and forecast alerts for a single stack or your organization.
- > Estimates in the init wizard, before you create any resources.

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

Repeat the command box and trust line from the hero.

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
