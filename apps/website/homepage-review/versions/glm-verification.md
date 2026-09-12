**Confirmed findings**

**F1. Git-history secret scanning presented as Phase 1 / "every deploy" capability.**
Locations: §05 explanation ("Every deploy is scanned — dependencies, container images, git history for leaked keys"); §05 bullet 2 ("Dependency, image and secret scanning"); §05 screen ("live API key pattern in git history · web · production"); review note "§05, explanation + bullet 2 … secret scanning … → security roadmap phase 1."
Reader interpretation: leaked-key/git-history scanning ships with the initial per-deploy suite.
Expected: per the orchestrator's primary-source check (session `858dd17f-d0e5-45f8-8f9d-98fdd5ef029e`, revised proposal line 502, superseding the packet summary), Phase 1 covers secret patterns in plaintext configuration; Gitleaks leaked-code/git-history scanning is Phase 2, and the two must not be equated.
Actual: the page bundles history scanning into every-deploy scanning and the note assigns "secret scanning" wholesale to Phase 1 — the note tracks the packet's erroneous grouping rather than the corrected source.
Impact: at a Phase-1-only launch the sentence would be false; the note misstates the prerequisite ordering for launch planning.
Confidence: high.

**F2. Cost attribution stated unconditionally.**
Locations: §07 explanation ("actual costs per project, stage and resource, straight from your AWS bill") and bullet 1.
Interpretation: every dollar is attributed, directly and currently.
Expected: packet (`managing-costs/*`): costs "by stack/project, stage and resource **where attributed**"; AWS reports lag; shared/unattributed costs exist.
Actual: unconditional attribution; "straight from" adds directness the packet does not support.
Impact: the CTO persona evaluating cost governance would expect complete, current attribution that the product cannot deliver.
Confidence: high.

**F3. Review note overstates CLI evidence-handoff status.**
Location: review notes, "§06, bullet 2: … agent/CLI handoff → batch 2 (source-implemented)" — no "release unverified" qualifier (the batch 1 entry carries one).
Expected: orchestrator clarification — incident commands are absent from the public CLI command surface despite incident/evidence code in Console source; packet: source availability is not proof of release.
Actual: unqualified "source-implemented."
Impact: a reviewer could treat CLI handoff as currently available; any incident CLI command later surfaced needs an unshipped label. The page itself shows no incident CLI command, so there is no page-level defect on this correction.
Confidence: high (note text), medium (materiality).

**F4. Canary scope drops "eligible" and the autoscaling prerequisite on the page.**
Location: §03 bullet 2 ("Canary or linear traffic shifting for Lambda and ALB-backed services").
Expected: packet — Lambda and *eligible* ALB-backed container services; autoscaling must be configured. The draft's own note preserves both qualifiers; the page omits them.
Impact: readers with ineligible services or unconfigured autoscaling expect gradual shifting that will not occur.
Confidence: high.

**F5. Incremental-rebuild claim stated absolutely.**
Locations: §02 explanation ("a change to one service rebuilds that service, not the stack") and bullet 2 ("change one service, rebuild one service").
Expected: packet — caches avoid needless rebuilds "where reusable artifacts remain available"; absolutes to be avoided.
Actual: unconditional. Impact: claim fails when reusable artifacts are unavailable.
Confidence: medium.

**F6. "Findings arrive … with a fix attached" (§05 explanation) implies every finding carries a fix.**
Expected: packet — fixed version "where one exists." Actual: universal fix attachment; also blends Phase-2 fix PRs into the Phase-1 scanning sentence. Impact: minor overpromise.
Confidence: medium.

**Unverified concerns (cannot confirm without primary files)**

- **Testimonial verbatim-ness:** the original quotes are not in the supplied materials; wording and attributions (including "Lastmyle," "Receipts") cannot be compared. This required check is left open.
- §02 buildpack language list (TypeScript, Python, Java, Go, Ruby, PHP, .NET) is not enumerated in the packet; confirm against `packaging/*`.
- §03 "warm … EC2 runner, starting from cache": runner cache persistence unverified (self-flagged in notes).
- §02 "artifacts land in your own registry" and §04 probes "run inside your account": not stated in the packet.
- §06 "credentials never leave your account": packet phrasing is "credentials stay where the bundle is composed"; composition location unverified (self-flagged).
- Footer/docs `/security/overview` link and Console "Security" nav: the security section is a proposal; confirm the target exists (the notes acknowledge this addition).
- Hero subheadline "watching, securing, responding, accounting" spans unshipped suites; §05/§06 notes correspond, but the hero is not itself itemized in the roadmap-claims inventory.
- Nav/footer URLs (cal.com booking, status page, socials) unverifiable.

**Contract and boundary checks that passed:** structure intact (nav; hero with required headline and a packet-supported reason for the subheadline change; seven sections in contract order, each with name/explanation/bullets/screen; closing; testimonials; footer; consolidated example-app facts; layout notes). Screen facts carry an explicit illustrative disclaimer. Privacy/init boundaries (local read, user's AI account, files-only option, no source/filenames/config to Stacktape, nothing on AWS before approved deploy), rollback/migration caveats (retained versions; migrations never silently undone), security coverage states, rotation-first secret handling, no exploitability or least-privilege claims, no pricing overreach, cron/heartbeat absent, and Macie/AWS Config absent all match the packet. Roadmap items are otherwise marked with status and prerequisites (bake/rollback as batch 5; APM as batch 6; anomaly/RUM as batch 8; fix PRs and hosted remediation as planned with authority, fallback, and consequence notes).

**Limitation:** no tools or file access in this call. Primary sources (session JSONLs `858dd17f` and `2888f417`, docs repository, Console source, live pricing page) could not be inspected. F1 and F3 rest on the orchestrator's stated primary-source corrections plus the supplied packet; they were verified against the draft text, not independently re-derived from the sessions.