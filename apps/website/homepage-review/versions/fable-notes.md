**Source access.** No tools were available in this call, so no repository file was opened. Every claim rests on the evidence packet, the four business documents and the original page. The packet's file references are the verification targets for the orchestrator.

**Positioning rationale.** The page tells one story: the whole DevOps job, done in the customer's own AWS account, with a person deciding at every point that matters. The seven screens share a single afternoon at acme: v42 ships, the gate rolls it back, one incident collects the evidence, PR #131 fixes it, v43 goes out clean, and the cost page shows what the month cost. Developers get fewer decisions and stated implications, such as where source goes, what a budget does and when a PR needs write access. CTOs get lifecycle coverage in section order, plus risk controls: own account, MIT CLI, CloudFormation and CDK escape hatches, guardrails, scanning, human review of anything an AI produced. No feature is called unique. Render, Railway, SST, Serverless and Ravion cover parts of this and Ravion also works inside the customer's AWS account, so the pitch is breadth plus human-in-the-loop, never exclusivity.

**Subheadline change.** The original promised the app "runs flawlessly forever after", an unsupported guarantee, and implied Stacktape itself reads the repository. The new one names the lifecycle the sections cover and keeps the human-in-the-loop promise.

**Roadmap claims on the page.** Nothing on the page is labelled as planned. Every row below must ship, or the copy must change, before launch.

| Where | Claim | Source | Status | Prerequisites |
| --- | --- | --- | --- | --- |
| Hero visual: `Incidents` and `Security` nav items, `Open incidents · 0` KPI; subheadline word "security" | Incident engine and security suite exist in Console | Obs 1; Sec Phase 1 | Obs 1 has source, public release unverified; Sec 1 unimplemented | Ship both or drop the nav items and the word |
| 03 explanation last sentence; 03 bullet 3; 03 screen `verifying · checks · bake` and `v42 · Rolled back · release gate`; 06 screen 14:05 row | Release health and deployment gates with automatic rollback | Obs 5 | Planned | Gate implementation, user-configured checks, the design's rollback-safety rules for releases that ran irreversible hooks. Plain canary rollout does not satisfy this copy |
| 04 explanation "a trace opens its logs, a chart shows the deploy"; 04 screen `Logs for this trace`, `v43` markers | Cross-signal pivots and deployment overlays | Obs 3 | Source, release unverified | Public release |
| 04 bullet 1 "paging only on severity, spike or regression thresholds" | Error-group paging policy | Obs 1 | Source, release unverified | Issues enabled per stack and redeployed |
| 04 bullet 2; 04 screen heading "11 other operations" | APM service and operation pages | Obs 6 | Planned | Depth beyond the current trace explorer |
| 05 explanation "every deploy is scanned…"; 05 screen entirely | Dependency, image, secret and config scanning; coverage states; findings mapped to resource and stage | Sec Phase 1 | Unimplemented | Trivy and Gitleaks integration, posture rules, coverage states for prebuilt images and account-wide findings, runner hardening in progress |
| 05 bullet 2 "scan results that can stop one after the build" | Post-build security gates | Sec Phase 2 | Unimplemented | Real enforcement after the build. Pre-build guardrails cannot deliver this |
| 05 bullet 3 all four clauses | Exposure and fixed version, rotation-first guidance, fix PR, recheck without rebuild | Sec Phase 1 and 2 | Unimplemented | SBOM stored in customer AWS. Default recheck streams inventory through Stacktape temporarily and keeps only findings. The page never says inventory stays inside AWS or that new CVEs are caught instantly; keep it that way |
| 06 explanation first two sentences; 06 bullet 1; 06 bullet 3 severity, acknowledgement, suppression; 06 screen rows 14:02, 14:04, 14:31 and footer line | Unified incident engine | Obs 1 | Source, release unverified | Certificate-expiry source included; alarm channels and rules stay accessible |
| 06 explanation "press one button…"; 06 bullet 2 hosted job; 06 screen rows 14:06 and 14:15; `Investigate` button | Hosted AI remediation | Obs 4 | Planned | Isolated job in customer AWS, model without AWS or git credentials, stack-scoped tools, write-capable git connection for the PR, local handoff for CLI-only projects, attempt and spend limits, human review. Page says "proposed diagnosis" and "for you to review" to match "hypothesis, not root cause". Per-stage direct deployment opt-in is deliberately not mentioned |
| 06 bullet 2 evidence bundle and MCP tools; 06 screen `Copy for agent` | Copy-for-agent bundles, MCP read tools | Obs 2 | Source, release unverified | Redaction; credentials stay local |
| 06 bullet 3 "public status page for the updates you choose to publish" | Public status pages | Obs 7 | Planned | Separate public projection, no private evidence exposed. Custom domains not claimed |

**Claims to check, and how to disprove them.**

- Hero "like a senior DevOps team would": marketing simile carried over. Check that the applied defaults are documented as production-grade; otherwise soften.
- Hero pill: confirm `/blog/stacktape-v4` exists.
- Trust line "Override or extend with CloudFormation or CDK": check overrides and CDK constructs are documented for the resources the wizard proposes.
- 01 "Click Start", "Claude Code or Codex", "plain file scan and no AI": check the wizard offers both modes as user choices, per the init docs and the start step.
- 01 "estimated AWS price", "at AWS list prices": check the estimate is list-price only.
- 01 "firewall" in the wizard list and the example app: check init proposes a WAF for a public web app.
- 01 "No account needed until you deploy": check analysis and config generation need no login. Note the wizard, not the homepage, should state that AI use may cost money on the user's own plan and that optional local build tests download dependencies.
- 02 "the common languages": replace with the documented buildpack list before publishing. "another buildpack": confirm which. "images land in a registry there": confirm ECR in the customer account.
- 02 "reused… while its last artifact is still around": confirm cache retention semantics.
- 03 "GitHub, GitLab or Bitbucket": confirm Bitbucket has push and PR deploy parity.
- 03 "eligible load-balanced container services": confirm eligibility matches ALB-backed services only.
- 03 "any retained release": confirm how many artifacts are retained; the page does not say rollback undoes migrations, and docs should say it does not.
- 03 screen `Roll back to v41` button: confirm the Console offers rollback, not only the CLI.
- 04 "Logs and infrastructure metrics arrive with the deploy": confirm these two are automatic, since the packet says not everything is.
- 04 "supported Lambda runtimes automatically", "containers through the SDK": confirm the excluded runtimes and deployment modes are listed in docs.
- 04 "no separate monitoring vendor": disproved if any signal requires a third-party account.
- 04 screen region names and uptime figure: illustrative; confirm regions are configurable and drop any region the product cannot probe from.
- 05 "private networking included", "network access… from one line of config": confirm connection semantics; the page makes no least-privilege claim because some service policies are broad.
- 05 "private databases, backups or approved regions": confirm the guardrail catalogue. No rule count is shown on purpose.
- 05 screen guardrail notice: confirm a private-database rule produces a pre-deploy block with a message like this.
- 06 "certificate nears expiry": in Obs 1 scope; confirm it survives implementation.
- 06 "your team's channels", screen `#alerts`: channel list is not in the packet. Confirm Slack before keeping a Slack-style channel name.
- 06 "no AWS or git credentials in the model's hands": true only if the PR is opened by a broker outside the model's tools. Verify at implementation.
- 07 "derived from your AWS bill", "shared costs shown as shared", "one stack or the whole organization", "forecast": confirm Cost and Usage Report basis, an unattributed bucket in the UI, budget scopes and forecast alerts.
- 07 pricing bullet: confirm against the live pricing page, including how "AWS spend" is measured.
- Wizard port `4242`, file count `41`, all latencies, percentages, commits and timestamps: illustrative, labelled under every window.

**Removed from the original and why.** "Your code never leaves your machine" contradicted the AI-provider flow. The fifteen-second runner resume and the CodeBuild comparison were barred. "Never built twice" and "eight languages" were unsupported absolutes. "Hot-swap in seconds", "autocompletion in your editor", "no per-check fee", "eighteen guardrail types", "one role you can revoke" and "Never per seat" have no packet support. "Databases in a private network" by default became a guardrail, since defaults are not universally private. "Eject anytime" became "Standard AWS resources you own" to avoid implying a migration tool. "Automatic rollback if errors rise" moved to the gated-release claim so it is clearly tied to Obs 5.

**Omitted roadmap items.** Cron and heartbeat monitoring: cut by decision. Obs 8, anomaly alarms, RUM, web vitals, broader container tracing and retention controls: furthest out, and RUM adds cost and instrumentation caveats the page cannot carry. Obs 1 alarm-to-config migration and Obs 3 incident merge or split: internal detail. Obs 7 custom domains: later. Security Phase 3 in full, GuardDuty, Prowler, drift detection, IAM hygiene, WAF analytics, Inspector, Security Hub, SAST, CIS and FSBP mappings, client reports and SBOM export: paid opt-in AWS services, licensing-conditional SAST and evidence-not-certification framing belong on a security page with cost disclosure, not the homepage. ECR basic scanning: subsumed by the image-scanning claim. Hosted remediation direct deployment: opt-in only and easy to misread as autonomous, so left out.

**Design additions.** A `Sample project · illustrative data` caption under every window. The Console nav grows to seven items. No new footer links, because no docs exist yet for the planned suites. The terminal title uses middle dots instead of a dash.

**Word count.** Hero, seven sections and closing total roughly 900 words. The verbatim testimonials add about 170.

**Summary for the orchestrator.** The page is a full replacement with the required structure, one shared example-app storyline and no planned-feature labels in the copy. Twelve rows of roadmap-dependent claims are listed above with prerequisites, the most exposed being the release gates, the entire security section and the hosted remediation button. The removal list explains every departure from the original. Verification against the referenced docs is still required for the checks listed, and nothing here authorizes advertising unshipped features.
