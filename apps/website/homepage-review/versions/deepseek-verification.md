## Confirmed findings

### 1. Incident CLI commands are presented as shipped; they exist only in the plan

- **Location:** §06 "Handles incidents" → what-you-get bullet 2 (`Copy it for your agent or read it through the CLI: project-scoped API keys and MCP read tools, with mutating commands explicitly confirmed`). Roadmap table lists the same row as "Batch 2 source".
- **Triggering reader interpretation:** a broken production incident can be pulled up in a terminal with the current CLI, and the MCP server exposes incident data. A developer who clicks `init` will believe this before the capability exists.
- **Expected:** incident read/handoff paths shipped alongside the incident engine. **Actual:** `apps/cli/src/commands/` has 64 command dirs and no `incidents` command (the only read surface is `issues-list`). No `incident` string appears as a command anywhere in `apps/cli/src`. The plan itself records the feature as unbuilt: session `2888f417-…`, line 11282 — "CLI `incidents list/get/watch` with `--timeout` … project-scoped API keys; typed in `packages/console-api`; MCP `incidents:list` as readOnly" under "**Batch 2 - Agent handoff**".
- **Impact:** one concrete, cheap-to-check false claim inside the section the page presents as its flagship CTO answer. The orchestration correction is right; the draft's own table under-labels it (it marks API keys as needing release confirmation, not the CLI commands).
- **Confidence:** high (code + primary plan both checked).

### 2. Container tracing is described more favourably than the shipped setup

- **Location:** §04 "Monitors it" → what-you-get bullet 2 (`Tracing when you enable it: Lambda runtimes instrument automatically; containers attach through the OpenTelemetry SDK`).
- **Triggering reader interpretation:** for containers, enabling the switch plus having the OTel SDK in the image is enough for spans to appear.
- **Expected:** the documented pipeline also requires Stacktape to inject a collector sidecar and `OTEL_*` endpoint variables. **Actual:** `observability/tracing.mdx` line 82 — "Stacktape adds an OpenTelemetry collector as an extra container in the task and points every container's OpenTelemetry SDK at it (`http://localhost:4318`) **through standard `OTEL_*` environment variables**. The application needs the OpenTelemetry SDK … **Automatic zero-code instrumentation for containers is planned.**"
- **Impact:** the omission hides a real prerequisite, and the sentence sits directly beside an explicitly-labelled planned item ("broader container tracing"), so a careful reader cannot tell which half is shipped. The page also omits the documented exclusions (e.g. server functions nested inside `nextjs-web` are not instrumented, line 39).
- **Confidence:** high on the missing mechanism; medium on reader harm.

### 3. Wizard total (14) does not reconcile with the six resources shown beside it

- **Location:** §01 "Designs your infrastructure" → Visual bottom row (`14 AWS resources · ~$112 / month`) and §07 table, which lists 6 resources with monthly prices.
- **Triggering reader interpretation:** "14 AWS resources" reads as the count of the six proposals directly above it. No other row, tile, or rail in that visual lists the remaining eight.
- **Expected:** a countable set, or wording that says the count includes generated infrastructure. **Actual:** the count was carried over from the original page (`apps/website/homepage.md` lines 113, 339), so it is not newly invented, but the supplied page also did not reconcile it. No source in the packet establishes 14 for this example app, and "~$112" plus 6 priced rows is the only arithmetic a reader can do. Compare §04, where three totals reconcile exactly (`9.75 + 34.20 + 61.40 + 11.90 + 0.90` = `118.15` minus the `5.25` breakdown gap = `112.90`).
- **Impact:** small, but it is the screen that carries the "you can check the plan" promise; an unreconcilable total undercuts it.
- **Confidence:** medium (the number may be defensible; the readability defect is not).

### Orchestrator correction #2 — does not survive

Secret-history scanning is **Phase 1**, not Phase 2. `858dd17f-…` line 525: "the phase order now reads naturally: **Phase 1** is the reliable-lookup layers (dependencies, images, config rules, **secret patterns**) plus the pages; **Phase 2** closes the loop (fix PRs, deploy blocking…)". Line 502 puts the secrets page at "Phase 1–2". The draft matches the primary source; no change warranted.

## Checked and clean

Recorded so the orchestrator does not re-litigate them: guardrail count (18, `guardrails/overview.mdx` line 28); uptime probes in-account with no per-check subscription fee (line 10), multi-region (line 71); monitoring-silence incidents already shipped (line 75); budgets alert but do not cap, and stack-scoped alerts need matching stacks deployed (`budgets.mdx` lines 10, 34); "no markup" and separate Stacktape fee (`dashboards.mdx` line 83, `pricing.astro` lines 13–14, 34); gradual shifting scoped to Lambda and ALB-backed containers, canary terminology (`gradual-deployments.mdx` lines 5, 25, 47); rollback caveats (`rollbacks.mdx` lines 106–113); init privacy split — files-only sends nothing, agent reads under the user's own AI account, no account needed to get the file, deploy separately confirmed (`cli/init.mdx` lines 12–21, 35–37, 54–59); preview of replacements (`previewing-changes.mdx` lines 82–110); MCP mutating commands need `confirm: true` (`cli/mcp.mdx` line 92); NFT (non-fungible token) and contract preservation — seven sections in the required order, all four fields each, fixed headline, visual descriptions only, no site built; testimonials verbatim against the supplied page (`homepage.md` lines 267–284), including punctuation.

## Unverified concerns

- **Version status.** The page says "Stacktape v4 is out" (hero pill, linking `/blog/stacktape-v4`), but `apps/cli/package.json` reports `4.0.0-dev.0`, a pre-release. The string is carried over verbatim from the supplied page, so it is not this draft's invention, and I could not open the live blog or npm registry to settle it. If v4 is not generally released, "is out" is the page's most load-bearing availability claim.
- **MIT licence.** I found no `LICENSE` file at the repo root or in `package.json`; the trust line's "Open-source CLI (MIT)" rests on the supplied packet, which calls it real. Carried over from the original, not new.
- **"Made in the EU"** (footer bottom row) has no source in the packet or the repo that I found. Carried over from the original page.
- **Primary plans are memory summaries.** `observability-suite-design.md` and `console-security-section-proposal.md` are agent-written memory files; the security file states "implementation not started". The orchestrator should treat session JSONL lines as authoritative for release gating, as the draft's own method section already requests.

## Validation limitations

- The Console UI submodule is private; I could not verify that `/organizations/acme/security`, `/incidents/inc_8f2k`, the five-item nav, or the security/incidents routes exist as drawn. Those screen facts remain unchecked.
- I did not verify any testimonial against its original quote source; fidelity was checked only against the supplied page.
- No claim was checked against a deployed environment or the live website; all evidence is repository files and local session transcripts, read-only.
- I did not exercise `npx stacktape init`, so the init behavioural claims rest on `cli/init.mdx` and the supplied packet.
