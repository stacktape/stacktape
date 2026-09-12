**Process disclosure.** No repository access in this environment; this draft is grounded solely in the supplied evidence packet and roadmap documents. Testimonials kept verbatim. Visitor-facing copy ≈ 1,050 words.

**Positioning rationale.** Two personas drive the copy: the developer who touches the product daily, hates infra rabbit holes, and needs to feel in control with implications explained; and the CTO who must justify the choice across the whole lifecycle, including exit risk. So the page (a) keeps decisions few and defaults visible (§01), (b) explains implications rather than mechanics (rollback won't un-run migrations, budgets alert but don't cap, coverage says what wasn't scanned, diagnoses are labeled hypotheses), and (c) makes "your AWS account, native resources, MIT CLI" the recurring lock-in answer (trust line, §05, §07). Differentiation is framed as lifecycle coverage and evidence-rich incidents in the customer's own account — never as features competitors lack. The subheadline was changed for accuracy: the original implied Stacktape reads the repository itself (reading is local, via the user's agent under the user's AI account) and promised the app "runs flawlessly forever after," which is unsupported; the "keeps you in the loop" promise was kept. Headline, section names, closing line, testimonials, and layout notes are unchanged.

**Roadmap claims on the page — location, source, prerequisites.**

- §03, bullet 2: bake window + automatic rollback on configured failures → observability roadmap batch 5 (planned). Prerequisites: not equivalent to ordinary canary rollout; rollback safety excludes database migrations and external side effects. The gradual shifting itself is existing but limited to Lambda and eligible ALB-backed container services, and autoscaling must be configured for the resource.
- §04, explanation + screen: APM service/operation pages → batch 6 (planned), depth beyond the existing trace explorer.
- §04, screen (`Logs →` affordance): trace-to-logs pivot → batch 3 cross-signal pivots (source-implemented; public-release status unverified).
- §04, bullet 4: anomaly alarms; browser web-vitals/JS errors linked to backend traces → batch 8 (planned). Opt-in; costs and instrumentation apply; no universal-runtime claim made.
- §05, explanation + bullet 2: dependency/lockfile and container scanning, secret scanning with redacted findings and rotation-first guidance, per-deployment SBOM, coverage view → security roadmap phase 1 (proposal; not implemented; existing ECR basic image scanning is the only live layer). Prerequisites: SBOM stored in customer AWS; coverage states must explicitly cover missing source, prebuilt images, incomplete tags, and account-wide findings.
- §05, explanation ("re-checked against your saved inventory, no rebuild needed"): CVE recheck → phase 1. Not stated on page, must be in docs: default recheck mode streams inventory through Stacktape temporarily and persists only findings (strict mode stays in the customer account); detection is not instant.
- §05, bullet 3: validated fix pull requests → phase 2 (not implemented). Fixes are proposed, never applied autonomously; post-build security gates and PR posture checks are not claimed.
- §05, bullet 4: opt-in GuardDuty/account posture with costs shown → phase 3 (not implemented). Paid AWS services require opt-in and cost transparency; any reports are evidence, not certification; SAST conditional on rule licensing; Macie/AWS Config were excluded by decision and must never appear.
- §06, explanation + bullet 1: unified incident engine (grouping by stack/time/release, open/acknowledged/resolved, severity, suppression, release identity) → batch 1 (source-implemented; release unverified). Prerequisite: alarms migrate to config; alert channels, rules and history must remain accessible.
- §06, bullet 2: evidence bundles (errors/frames, git SHA, config diff, infra events; redaction; credentials stay where the bundle is composed) and agent/CLI handoff → batch 2 (source-implemented). Project-scoped API keys; MCP tools are read-only.
- §06, explanation + bullet 3: diagnosis labeled a hypothesis + fix PR; stateful changes never automated → batch 4 (still planned). Prerequisites: write-capable git connection required (CLI-only projects get local handoff); human review by default; direct deployment only on explicit per-stage opt-in and normally app-code-only; never autonomous stateful changes or migrations; attempt and spend limits; button first, automatic triggers later.

**Misleading/unsupported-claim candidates and disproof checks.**

- "Stacktape receives no source, filenames or config" (§01): trace init-wizard network calls; if any telemetry uploads resource counts or paths, narrow to the packet's exact wording. Also confirm AI reading is billed to the user's provider plan, as stated.
- "Warm runner… starting from cache" (§03): verify EC2 runner cache persistence; deliberately no timing figure — do not reintroduce one.
- "Lambda and ALB-backed services" (§03): check the current support matrix; confirm container eligibility and the autoscaling prerequisite; narrow to Lambda if needed.
- "Slow trace pivots straight to its logs" (§04): verify the batch 3 pivot ships in the console, not only in source.
- "New CVEs are re-checked" (§05): verify recheck cadence (never "instant"), the default-mode data flow, and strict-mode availability; document the data flow before launch.
- "Coverage view that says what wasn't scanned" (§05): verify it covers all four packet coverage states.
- "Validated fix pull requests" (§05): verify validation exists; no copy may imply autonomous fixes.
- "Deeper AWS checks… costs shown" (§05): verify opt-in flow and cost display; never imply compliance certification.
- "One incident, not five pings" (§06): verify grouping and that production error groups page only on severity/spike/regression thresholds.
- "Credentials never leave your account" (§06): verify bundle composition location and redaction; MCP is read-only.
- "Straight from your AWS bill · no markup" (§07): verify CUR-derived attribution, lag handling, and labeling of shared/unattributed costs; confirm no reseller markup.
- "Free plan: one member, up to $100/month" (§07): re-check the live pricing page; do not imply all features are free or that there is no Stacktape fee above the free tier; link rather than restate terms.
- "Eject anytime" (trust line, kept verbatim from the original): docs must frame it as native CloudFormation resources in the customer's account, not a tested one-click migration tool.
- All screen numbers ($112.90, 99.98 %, 41 s/58 s, CVE-2026-1044, 214 occurrences): illustrative only; must never be presented as benchmarks, guarantees, or real-customer data.

**Omitted roadmap items and reasons.**

- Public status pages (obs batch 7): serves end-customer communication, not this audience's internal workflow; the public/private projection needs its own careful launch; custom domains not promised.
- Release-health release-comparison UI (batch 5): only the deploy-facing slice (bake/rollback) is on the page; full comparison is docs material.
- Incident merge/split (batch 3) and alarm-migration mechanics (batch 1): UI/migration detail, not homepage claims.
- Configurable retention and operational refinements; broader container/runtime tracing (batch 8): operational depth with cost implications; the page instead states the honest instrumentation split (automatic for supported Lambda runtimes, SDK for containers).
- Secret-rotation automation (sec phase 2): the page promises guidance only; an automation claim would need verified phase-2 scope.
- Phase-3 specifics (Inspector, Security Hub, WAF analytics, drift detection, IAM hygiene, CIS/FSBP mappings, SBOM export, client reports, conditional SAST): collapsed into "deeper AWS checks" to avoid promising unshipped breadth; Macie/AWS Config are excluded by decision and must never appear.
- Runner hardening: prerequisite engineering work, not a user-facing feature; cannot support claims of fully isolated builds or protection from compromised dependencies.
- Cron/heartbeat monitoring: explicitly cut from the roadmap; deliberately absent.
- Local build tests during init, existing-CI invocation, stage configuration detail: real but doc-level flow details; omitted for word budget.

**Corrections vs. the current page (for the verifier).** Removed: "never built twice" absolutism; the ~15-second build-resume figure and CodeBuild comparison; the claim that monitoring is "set up by the deploy itself" (now opt-in, per project — enablement requires a redeploy and log-pattern grouping has coverage limits, doc-level nuances); "databases in a private network" as a default (now guardrail-enforced phrasing); "18 guardrail types" and "no per-check fee"; "roll back to any version" (now "any retained version," with the migrations caveat). Secrets are phrased as references kept out of committed config, with rotation guidance. The incident fix PR is now labeled a hypothesis that a human reviews. Pricing is phrased to match the current public pricing page. Structural deltas: "Security" added to the footer Docs column and to the Console nav in the hero visual; the §05 screen moved from an organization-guardrails URL to a project security page.
