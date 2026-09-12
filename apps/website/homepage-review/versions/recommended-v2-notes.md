# Recommended v2 — revision notes

This version follows the user's feedback on the first recommendation. It remains a future-launch draft.

- Restored the original headline and subheadline verbatim.
- Removed the entire command hint and the introduction before section 01, including its heading.
- Preserved section 01 verbatim, including its bullets and visual description.
- Rewrote 02–07 around the original responsibilities: Packages it, Deploys it, Monitors it, Secures it, Handles
  incidents, Tracks costs. Each explanation describes the work Stacktape handles; the examples support that description.
- Kept the previous recommendation as a separate version. The six external drafts and their reports belong to the first
  round; they were not rerun or presented as reviews of this revision.

## Copy direction

Packaging leads with the built-in build process. Deployment covers the release workflow rather than centering the
section on PR previews. Monitoring presents logs, metrics, errors, traces and availability together. Security combines
permissions, secret references and guardrails with scanning. Incidents connect alerts, evidence, investigation and a
reviewable fix. Costs return to the monthly breakdown and budget alerts.

The headline and subheadline are the user's fixed copy. In particular, “runs flawlessly forever after” is retained as
requested; this revision does not establish an availability guarantee. The operational descriptions and examples retain
the product boundaries below.

## Launch prerequisites and source checks

The full source register and observability/security inventories remain in the research notes. The relevant conditions
for this revision are:

| Section | Claim                                                                       | Required scope or prerequisite                                                                                                                                                                                            |
| ------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01      | Generated setup, explained choices and estimates                            | Existing init docs and wizard source. Estimated prices are not fixed bills; configured networking, recovery and scaling are choices.                                                                                      |
| 02      | Built-in builds, caching, artifact reuse and customer-account hosted builds | Existing packaging and build-runner docs. Reuse depends on usable artifacts; Next.js still executes its build before comparing outputs. No claim that unchanged services never rebuild.                                   |
| 03      | Git deployments and independent PR environments                             | Deployment rules and cleanup configured; previews use their own resources and test data.                                                                                                                                  |
| 03      | Gradual rollout, verification and automatic rollback                        | Existing Lambda/eligible ALB-container strategies plus planned observability batch 5. Requires configured gates and rollback-safety handling; migrations and side effects are not reversed automatically.                 |
| 04      | Logs, metrics, grouped errors, traces and checks                            | Current source with opt-in/configuration and runtime coverage limits. Containers need instrumentation; the copy does not claim automatic installation of every signal.                                                    |
| 04      | Service performance views and browser-to-backend links                      | Planned APM batch 6 and browser monitoring batch 8; supported instrumentation and correlation required.                                                                                                                   |
| 04      | Public status page                                                          | Planned batch 7; separate public data projection and approved updates. No automatic publication of private incident evidence.                                                                                             |
| 05      | Permissions, secret references and guardrails                               | Existing resource connection, secrets and guardrail docs. Not universal least-privilege IAM or private databases by default. Secret references must be used; exposed credentials need rotation.                           |
| 05      | Dependency/image scans, SBOM and new-vulnerability rechecks                 | Security phase 1 proposal. Requires scanner coverage, deployment identity and reliable rechecks. SBOMs are stored in customer AWS; default rechecks may stream them through Stacktape temporarily.                        |
| 05      | Git-history secrets, post-build gates and fix PRs                           | Security phase 2 proposal. Real post-build enforcement, write-capable git connection and validated fixes required. Fixes are offered where available.                                                                     |
| 06      | Unified incidents and evidence handoff                                      | Current incident/evidence source, with source availability distinct from public release. The planned public agent/MCP surface must be verified before launch; no exact incident CLI command is advertised.                |
| 06      | Built-in investigation and fix PR                                           | Planned observability batch 4. Scoped isolated execution, appropriate git access, validated patches, attempt/spend limits and human review. Diagnosis is a proposal, not proven cause solely because a model produced it. |
| 07      | Costs, estimates and budget alerts                                          | Existing cost docs. Reports can lag; shared/unattributed costs exist. A budget is an alert, not a cap. Confirm the free plan's launch terms.                                                                              |

Visuals use the same fictional application and release identities throughout. The deployment is still being observed;
the worker rejects an incompatible queue message from v42; a proposed fix restores compatibility. No measured prices,
build times, real vulnerability identifiers or new customer claims were added.
