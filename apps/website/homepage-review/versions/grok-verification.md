The full packet was offloaded. I’ll read that file only so the review uses the complete draft and notes, then return findings without any other tool work.The draft continues past the footer. I’ll read the rest of the packet so the review covers every section and the writer’s notes.**One finding survived.** Several other candidates were falsified against the packet, or could not be checked without primary files.

## Surviving finding

**1. Incidents visual shows automatic hosted remediation (plan is button-first)**

- **Where:** Section 06 · Handles incidents · Visual timeline, row `14:08 fix PR #131 opened — you reviewed and merged` (after `14:03 error grouped`, before `14:13 resolved`).
- **Reader takeaway:** After an uptime incident, Stacktape opens a fix PR as the next incident step. Nothing in the window starts that job.
- **Expected:** Observability item 4 is still planned. Default is diagnosis plus a validated fix PR after a human starts it. Automatic triggers come later. Direct deploy only with per-stage opt-in; no autonomous stateful changes. Writer’s notes list “button first, not automatic triggers” and say auto-triggers were omitted on purpose.
- **Actual:** The third bullet says a job *can* open a PR for review (capability, not “automatic”). The five-row timeline has no remediate control. Passive “opened” puts the job in the default incident path. “You reviewed and merged” only covers review/merge, not who started the job.
- **Impact:** The screen advertises the deferred auto-trigger path. A launch reader will treat that sequence as the product. That conflicts with the accepted plan and with the notes.
- **Evidence:** Roadmap item 4 (“button first, automatic triggers later. Still planned”); 06 notes row for the hosted job; omitted-items list (“Hosted AI auto-triggers. Plan is button first. Omitted on purpose.”); visual rows at 14:03 → 14:08 → 14:13.
- **Confidence:** High.

Future-launch copy is allowed where notes mark unshipped work. This is not a generic future-tense flag. The notes claim auto-triggers were left off; the screen still shows them.

## Candidates that did not survive

- **Hero/01 privacy (“on your machine”, “Source is not sent to Stacktape”).** True per the packet. 01 splits agent vs files-only that never calls an AI. The writer dropped “code never leaves your machine.” Residual over-read remains; it is not a false claim.
- **07 “no markup.”** Visual is strong, but the same section states one-member / $100 AWS free tier, then percentage tiers, and links `/pricing`. That is not “no Stacktape fee,” unlimited free team, or all features free.
- **01 private-network diagram vs public-DB default.** 05 shows a staging block because `mainDatabase` would get a public address. The page does not say “safe by default.”
- **03 canary on v42.** Bullet limits shifting to Lambda and eligible load-balanced containers. Worker is Lambda; the bar is illustrative.
- **Unshipped scans, incident engine, evidence bundles, hosted PR, cover `Incidents 0 open`, Security nav.** Present tense, but notes mark status and prerequisites. Allowed for this draft.
- **Testimonials, rollback/migration, exploitability, cron/heartbeat, competitor uniqueness, SBOM/CVE recheck, Phase 2/3 security, APM/status/RUM.** No surviving packet contradiction. 06 uses a `TypeError`, not a migration.

## Unverified (including the two orchestrator checks)

No primary files or public CLI/docs were read in this pass. These are **not** confirmed defects.

| Candidate | What the draft does | Why it is open |
| --- | --- | --- |
| **Incident CLI commands** | 06 bullet: “Copy an evidence bundle for your coding agent, **or the CLI**.” No command name. Notes: source has `incidentHandoff` and “CLI list/ack/resolve”; **not proven public**; needs a public Console/CLI release. | Orchestrator: public CLI has no proposed incident commands, so any such command needs an unshipped label. Packet only has source “CLI handoff,” not a public surface. Cannot confirm `list`/`ack`/`resolve` or whether “or the CLI” must be labeled **Unshipped** rather than “source exists.” |
| **Secret-history scanning phase** | 05 visual: `Secret pattern in git history · rotate, then use $Secret()`. Notes fold Gitleaks into **Phase 1 Unshipped**. | Packet Phase 1 includes “secret patterns/history scanning (Gitleaks).” Orchestrator: history scanning is **Phase 2**. Draft matches the packet, not the correction. Cannot resolve without the security proposal source. |
| **“Eighteen guardrail types”; eight function languages; Nixpacks; Slack/Teams/email/webhook** | Specific shipped-sounding lists not in the packet. | Writer says repo-checked. Not rechecked here. |
| **“Stacktape v4 is out”** | Hero pill, present tense. Not in the unshipped table. | Packet never states v4 is released. |
| **Testimonials verbatim** | Three named quotes. Notes say supplied verbatim. | Original page is not in this packet. |
| **Review CTA `Write stacktape.yml`; Console GitOps for GitLab/Bitbucket** | Writer flags both. | Needs wizard UI and GitOps docs vs Console handlers. |

**Unproven internal note:** example-app “Other: $0.90 (costs screen only)” plus six resources that already sum to $112.90 and six cost bars. Could be a relabel of the $0.90 firewall, or a double count. Total is still $112.90.

## Verification limits

This pass used only the contract, packet, draft, and writer notes. No repo, CLI help, docs, pricing page, original homepage, or session JSONL. Writer claims about languages, guardrail count, GitOps providers, and wizard labels were not rechecked. Orchestrator CLI/phase corrections remain unverified against primary files.
