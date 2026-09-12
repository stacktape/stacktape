**Status.** Draft for review. This page is written as a future launch, so sections 04, 05 and 06 describe capabilities that are *not all shipped*. Nothing here authorizes advertising them as available. Visitor-facing copy is roughly 1,050 words, excluding Visual blocks, section 7 facts and these notes.

## Positioning rationale

- **The page is the init wizard, expanded.** The hero, section 01 and the trust line all answer the two objections an init click raises: "will this touch my AWS account?" (no — reading and the file happen locally, deploy is a separate confirmed step) and "will I still understand my own infrastructure?" (one typed file, a reason per resource, an estimate that moves with the choice).
- **Developers get the daily loop; CTOs get the long-term loop.** Sections 01–03 are the developer's afternoon (design, package, deploy with previews, rollback, local dev). Sections 04–07 answer the CTO's questions in their own order: what happens at 3 a.m., who can change production, what does it cost, and what stops it.
- **Implications are stated, not hidden.** Rollback does not reverse migrations. Budgets warn but do not cap. Error grouping needs a redeploy. Exposure is not exploitability. These are the facts that make the rest credible, and they match the personas requirement to explain consequences of a choice.
- **Subheadline changed, with reason.** The original promised the app "runs flawlessly forever after." That is an absolute guarantee no product can keep, and it hides the machine-readable local-read step that init actually performs. The replacement keeps the promise but makes it checkable.
- **The future version's spine is "you stay the one who decides."** The added capability is not autonomy; it is evidence (one incident, one bundle), suggestion (a pull request), and consent (per-stage opt-in, explicit confirmation). That is the honest framing for an audience with no DevOps team.

## Roadmap claims in the page, with prerequisites

Everything below is **unshipped or partly shipped**. "Source" means implementation exists in the repository or per the supplied plan; it is not a release commitment.

| Claim (as written on the page) | Location | Status | Prerequisite before publishing |
| --- | --- | --- | --- |
| Unified incident from uptime, synthetic, alarm, error-spike, monitoring-silence, unhealthy stack and expiring-certificate signals; grouped by stack/time/release; open/acknowledged/resolved; severity and suppression | §06 explanation, §06 visual | Batches 1–3 have source | Monitoring enabled; alarm rules migrated to config; alert channels and notification rules configured; production error groups page only on severity/spike/regression thresholds |
| Evidence bundle: errors/frames, git SHA, config diff, infrastructure events, probe/canary results, redaction, verification steps | §06 bullet 1 | Batch 2 source | Signal data present for that stack; redaction verified before any bundle leaves the account |
| Project-scoped API keys and MCP read tools; mutating commands explicitly confirmed | §06 bullet 2, §02 trust line is unaffected | MCP exists in-repo (4 tools, `confirm: true` for mutations); project-scoped API keys need release confirmation | API key issuance; MCP client configured; read-tool scope audited before claiming read-only |
| Hosted AI remediation: isolated job in the customer AWS account, model without AWS/git credentials, tools scoped to the stack, fix PR by default, human review, attempt and spend limits | §06 bullet 3 | **Planned only** | Write-capable git connection; per-stage opt-in; CLI-only projects fall back to local handoff. Forbidden until then: direct deployment, autonomous stateful changes, migrations |
| Release health, bake window after deploy, deployment gates with rollback safety | §03 explanation ("preview what they will replace" only), §06 omitted | **Planned only** | Release comparison and configured failure criteria; ordinary canary rollout is not equivalent to a gate |
| APM service/operation pages: request rate, error rate, latency percentiles, top operations, facets, pagination | §04 explanation, §04 bullet 4 | **Planned depth** beyond the existing trace explorer | Existing trace data; no new instrumentation claim |
| Opt-in anomaly alarms, browser RUM/web vitals/JS errors linked to backend traces, broader container/runtime tracing, configurable retention | §04 bullet 4 | **Planned** | Instrumentation plus paid AWS services; disclose cost at opt-in |
| Public status pages with a separate public projection; custom domains later | §06 bullet 4 | **Planned** | Private incident evidence must never be exposed; custom domains deferred |
| Cross-signal pivots (trace→logs, incident→telemetry, deployment overlays) and incident merge/split | §06 implicit | Batch 3 source; UI detail omitted from the page | Telemetry present for the stack |
| Security home: dependency/lockfile, container OS/package (Trivy), secret/history (Gitleaks) scanning; redacted findings; rotation-first guidance; per-release SBOM in customer AWS; ~30 config posture rules with coverage states | §05 bullet 2 and 3 | **Not implemented** (proposal) | Scanning pipeline built; ECR basic image scanning remains the only shipped layer; missing source, prebuilt images, incomplete tags and account-wide findings need explicit coverage states |
| Vulnerability rechecks against saved inventories without rebuilding | §05 bullet 3 (SBOM stored in customer AWS) | Proposed | Default mode streams inventory through Stacktape temporarily and persists only findings; strict mode runs rechecks in the customer account. Do not claim all inventory stays in AWS under the default mode, or instant detection of every new CVE |
| Validated fix PRs for dependencies/base images/posture; secret rotation follow-through; post-build security gates and PR posture checks | §05 bullet 3 | **Phase 2 proposal** | Post-build results must exist first; pre-build guardrails alone cannot block on later vulnerability results |
| Opt-in AWS-native depth: GuardDuty runtime monitoring, Prowler account posture, drift, IAM hygiene, WAF traffic analytics, optional Inspector/Security Hub | §05 bullet 3 | **Phase 3 proposal** | Each is a paid AWS service, opt-in, with cost shown; reports are evidence, not certification; SAST held back on rule licensing |
| Eighteen guardrail types enforced pre-deploy | §05 bullet 1 | **Shipped** | Verified in `apps/docs/content/guardrails/overview.mdx` (line 28) |
| Budget alerts on actual and forecast spend, not a cap | §07 bullet 2 | **Shipped** | Verified in `managing-costs/budgets.mdx`; stack-scoped alerts additionally need matching stacks deployed since the alert was created |
| Free plan: one member, up to $100/month managed AWS spend, then tiers; billed on AWS costs, not seats | §07 bullet 3 | **Shipped (current public pricing)** | Verified in `apps/website/src/pages/pricing.astro` (lines 13–14, 34); re-check before launch rather than inventing v4 commercial terms |

## Candidates for misleading or unsupported claims, and checks that could disprove them

| Candidate | Risk | Check | Outcome |
| --- | --- | --- | --- |
| "Runs flawlessly forever after" (original subheadline) | Absolute uptime guarantee | Any incident, any outage | **Removed**; subheadline rewritten |
| "Resumes in about fifteen seconds" / cold-CodeBuild comparison (original §03) | Unverifiable benchmark plus competitor sales comparison | EC2 runner docs, timing measurements | **Removed**; runner described without a time or a competitor |
| "Unchanged code is never built twice" (original §02) | Absolute; checksum-skip is documented only for the Lambda buildpack | `packaging/overview.mdx` line 108, line 138 | **Softened** to "reuses artifacts while the inputs stay unchanged" |
| Terminal durations `41 s`, `58 s` (original visual) | Fabricated measurements | None available | **Removed**; rows show state only |
| "Your code never leaves your machine" (original §01) | False when an agent is selected — source goes to the user's AI provider | `cli/init.mdx` lines 19–20, 208–210 | **Corrected**: nothing to Stacktape; agent reads under the user's AI account |
| "Eject anytime" (original trust line) | Implies a tested migration tool | No tested one-click eject exists | **Replaced** with native CloudFormation, overrides and CDK constructs |
| "Safe by default: databases in a private network" (original §05) | Standard database defaults are not universally private | `guardrails/databases.mdx`, resource defaults | **Rephrased** as configured protection and organization policy |
| "Zero-downtime deploys" as a universal property (original §03) | Gradual shifting covers Lambda and ALB-backed container services only; adds deploy time; ALB costs extra | `deployment-and-lifecycle/gradual-deployments.mdx` lines 25–27, 292 | **Scoped** to Lambda and load-balanced containers; timing and ALB cost left to docs |
| "No per-check fee" for uptime probes | Would be unsupported if probes were billed | `observability/uptime-checks.mdx` line 10 | **Kept**; docs state probes run in-account with no per-check subscription fee |
| "Monitoring silence" as an incident trigger | Silent-failure alerting exists only at the probe level today | `uptime-checks.mdx` line 82 vs. the unified engine plan | **Kept but listed as unshipped** in the table above |
| MCP "read tools" only | `stacktape_cli` can run mutating commands | `cli/mcp.mdx` lines 92–94 | **Kept with the confirmation requirement stated**; read-only scope still to be audited at launch |
| "$112.90" total and per-resource prices | Reads as a real bill | None — invented | **Labelled illustrative** in §3 preamble, §7 and the hero Visual |
| Testimonials | Supplied by the client, not independently verified | Source of each quote | **Kept verbatim**, unchanged from the original page |

## Omitted roadmap items, with reasons

- **Cron/heartbeat monitoring** — explicitly cut; not an accepted feature.
- **Macie and AWS Config** — deliberately excluded from the security plan.
- **SAST** — Phase 3 and conditional on viable rule licensing; too speculative for a homepage.
- **CIS/FSBP mappings, client reports, SBOM export** — compliance-adjacent artifacts whose homepage presence invites a certification reading the page must not make; deferred to docs.
- **Incident merge/split and cross-signal pivots** — real plan, but UI mechanics, not a reason to click init; kept out to protect the word budget.
- **Custom domains on status pages** — explicitly "later"; a footnote at best.
- **`dev --agent` structured logs/status/debug tools, CI providers beyond the supported three, native CloudFormation/CDK detail, secret-set CLI** — all shipped and useful, but the page already carries eleven product surfaces; these belong in docs and in the "How it works" deep dive.
- **Priority reasoning:** the biggest additions are the ones that change a buying decision for a 5–50 person company with no DevOps team — one incident instead of five alerts (§06), service-level latency and error views a developer checks daily (§04), and honest security coverage states a CTO can defend (§05). Depth items (RUM, anomaly alarms, retention, merge/split, compliance exports) were compressed into single clauses or dropped so the page stays scannable and under the word ceiling.

## Method and limits

- **Verified against repository source (read-only):** `apps/docs/content/guardrails/overview.mdx`, `apps/docs/content/cli/init.mdx`, `apps/website/src/pages/pricing.astro`, `apps/docs/content/packaging/overview.mdx`, `apps/docs/content/observability/{issues,uptime-checks,tracing,overview}.mdx`, `apps/docs/content/managing-costs/budgets.mdx`, `apps/docs/content/cli/mcp.mdx`, `apps/docs/content/deployment-and-lifecycle/{rollbacks,gradual-deployments}.mdx`. Five original-page claims did not survive this pass and were removed or rephrased.
- **Not verified:** all roadmap items, since the only sources are the supplied plan summaries. Every one is marked unshipped above; none should ship without a release check.
- **Independent by construction:** I did not read any other writer's version of this page. The orchestrator should still falsify the roadmap table against the primary session records (`2888f417…` line 11282, `858dd17f…` lines 502/525/561) before treating it as complete.
