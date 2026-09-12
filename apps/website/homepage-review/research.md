# Homepage review notes

This research and the comparison guide below describe the first round. The user's follow-up is recorded in
[Recommended v2 notes](versions/recommended-v2-notes.md); the original headline/subheadline are now fixed, the first
recommendation's command hint and introduction are removed, and sections 02–07 return to the original's direction.

This is a future-launch copy exercise, as requested. Source availability below does not establish public release
availability. The review page is not a deployed marketing page.

## Where to start the comparison

Compare the **original and recommended** hero, then sections **03–06**. These show the biggest changes in the argument:
a useful first result without an account, a whole preview environment, customer-facing failures, security after
deployment, and a reviewable response to an incident. Then read the recommended page straight through to judge the flow.

The independent drafts offer different editorial choices. These are reading notes, not a model benchmark or a vote on
which claims are true; the source checks are attached to each version.

| Version        | Useful idea to examine                                                                                      | Main tradeoff                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Recommended    | A connected customer story; an account-free first result; two concrete surprises in monitoring and security | Longer outcome headings are less compact than the original's seven verbs         |
| Original       | Seven short verbs give the page a clear sequence                                                            | Capability lists leave visitors to work out why each feature matters             |
| Fable          | Connects a failed release, rollback, investigation and verified replacement into one example                | Long explanations and timelines reward reading deployment and incidents together |
| External Codex | Explicitly names teams without a DevOps team and makes human review of fixes clear                          | Repeated qualifications interrupt the invitation to try the product              |
| Grok           | Practical explanations of independent previews, rollback and security responses                             | Limits and setup details make the work feel larger                               |
| Gemini         | Presents the breadth of the product while keeping ownership and extensions visible                          | Dense terminology and broad assurances require more interpretation               |
| DeepSeek       | Makes alert overload tangible and includes substantial future operational scope                             | Long bullets often contain several benefits, hiding the strongest one            |
| GLM            | Explains the consequences of budgets, scan coverage and human review                                        | Monitoring and security still read mainly as inventories of technical features   |

After the original and recommendation, compare **Fable's deployment and incident sections together**, then the external
Codex page. Use DeepSeek and GLM for breadth and practical explanations, and Grok and Gemini for individual wording and
tone choices. Repeated navigation, testimonials and footers can wait until the main argument is settled.

## Why this version leads with the plan

The four business documents describe startups and agencies with 2–10 developers. They have enough infrastructure to make
operations a recurring distraction, but little appetite for a platform team. Developers need a clear next action; CTOs
need to see that the choice will still work as the app grows.

The lowest-commitment next action is unusually good: run `npx stacktape init` against the repository you already have,
inspect the proposed setup and price, and keep the configuration. The current `cli/init.mdx` and wizard source support
doing that without a Stacktape or AWS account. Deployment is a later, explicit step. That belongs beside the command,
rather than being buried in documentation.

The seven sections retain their original jobs but give each a different reason to care:

| Section   | Question it answers                                            | Demonstration                                                                |
| --------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Design    | Will it understand my real application?                        | A database justified by the Prisma schema; connections and choices explained |
| Package   | Can we keep the stack we use?                                  | Mixed languages and runtimes, parallel builds and artifact reuse             |
| Deploy    | Can we review and release without another process to maintain? | A whole PR environment, followed by deployment verification                  |
| Monitor   | Does the app actually work for customers?                      | Healthy endpoints but a broken checkout                                      |
| Security  | Which running service needs attention?                         | A newly disclosed vulnerability in a deployment that hasn't changed          |
| Incidents | What should we do next?                                        | Release evidence, a proposed diagnosis, a reviewable fix and recovery check  |
| Costs     | What caused the bill to grow?                                  | Resource and environment attribution with a budget forecast                  |

The two most memorable examples are the checkout that fails while the servers are up, and the deployment affected by a
newly disclosed vulnerability without a new commit. They explain the value of operational context without asking
visitors to decode an architecture diagram or an acronym list.

The headline is preserved. The subheadline changes the impossible “runs flawlessly forever after” promise into the
intended observable workflow: watch, investigate, propose a fix, involve the user. The closing invites a useful first
result instead of claiming to complete every possible DevOps duty.

## Competitive context

These pages were checked on 10 September 2026. This is a positioning check, not a feature benchmark.

- Render documents full preview environments, including separate data services and automatic cleanup. A preview URL
  alone is therefore not a differentiator. [Render preview environments](https://render.com/docs/preview-environments)
- Railway already presents easy deployment, private networking, previews, logs, metrics and alerts. A generic list of
  those capabilities would be difficult to remember as Stacktape. [Railway](https://railway.com/)
- SST already demonstrates a single config connecting application services. Stacktape should show the generated,
  explained starting point and the operational workflow beyond it. [SST](https://sst.dev/)
- Serverless Framework offers logs, metrics, traces and error monitoring. Do not claim that observability itself makes
  Stacktape unique. [Serverless monitoring](https://www.serverless.com/framework/docs/guides/dashboard/monitoring)
- Ravion connects infrastructure, releases, failures, logs and metrics in the customer's AWS account. Ownership and
  connected context are shared positioning territory. Stacktape must demonstrate its particular experience for a small
  team, rather than claim exclusive ownership of that idea.
  [Ravion's product explanation](https://www.ravion.com/what-is-ravion)

The recommendation is an editorial inference from these sources and the business documents: combine an inspectable first
AWS plan with the concrete work the same product takes on afterward. Avoid competitor attack copy or unsupported savings
comparisons.

## Claim checks for the recommended page

| Location            | Claim or example                                 | Evidence and publishing prerequisite                                                                                                                                                           |
| ------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero                | No account needed to see the plan                | Current `apps/docs/content/cli/init.mdx`; `apps/init-ui/src/steps/StartStep.tsx`. Applies to analysis/config generation, not deployment. AI uses the user's existing provider plan.            |
| Hero, 06            | Investigation and proposed fix                   | Hosted remediation is accepted roadmap work. Requires isolated execution, scoped tools, provider write capability, validated patches, limits, and the release exposing this flow.              |
| 01                  | Choices, source evidence, estimate               | Init docs and ReviewStep source. The standard config defaults to YAML; TypeScript is an option. The price is an estimate, not a quote or cap.                                                  |
| 01                  | Resource connections and extensions              | `configuration/connecting-resources.mdx`; `resources/advanced/*`. Resource-scoped access is not universally minimum-action IAM. No one-click ejection promise.                                 |
| 02                  | Build reuse and mixed runtimes                   | `packaging/*`, `ci-cd-and-gitops/build-runners.mdx`. Requires retained usable artifacts/caches and supported packaging.                                                                        |
| 02                  | Local services/databases                         | `local-development/*`. Supported services and emulators; not all AWS behavior runs locally.                                                                                                    |
| 03                  | Independent previews                             | `ci-cd-and-gitops/gitops-with-console.mdx`. Deployment/deletion rules must be configured; preview databases contain independent test data.                                                     |
| 03                  | Post-deploy flows, bake window and safe rollback | Observability batch 5, unimplemented. Requires release identity, comparison/verification, gate configuration and rollback-safety handling. Existing gradual deploys do not prove this promise. |
| 03                  | Retained-artifact rollback                       | `deployment-and-lifecycle/rollbacks.mdx`. Does not reverse migrations or external side effects.                                                                                                |
| 04                  | Uptime and synthetic tests                       | Config types, CLI resolvers, Console pages and observability docs exist. Configured checks, schedules and AWS charges apply.                                                                   |
| 04                  | Browser performance linked to traces             | Batch 8 RUM, unimplemented. Needs browser instrumentation, backend correlation, opt-in/cost disclosure and supported runtimes.                                                                 |
| 04, 06              | Public status page                               | Batch 7, unimplemented. Requires a separate public data projection, approved narratives, availability history and deliberate publication. Custom domains are later work.                       |
| 05                  | Scans, saved inventories, new-CVE rechecks       | Security proposal phase 1, unimplemented. Needs actual scanner coverage, artifact identity, secure ingestion and reliable scheduled checks.                                                    |
| 05                  | SBOM stored in customer AWS                      | Later security decision supersedes central retention. Default rechecks may temporarily stream inventory through Stacktape; strict mode keeps rechecks in customer AWS.                         |
| 05 visual           | Update PR                                        | Security phase 2, unimplemented. Requires correct source mapping, fix availability, validation and write-capable provider connection.                                                          |
| 05                  | Secret detection and policy gates                | Secret detection is proposed; static config guardrails already exist. Vulnerability gates need a separate post-build enforcement point. Leaked credentials require rotation/revocation.        |
| 06                  | Grouped incidents and copy-for-agent             | Current incident engine/UI/handoff source. The current bundle provides selected evidence and links, not an automatic copy of every log and trace.                                              |
| 06                  | Proposed explanation                             | Treat model output as a hypothesis supported by linked evidence, never verified root cause merely because the model says so.                                                                   |
| 06                  | Human review of fixes                            | The displayed default flow is PR review. Later direct deployment is only optional per-stage policy and excludes autonomous migrations/stateful changes.                                        |
| 07                  | Attributed costs and budget alerts               | `managing-costs/*`. Data may lag, shared/unattributed costs exist; budgets do not stop spending.                                                                                               |
| 07                  | Free plan                                        | Existing public pricing supports a limited free plan. Confirm launch terms; the copy intentionally avoids a fixed percentage or unlimited free-team promise.                                   |
| Testimonials        | Existing customer statements                     | Original homepage plus old website `src/sections/Testimonials/Testimonials.tsx`. Preserved without rewriting. They concern earlier experience, not the new scanning/AI suite.                  |
| Announcement/footer | Release article, docs, pricing, status           | Confirm launch routes. No hard-coded green health badge without a working status feed.                                                                                                         |

## Complete observability inventory

The older deferred list was later accepted as intended scope. It must not be mistaken for discarded ideas. Construction
batches 1–3 have source implementation; later batches remain plans.

| Capability                                                       | Current evidence/status                                             | Homepage treatment                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Logs and infrastructure metrics                                  | Current Console/CLI/docs                                            | Core monitoring and incident evidence                                     |
| Error grouping                                                   | Current Issues and incident source; opt-in and coverage limits      | Monitoring/incident example rather than a separate catalogue              |
| Traces and waterfall                                             | Current source; supported Lambda automation, container SDK required | Request-to-service investigation; no universal zero-setup claim           |
| Multi-region uptime                                              | Current config/resolvers/Console                                    | Availability in section 04                                                |
| Browser/API synthetics                                           | Current config/resolvers/Console                                    | Checkout example is the main monitoring demonstration                     |
| Certificate expiry and monitor-silence detection                 | Current uptime/incident source                                      | Supporting coverage; omitted from headline copy for focus                 |
| Incident grouping, severity, ack/mute/recovery                   | Current engine                                                      | Section 06                                                                |
| Alerts and delivery history                                      | Current channels/router/UI                                          | Short delivery-channel bullet                                             |
| Release-aware handoff and cross-signal links                     | Current source with narrower bundle than original plan              | Evidence-to-action workflow                                               |
| Exact incident CLI commands                                      | API contracts exist; commands not found in current CLI              | Not promised by name; reconcile source before documenting them            |
| Hosted AI investigation and fix PR                               | Accepted batch 4, unimplemented                                     | Main future-launch promise, explicitly gated above                        |
| Automatic remediation triggers/direct deploy                     | Later parts of batch 4, unimplemented                               | Omitted from main page; default human review is clearer for this audience |
| Release health comparisons and bake gates                        | Accepted batch 5, unimplemented                                     | Section 03 connects deploy to actual application health                   |
| Service/operation APM pages, percentiles, top operations, facets | Accepted batch 6, unimplemented                                     | Underlying investigation depth; not another list on the homepage          |
| Public status/availability history and approved updates          | Accepted batch 7, unimplemented                                     | Section 04 and incident visual; clear agency/client value                 |
| Status-page custom domains                                       | Later roadmap                                                       | Omitted until supported                                                   |
| Opt-in anomaly alarms                                            | Accepted batch 8, unimplemented                                     | Omitted to avoid implying cost-free, universal automatic monitoring       |
| Browser RUM, Web Vitals, JS errors/backend links                 | Accepted batch 8, unimplemented                                     | One customer-experience bullet in section 04                              |
| Wider container/runtime/Convex tracing                           | Follow-up scope; partial changes not fully audited                  | Avoid universal language/runtime instrumentation claims                   |
| Retention, canary IAM and artifact cleanup refinements           | Operational follow-ups                                              | Implementation prerequisites rather than sales copy                       |
| Cron/heartbeat monitoring                                        | Explicitly cut                                                      | Excluded                                                                  |

## Complete security inventory

The security suite is a proposal. Runner work interrupted it. The earlier recommendation to replace EC2 with CodeBuild
was later reversed: EC2 is the chosen hosted runner. Neither an old proposal nor documentation of a plan proves the
relevant security capability is implemented.

| Capability                                                                         | Stage/status                                 | Homepage treatment                                                              |
| ---------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| Secret references, private-network configuration, IAM connections, WAF, guardrails | Existing foundations                         | Safeguards supporting section 05; not called universally private by default     |
| Dependencies, image OS/packages, Lambda artifact scanning                          | Phase 1 proposal                             | Core security story                                                             |
| Per-deployment SBOM                                                                | Phase 1 proposal                             | Explain the inventory before introducing the acronym                            |
| Recheck existing inventories for new CVEs                                          | Phase 1 proposal                             | Memorable “nothing deployed, new risk” example                                  |
| Buildpack/base-image recommendations                                               | Phase 1 proposal                             | A useful available fix, not universal remediation                               |
| Plaintext secrets in config                                                        | Phase 1 proposal                             | Brief secret-detection benefit                                                  |
| About 30 posture checks                                                            | Phase 1 proposal                             | Rules preventing understandable mistakes; omit the arbitrary count              |
| Internet exposure, severity and scan-coverage overview                             | Phase 1 proposal                             | Context around a finding, not a claim of proven exploitability                  |
| Findings tied to incidents                                                         | Phase 1 proposal                             | Same operating workflow; full mapping not guaranteed for unattributed assets    |
| Dependency/config fix PRs with validation/migration notes                          | Phase 2 proposal                             | Security visual, gated on source and provider support                           |
| Secret conversion plus required rotation                                           | Phase 2 proposal                             | Must revoke/rotate exposed credentials; moving a value is not remediation       |
| Git-history secret and PR diff scans/checks                                        | Phase 2 proposal                             | Included in research, omitted from short visitor copy                           |
| Post-build vulnerability/secret deploy gates                                       | Phase 2 proposal                             | Policy benefit; distinguish from existing pre-build guardrails                  |
| CloudFormation drift detection                                                     | Phase 2 proposal                             | Omitted from main page; redeploying an unchanged template is not reconciliation |
| Secret age/orphans, stale keys, MFA, external-access findings                      | Phase 2 proposal                             | Supporting security depth                                                       |
| WAF analytics and durable logging                                                  | Phase 2/3 proposal                           | Supporting depth; requires logging opt-in and cost handling                     |
| SBOM export                                                                        | Phase 2 proposal                             | Brief concrete artifact for clients and security reviews                        |
| GuardDuty and runtime threats                                                      | Phase 3 proposal                             | Not the initial security pitch; paid opt-in capability                          |
| Prowler account audits                                                             | Phase 3 proposal                             | Supporting depth beyond app scans                                               |
| Existing Inspector/Security Hub integrations                                       | Phase 3 proposal                             | Supporting depth; not automatically enabled or free                             |
| SAST via Opengrep                                                                  | Phase 3 proposal; rules licensing unresolved | Excluded from homepage promises                                                 |
| CIS/FSBP mappings, client reports, audit exports                                   | Phase 3 proposal                             | Strong agency follow-up material; not a certification claim                     |
| Macie and AWS Config                                                               | Excluded by proposal                         | Excluded                                                                        |

## Source register

Business: all four files under `apps/console/documents/business` were read. Product research reviewed
`apps/docs/content`, with detailed reading of onboarding, resource wiring, build/deploy/rollback, local development, AI
use, observability, guardrails and costs. Source checks resolved conflicting documentation where it mattered to the
copy.

Key repository sources:

- `apps/docs/content/cli/init.mdx`; `apps/init-ui/src/steps/StartStep.tsx`; `ReviewStep.tsx`.
- `apps/docs/content/configuration/connecting-resources.mdx`; `overrides-and-escape-hatches.mdx`; `secrets.mdx`;
  `resources/advanced/*`; `resources/databases/relational-database.mdx`.
- `apps/docs/content/packaging/*`; `local-development/*`; `ci-cd-and-gitops/*`; `deployment-and-lifecycle/*`;
  `using-with-ai/*`.
- `apps/docs/content/observability/*`; `guardrails/*`; `managing-costs/*`.
- `apps/console/api/src/services/incident-engine.ts`; `incident-handoff.ts`;
  `apps/console/ui/src/pages/IncidentsPage/IncidentDetailPage.tsx`.
- `packages/config/src/tracing.ts`; `uptime-checks.ts`; `synthetic-tests.ts`.

Historical decisions, from local Claude Code records:

- Security session `858dd17f-d0e5-45f8-8f9d-98fdd5ef029e`, JSONL lines 502 (revised full proposal), 525 (verified
  corrections and explanation), 561 (later customer-account SBOM default).
- Observability session `2888f417-b796-4b93-b188-ca9b9ee94860`, lines 11064 (deferred menu), 11068 and 11166 (user
  accepts broad scope), 11282 (review-hardened eight-batch plan).
- Both live in `/mnt/c/Users/congy/.claude/projects/c--Projects-stacktape/`. Their companion memory documents are
  `memory/console-security-section-proposal.md` and `memory/observability-suite-design.md`. Later decisions take
  precedence over earlier summary paragraphs.

The supplied baseline was found at `/mnt/c/Projects/stacktape/apps/website/homepage.md`, because this Linux checkout
lacked that file. It is preserved as `versions/original.md`. The old website reference was found at
`/mnt/c/Projects/website`. Unrelated source changes in both checkouts were preserved.

During this task, the Windows homepage gained additional layout-concept notes (`readme`, `hire`, `session`, `status`).
Those concurrent edits were left untouched. “Original” in this review means the eight-part snapshot captured in the
shared writer request, before those additions; it still matches that captured input.

## Review and validation method

The user requested all providers in `.agents/prompts/external-review.md`. Each first pass receives the same task,
baseline, complete business documents and neutral capability/roadmap packet. No writer receives another writer's answer.
Model identity, failures and output files are recorded separately.

The evidence packet was corrected after deeper source checks: some exact incident CLI commands are absent in the current
refactor, and git-history secret scanning is phase 2. Those corrections are applied during final verification. They do
not change the intended future-launch scope.

An adjacent packet sentence about configuring autoscaling was misread as a universal prerequisite for gradual traffic
shifting. Current Lambda and container deployment docs and validation do not establish that requirement. This reviewer
conclusion is rejected in the GLM local notes.

Review is by evidence, not vote. Candidate overclaims are checked against the underlying config/docs, current source and
later plan decisions. External versions remain attributable to their authors; review notes flag problems rather than
silently making every version sound like the recommendation.

The artifact renderer is checked for deterministic output. Browser checks cover version selection, comparison, section
navigation, visual-description visibility, downloads, and narrow-screen layout. There are no application/runtime or AWS
changes in this task.

Final local review of the recommendation corrected five points: the queue-message failure now matches the API/worker
architecture throughout; Next.js output reuse no longer implies skipping its build; customer-account builds are
explicitly hosted builds; the cost chart names the resource selected below it; and the visitor copy now mentions
configured networking, recovery and scaling. The Next.js finding was checked against
`packages/packaging/src/web/nextjs-web.ts`, not inferred from cache terminology.

Final browser validation covered all eight versions and 15 selectable sections each, exact Markdown downloads, section
comparison, aligned headings, review-note navigation, visual-description toggles and a 390-pixel viewport. The portable
HTML also works through a local file URL. No JavaScript errors or external resource requests occurred. All six writer
pages and their original notes match their captured outputs; the original page matches the baseline in the common input
packet. Formatter, renderer freshness, renderer lint and repository instruction checks are the relevant
document/artifact gates for this change.
