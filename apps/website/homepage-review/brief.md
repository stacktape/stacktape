# Independent homepage brief

Recreate Stacktape's homepage copy and text descriptions of its visuals. This is an independent writing exercise
followed by verification, using `.agents/prompts/external-review.md`. Do not see or use other writers' answers. Do not
assume the existing page is correct or defective.

## User's contract

The existing page is supplied below. Keep its structure: navigation; hero; seven sections in the same order (design,
package, deploy, monitor, secure, incidents, costs); closing; testimonials; footer; shared example-app facts; layout
notes. Each of the seven sections must keep a name, explanation, what-you-get bullets, and screen/visual description.
You may change any copy or illustrative scenario. The headline and subheadline are mostly set: keep “AWS DevOps, fully
automated.” Change the subheadline only for a clear reason. Make the page easy to follow, empathetic to the target
audience, memorable, and convincing enough to run `npx stacktape init`. Images remain text descriptions. Do not build a
website or generate images.

Write a future-launch editorial version incorporating the planned security and observability capabilities. Mark every
unshipped claim and prerequisite in review notes outside the page. This is a draft for review, not authorization to
advertise unshipped functionality as available. Do not invent capabilities beyond the supplied plans.

## Audience: complete business documents

The four business documents are appended verbatim below. They describe early-stage startups and small agencies with 5–50
employees and 2–10 developers. Developers have little-to-medium infrastructure expertise and work without a DevOps team.
CTOs evaluate long-term coverage, flexibility, risk, and the entire software lifecycle. Fewer decisions, sensible
defaults, and explaining implications are product requirements.

## Product evidence and limitations

These are source-grounded facts, not suggested copy. You can inspect referenced repository files if your tools permit.
If you have no file access, use this packet and disclose that limitation.

- `apps/docs/content/cli/init.mdx`, `apps/init-ui/src/steps/StartStep.tsx`: init opens a local browser wizard. Reading
  begins on the user's click. Claude Code/Codex reads with restricted read-only tools under the user's AI account.
  Source goes to that provider in the normal way; Stacktape does not receive source, filenames, or config contents.
  Files-only scanning does not use AI. No Stacktape/AWS account is needed to analyze and generate config. Deployment is
  separate and needs an account/explicit target confirmation. Analysis is not a free AWS deployment or automatic
  migration.
- Init recognizes supported app files and deployment manifests, proposes resources with source evidence and reasons,
  supplies defaults for unresolved choices, estimates AWS list-price costs, updates the config/estimate as choices
  change, and writes YAML or TypeScript. Existing provider-managed resources are not taken over. AWS costs start after
  an approved deploy; optional local build tests can run code and download dependencies before that. AI-provider use may
  cost money under the user's existing plan.
- `configuration/connecting-resources.mdx`: a resource connection wires service permissions, network access, and
  generated connection variables. Avoid promising minimum possible privileges: some service policies are broad.
  `configuration/overrides-and-escape-hatches.mdx` and `resources/advanced/*`: native CloudFormation resources, property
  overrides, and CDK constructs are supported extension mechanisms. Own AWS account/native resources and MIT CLI are
  real. “Eject anytime” does not mean a tested one-click migration tool.
- Resource coverage includes frontend frameworks, container web/private/worker services, Lambda, batch, relational
  databases, Redis, queues/events, object storage, scheduled work, workflows, and AI resources. Containers and functions
  can coexist. Do not claim every language and packaging strategy gets every instrumentation feature.
- `packaging/*`: built-in buildpacks, own Dockerfile, prebuilt images and other buildpacks; parallel content-aware
  packaging/caches avoid needless rebuilds where reusable artifacts remain available. Avoid absolute “never rebuilt
  twice.” Remote builds run in the customer's AWS account on the EC2 runner. No CodeBuild sales comparison or universal
  15-second build-start guarantee.
- `local-development/*`: supported workloads run locally, with hot reload and local databases or connections to deployed
  resources; `dev --agent` exposes structured logs/status/debug tools. No wholesale local AWS emulation claim.
- `ci-cd-and-gitops/*`: GitHub, GitLab, Bitbucket; rules configure push and PR deploys, complete independent stacks with
  their own resources, and cleanup on closure. No live-production data is implicitly copied into previews. Existing CI
  can invoke CLI.
- `deployment-and-lifecycle/*`: preview config changes and replacements, stage configuration, hooks/migrations, rollback
  to retained deployment artifacts. Rollback does not undo database migrations or external side effects. Gradual traffic
  shifting is supported for Lambda and eligible ALB-backed container services; it is not universal. Autoscaling must be
  configured for the resource.
- `observability/*`: logs and infrastructure metrics, opt-in error grouping, configured uptime probes in multiple
  regions, Playwright/API synthetic checks, configurable tracing. Current tracing supports automatic instrumentation for
  supported Lambda runtimes; containers need SDK/instrumentation setup, and some runtimes/deployment modes are excluded.
  Issues are off by default and need redeploy after enablement; raw log-pattern grouping has coverage limits. These do
  not all appear automatically with every deploy.
- Current source contains incident correlation, lifecycle, agent evidence bundles/CLI handoff and cross-signal links.
  This is source availability, not proof a public release includes it. Model-produced diagnosis is a hypothesis, not a
  verified root cause.
- `guardrails/*`: organization rules can require private databases, backups/deletion protection, approved regions, and
  supported firewall configurations; enforce before deployment. Standard database resource defaults are not universally
  private; phrase as configured protection or a policy. AWS Secrets Manager references keep secret values out of
  committed configuration. A detected leaked key must be rotated/revoked, not merely moved into a secret reference.
- `managing-costs/*`: estimated price before deploy; AWS-derived costs by stack/project, stage and resource where
  attributed; actual and forecast budget alerts. AWS bills separately. A budget alerts; it is not a hard cap or
  guarantee of no overspend. AWS reports lag and shared/unattributed costs exist. The current public pricing page shows
  a free plan up to $100/month AWS costs for one member, then paid percentage tiers; don't say all features are free,
  unlimited free team, or no Stacktape fee. Prefer linking pricing to inventing v4 commercial terms.

## Full intended observability roadmap

Primary source: Claude Code session `2888f417-b796-4b93-b188-ca9b9ee94860`, final accepted plan at JSONL line 11282;
original deferred menu at 11064, subsequently accepted by the user. Memory: `observability-suite-design.md` in that
session's project memory. Construction batches 1–3 have source implementation; later batches remain plans.

1. Unified incident engine: uptime failure, synthetic failure, alarms, monitoring silence, production error groups,
   unhealthy stacks and expiring certificates. Group related signals by stack/time/release. Open/acknowledged/resolved,
   severity and notification suppression, source/release identity. Production error groups only page on
   severity/spike/regression thresholds. Migrate alarms to config; alert channels/rules/history remain accessible.
2. Copy-for-agent and CLI evidence bundles: errors/frames, git SHA, relevant config/diff, infrastructure events,
   probe/canary results, redaction and verification steps. Credentials stay where the bundle is composed. Project-scoped
   API keys and MCP read tools.
3. Cross-signal pivots: trace to logs, incident to relevant telemetry, deployment overlays; incident merge/split.
4. Hosted AI remediation: isolated job in customer AWS, model without AWS/git credentials, tools scoped to stack,
   diagnosis plus validated fix PR by default. Human review. Write-capable git connection required; CLI-only projects
   get local handoff. Direct deployment only by explicit per-stage opt-in, normally app-code-only; never autonomous
   stateful changes or migrations. Attempt and spend limits; button first, automatic triggers later. Still planned.
5. Release health and deployment gates: compare releases, run verification and observe a bake window after deploying,
   gate/rollback on configured failures with rollback safety. Still planned; ordinary canary rollout is not equivalent.
6. APM service/operation pages: request rate, error rate, latency percentiles, top operations, facets/pagination.
   Planned depth beyond existing trace explorer.
7. Public status pages: availability and deliberately published incident updates through a separate public projection.
   Private incident evidence must not be exposed. Custom domains later. Planned.
8. Opt-in anomaly alarms, browser RUM/web vitals/JS errors linked to backend traces, broader container/runtime tracing,
   configurable retention and operational refinements. Costs and instrumentation apply. Planned.

Cron/heartbeat monitoring was explicitly cut. Do not include it as an accepted roadmap feature. You do not need to cram
every roadmap item onto the homepage; explain your prioritization in review notes.

## Full intended security roadmap

Primary source: Claude Code “Security navigation section,” session `858dd17f-d0e5-45f8-8f9d-98fdd5ef029e`, revised
proposal at line 502 and explanations at 525; later SBOM decision at 561 supersedes initial central-storage proposal.
Memory: `console-security-section-proposal.md`. These are proposals; the scanning suite is not implemented.

- Phase 1: dependencies/lockfiles and container OS/package scanning (Trivy); secret patterns/history scanning
  (Gitleaks), with redacted findings and rotation-first guidance; deployment-specific software bill of materials (SBOM);
  ~30 config posture rules, coverage overview and findings mapped to resource/project/stage where evidence allows;
  existing ECR basic image scanning as a limited layer.
- Recheck saved inventories against new CVEs without rebuilding. SBOM stored in customer AWS; default proposed recheck
  streams inventory through Stacktape temporarily and persists only findings; strict mode runs rechecks in the customer
  account. Never promise all inventory remains inside AWS under the default mode or instant detection of all new CVEs.
- Context includes exposure and deployed version, affected package, fixed version where one exists. Exposure is not
  proof of exploitability or code reachability. Missing source, prebuilt images, incomplete tags, and account-wide
  findings need explicit coverage states.
- Phase 2: validated dependency/base-image/config fix pull requests; secret rotation follow-through; post-build security
  deployment gates and PR posture checks with real additional enforcement. Existing pre-build guardrails alone cannot
  block on later vulnerability results.
- Phase 3: opt-in AWS GuardDuty including runtime monitoring, broader account posture via Prowler, drift detection, IAM
  credential hygiene, WAF traffic analytics with durable logging, optional Inspector/Security Hub; later SAST
  conditional on viable rule licensing; CIS/FSBP mappings, client reports and SBOM export. Reports are evidence, not a
  certification or guaranteed compliance. Paid AWS services require opt-in and cost transparency. Macie/AWS Config were
  deliberately excluded.
- Runner hardening is separate ongoing prerequisite work. Do not claim scanners prevent arbitrary compromised
  dependencies, fully isolated builds, or that security fixes happen autonomously. Do not recycle the old recommendation
  to remove EC2: the later locked decision chose EC2 as the hosted runner and removed CodeBuild.

## Competitive context, verified 10 September 2026

Use these sources as context, not attack copy. Render offers previews/private networking/MCP:
https://render.com/docs/preview-environments and https://render.com . Railway pitches simple deployment, private
networking, logs/metrics/alerts and PR environments: https://railway.com . SST offers a single infrastructure config and
linked services: https://sst.dev . Serverless Framework has metrics/traces/logs/errors:
https://www.serverless.com/framework/docs/guides/dashboard/monitoring . Ravion explicitly connects infrastructure,
deploys, failures, logs and metrics in the customer's AWS account: https://www.ravion.com/what-is-ravion . It succeeds
Flightcontrol. Do not call those individual features unique to Stacktape, or claim competitors cannot grow.

## Output and verification

Return a full replacement Markdown page between `=== HOMEPAGE ===` and `=== REVIEW NOTES ===`. After the second marker,
give concise notes: positioning rationale; all roadmap claims with section locations and prerequisites; candidates for
misleading/unsupported claims and checks that could disprove them; omitted roadmap items with reasons. Do not
manufacture measurements, benchmark times, exact real-world bills, case studies, customer quotes, certifications, or
stronger guarantees. Keep supplied testimonials verbatim if used. Clearly label invented screen data as illustrative. Do
not include source dumps or credentials. Aim for 700–1,100 words of visitor-facing copy, with visual descriptions and
editorial notes additional.

This first pass must remain independent. The orchestrator will separately verify claims against sources and make every
complete version available; stylistic agreement will not count as factual verification.
