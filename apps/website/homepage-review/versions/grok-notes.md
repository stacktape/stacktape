This is a draft for review, not authorization to advertise unshipped functionality as available. I had repository access and checked the cited docs plus related source (init, packaging, GitOps, gradual deploys, observability, guardrails, costs, billing, console incident APIs). I did not use other writers' answers.

### Positioning

The reader is a fullstack or backend developer on a 2–10 person team, with a CTO watching over their shoulder. They do not want another PaaS that will run out of AWS primitives, and they do not want to hire DevOps. The page therefore leads with *control on their machine* (init, confirm deploy, review any fix) and *coverage in their AWS account* (mixed containers and functions, CloudFormation/CDK, the rest of the lifecycle).

Individual features here are not claimed as unique. Render, Railway, SST, Serverless Framework, and Ravion already cover some of previews, logs, linked services, or AWS-account operations. The argument is the whole loop — design through the bill — for a team that has to live with AWS, not a comparison chart.

The subheadline changed for a clear reason: the supplied line says the app “runs flawlessly forever after,” which we cannot support, and it hides that reading happens locally. The new line states the actual contract: local read, reviewable file, own account, human in the loop. “Flags security findings” is a future-launch phrase; see below.

The trust line dropped “Eject anytime.” Own account, MIT CLI, and CloudFormation/CDK overrides are the supported facts. There is no tested one-click migration tool.

Visitor-facing product copy is about 900 words; supplied testimonials add about 180.

### Roadmap claims (unshipped or not proven public)

| Claim | Where | Status | Prerequisites |
| --- | --- | --- | --- |
| Hero “flags security findings”; 05 scans of dependencies, images, secret patterns, and config posture; findings with version/exposure/fix | Subheadline; 05 explanation, bullets, visual | **Unshipped.** Scanning suite is a proposal (Trivy, Gitleaks, ~30 posture rules, deployment SBOM). Not implemented in this repo. | Phase 1 implementation; coverage states for missing source, prebuilt images, incomplete tags; runner hardening is separate ongoing work. Do not ship this copy until Phase 1 is released. |
| 05 visual finding rows (`lodash 4.17.20`, git-history secret) | 05 screen | Illustrative only, and it depicts unshipped scanning | Same as above. Never show secret values. |
| 06 unified incident from uptime, synthetics, alarms, production error spikes, unhealthy stacks, expiring certs; group by stack/time/release; threshold paging | 06 explanation and first bullet | **Source exists** (console incident engine, permissions, CLI list/ack/resolve). That is not proof of a public release. | Public Console/CLI release of the engine; configured probes/alarms/issues; production classification; alarm-to-config migration as planned. |
| 06 evidence bundle for agent or CLI; credentials stay at composition | 06 second bullet; `Copy for agent` in the visual | **Source exists** (`incidentHandoff`, correlation gatherer). Not proven public. | Redaction; verification steps; project-scoped API keys and MCP *read* tools if advertised as MCP (this page says agent/CLI, not MCP). |
| 06 hosted job in the customer AWS account opens a fix PR; CLI-only local handoff; no migrations; deploy only if a stage is opted in | 06 third bullet; visual “fix PR #131 — you reviewed and merged” | **Still planned.** Not in the accepted construction batches as a released product. | Isolated job; model without AWS/git credentials; tools scoped to the stack; write-capable git (else local handoff); human review; attempt/spend limits; button first, not automatic triggers; per-stage opt-in for any direct deploy, normally app-code-only. |
| Cover KPI `Incidents 0 open`; Overview nav item `Security` | Hero visual | Depicts the future Console IA | Security section and incident engine in the public Console. |
| Light cross-signal: incident names the release and grouped error | 06 | Part of the unified engine (source / not proven public) | Same as the incident engine. This page does not claim trace→logs pivots, deployment overlays, or incident merge/split. |

### Shipped claims that still need a launch check

These are written as current. A verifier should still try to disprove them.

| Claim | Where | Check that could disprove it |
| --- | --- | --- |
| Init is local; reading starts on click; files-only uses no AI; source not sent to Stacktape; no account needed to analyze; deploy is separate | 01, command hint | `apps/docs/content/cli/init.mdx`, `StartStep.tsx`. Falsify if analysis uploads to Stacktape, starts before the button, or deploys AWS by itself. |
| Agent path uses the user’s Claude Code/Codex account | 01 explanation | Init docs. Falsify if a Stacktape-hosted model reads source. |
| Eight-language function buildpack | 02 | Lambda buildpack docs. Falsify if a listed language is not actually bundled that way. Container buildpack’s first-class list is JS/TS/Python/Java/Go; Ruby/PHP/.NET are via `languageSpecificConfig`, not claimed as equal zero-config for images. |
| Parallel packaging + skip when a reusable artifact remains | 02 | Packaging coordinator/cache. Falsify if skip is only shown when caches were wiped, or if the page had said “never rebuilt twice” (it does not). |
| GitOps EC2 runner in the customer account | 02 | `build-runners.mdx`. Falsify if Console GitOps still uses CodeBuild, or if local CLI deploys are implied to use that runner (they do not). |
| GitHub, GitLab, and Bitbucket push/PR deploys | 03 | Packet + console GitLab/Bitbucket handlers vs docs that still describe Console GitOps as a GitHub App, with GitLab/Bitbucket via CLI in some pages. **Highest-risk shipped claim.** Falsify if GitLab/Bitbucket cannot do PR preview + cleanup without a custom pipeline, and then the bullet must split Console vs CLI. |
| Previews do not copy live production data | 03 | GitOps/preview docs. Falsify if a preview path clones production data by default. |
| Gradual shifting only for Lambda and eligible ALB-backed containers | 03 | `gradual-deployments.mdx`. Falsify if the page implied every service canaries (it does not). The deploy visual’s canary bar is illustrative and would be wrong for `apiService` if that service is not ALB-backed in the generated stack. |
| Rollback does not undo migrations | 03 | `rollbacks.mdx`. |
| Logs/metrics from the account; issues opt-in + redeploy; tracing not universal; uptime/synthetics configured | 04 | Observability docs. Falsify if issues are on by default, if containers are auto-instrumented, or if every deploy creates probes. |
| 18 guardrail types; private DB is a policy, not a universal default; connectTo policies can be broad; `$Secret()` does not rotate a leak | 05 | Guardrails/connecting-resources/secrets docs. Falsify if standard DB resources are always private, or if we had claimed least privilege. |
| Estimate before deploy; AWS CUR attribution; budget is an alert; free plan is 1 member / $100 AWS, then percentage tiers | 07 | Costs docs + `/pricing`. Falsify if the page said unlimited free team, all features free, or a hard spend cap. |
| “No markup on infrastructure” | 07 visual | Means AWS bills AWS usage. Stacktape still charges a separate fee after the free tier. Falsify if read as “Stacktape is free.” |

### Candidates for misleading reading (kept from the page, or avoided)

- **“Source is not sent to Stacktape”** is true and easy to over-hear as “code never leaves the machine.” The explanation mentions the agent vs files-only split. Still the most likely privacy misread. Check: wizard Start step copy.
- **“Write stacktape.yml”** on the Review visual is the file-write step, not deploy. Falsify if the wizard’s primary Review action is still labeled Deploy and that confuses the “nothing created yet” line.
- **Architecture diagram “inside the private network”** shows a *possible* layout, not the unguardrailed default. The 05 blocked-deploy notice exists so we do not repeat “safe by default.”
- **Cover `Incidents 0 open`** will read as a live product surface. Do not use that chrome until the engine is public.
- **06 visual “fix PR #131 opened — you reviewed and merged”** can still be read as the agent merging. The line says *you* reviewed. Hosted PR opening is planned anyway; do not treat the screenshot as a shipped demo.
- **Uptime “no per-check Stacktape fee”** was left off the page. Probes still incur Lambda in the customer account.
- Testimonials are supplied verbatim, including “two days” and “game-changing.” They are customer quotes, not new Stacktape measurements.

### Omitted roadmap items

- **Release health / deployment gates (observability 5).** Planned, and not the same as the canary in 03. Adding it would sound like every production deploy is gated. Revisit when bake windows and rollback-safety gates exist.
- **APM service/operation pages (observability 6).** Deeper than the current trace waterfall. 04 stays at logs, issues, traces, probes.
- **Public status pages (observability 7).** Useful later; private incident evidence must not leak; custom domains later. Wrong first-visit promise for this ICP.
- **Anomaly alarms, RUM/web vitals, broader container tracing, retention knobs (observability 8).** Cost and instrumentation apply; would blur 04’s honest opt-in story.
- **Incident merge/split and trace→log pivots (observability 3 extras).** Too much Console chrome for the homepage.
- **Hosted AI auto-triggers.** Plan is button first. Omitted on purpose.
- **Cron/heartbeat monitoring.** Explicitly cut. Not on the page.
- **Security Phase 1 SBOM + CVE recheck plumbing.** Real Phase 1 work, but the default recheck streams inventory through Stacktape and is not instant for all new CVEs. Too much caveat for one bullet; better on a security docs page.
- **Security Phase 2** (validated fix PRs, rotation follow-through, post-build gates). Overlaps 06’s planned PR; existing pre-build guardrails cannot block on later vulnerability results. Saying “we block vulnerable deploys” today would be false.
- **Security Phase 3** (GuardDuty, Prowler, drift, IAM hygiene, WAF analytics, Inspector/Security Hub, SAST, CIS/FSBP reports). Paid AWS opt-in, not an ICP homepage. Reports would not be a certification. Macie/Config stay excluded.
- **Naming Trivy/Gitleaks/ECR basic scanning** on the page. Implementation detail; ECR basic is a limited existing layer, not the suite.

### Editorial choices vs the supplied page

- Dropped manufactured build times, 15-second runner resume, CodeBuild comparison, “never built twice,” “flawlessly,” “senior DevOps,” “eject anytime,” “safe by default,” least privilege, universal canary, universal auto-instrumentation, and “your code never leaves your machine.”
- Changed the incident from a missing-column / migration failure to an application `TypeError`. Planned remediation must not apply migrations or stateful changes.
- Init visual primary action is writing the config, not Deploy.
- Pricing points at `/pricing` instead of inventing v4 commercial terms.
