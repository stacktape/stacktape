Three defects survive falsification against the packet and the orchestrator's corrections. None breaks the future-launch framing. The page names no incident or evidence CLI command, so that candidate did not survive and needs no unshipped label.

## Confirmed findings

**1. Security phase attribution.** The review notes assign secret-history scanning and the fix-PR button to Phase 1.
- Location: review notes roadmap table, the row covering the Section 05 explanation and "05 screen entirely". Affected page text: Section 05 explanation "secrets in code and history", the coverage chip "Secrets · code and history", the finding naming an AWS access key in a commit, and the "Fix PR" button.
- Reader interpretation: a launch reviewer reads that shipping security Phase 1 clears the whole security section.
- Expected: Phase 1 covers secret patterns in plaintext configuration. Gitleaks scanning of leaked code and Git history is Phase 2. Validated fix pull requests are Phase 2.
- Actual: the row lists Phase 1 for the entire screen and names Gitleaks integration as a Phase 1 prerequisite. The bullet-3 row does mark fix PRs as Phase 2, but the screen row does not.
- Impact: the distance to shipping is understated. A Phase 1 launch would advertise repository history scanning and fix PRs that do not exist.
- Prerequisite: Phase 2 delivery of Gitleaks scanning and fix PRs, with runner hardening still ongoing. Authority: the launch gate owner, bound by the security session decision. Fallback: at a Phase 1 launch, narrow the phrase to secrets in configuration, drop the commit finding and remove the button. Consequence: without the fallback, the section claims Phase 2 capability under a Phase 1 label.
- Evidence: the orchestrator's correction from security session 858dd17f, revised proposal at line 502. The packet's Phase 2 bullet on validated fix pull requests.
- Confidence: high.

**2. Cost screen arithmetic.** The seven bars do not add up to the displayed total.
- Location: Section 07 visual and the example-app facts in the final section.
- Reader interpretation: a reader who adds the bars finds they exceed the total on the one section about money. A designer copies the mismatch.

| Item | Amount |
| --- | --- |
| Six resource bars | $112.90 |
| Shared bar | $0.90 |
| Sum of bars | $113.80 |
| Displayed total | $112.90 |

- Expected: bars sum to the total. Actual: the shared bar sits on top of a total the six resources already reach.
- Impact: small, visible credibility defect in the section arguing cost transparency.
- Evidence: the draft's own resource table and its sentence stating the shared cost and the total.
- Confidence: high.

**3. Packaging absolute.** A bullet drops the artifact-availability qualifier.
- Location: Section 02, second what-you-get bullet, "a change to one service does not rebuild the others".
- Reader interpretation: unchanged services are never rebuilt.
- Expected: reuse where reusable artifacts remain available, as the explanation directly above states. Actual: the bullet is unconditional.
- Impact: overpromise when caches are evicted or expire. The packet warns against absolutes on rebuilds.
- Evidence: the packet's packaging bullet on content-aware caches.
- Confidence: medium, because the qualified explanation sits two lines above.

## Unverified concerns

- **Testimonials.** The original page is not in this packet, so verbatim status could not be checked.
- **Hero subheadline.** "Run one command" followed by "deploys it" may read as init deploying. Analysis creates nothing, and deployment needs an account and explicit confirmation. "Reads your project on your machine" may read as source staying local, which holds only for the files-only mode. Section 01 mitigates both.
- **Section 03 explanation.** "Every pull request gets a complete stack" may read as default behaviour. The packet says rules configure pull-request deploys.
- **Section 03 visual.** The "Roll back to v41" button appears during a v43 rollout whose commit message says a migration ran before traffic. Rollback does not reverse migrations. The notes' rollback-safety row should name this button.
- **Section 07 explanation.** "As soon as the forecast says it will" sits against AWS billing lag. The screen's data-through date acknowledges the lag. The sentence does not.
- **Screen and link facts absent from the packet and not flagged in the notes.** The wizard's interactive isometric diagram with zoom and pan, the Console URL scheme and seven-item navigation, the Investigate button, "Made in the EU", the booking link, the status page, the LinkedIn and X handles, the "Using with AI" docs link, and the announcement that v4 is out.
- **Flagged by the notes, unresolved here.** Automatic logs and metrics on deploy, Bitbucket parity, Console-side rollback, the buildpack language list, budget scopes and the shared-cost bucket, probe regions, channel names, the pricing bullet against the live page, and whether init proposes a firewall.
- **Roadmap table fields.** Most rows lack Authority and Fallback. The generic "copy must change" gives a launch reviewer no approved substitute copy for the security section, release gates or hosted remediation. The contract asked only for claims and prerequisites, so this is a gap against the review rubric rather than a breach.

## Limitation

No tools were available in this call. I could not open the referenced docs, the two Claude Code sessions, the memory files, the pricing page, the Console source, or the original page. Findings rest on the packet, the orchestrator's two corrections, the four business documents and the draft's internal consistency.