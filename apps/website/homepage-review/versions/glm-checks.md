# Local verification — GLM

This is the writer's unchanged alternative. It was generated from the common evidence packet without repository tools.
Future security and observability features are allowed; the following qualifications still matter for that launch.

- **01, “Nothing is sent to Stacktape.”** Anonymous outcome telemetry exists. The narrower statement about source code,
  filenames and config contents is supported. Evidence: `apps/init-ui/src/steps/StartStep.tsx`.
- **02, “change one service, rebuild one service.”** Not universal. Next.js runs its build before comparing individual
  output artifacts for reuse. Evidence: `packages/packaging/src/web/nextjs-web.ts`.
- **05, “Every deploy is scanned” and “with a fix attached.”** The proposed suite explicitly includes incomplete and
  unavailable coverage; some vulnerabilities have no available fix. The same visual shows an unscanned workload. Scope
  this to supported/configured scans, and offer a fix where one is available.
- **06, “credentials never leave your account.”** A redacted evidence bundle does not establish that absolute data-flow
  guarantee. The Console composes handoffs in its service, and the plan requires redaction and scoped access. Describe
  the redacted bundle without promising that all credentials remain within a customer AWS boundary. Evidence:
  `apps/console/api/src/services/incident-handoff.ts` and the accepted hosted-investigation plan.
- **Hero trust line and closing:** “Eject anytime” lacks a demonstrated ejection workflow, and “the whole DevOps job”
  exceeds the described scope. Native AWS resources and an open-source CLI are the supported ownership story.
- **Shared example:** the queue is absent, resource counts are unverified, and the WAF price is below the documented
  base charge. The incident timeline omits approval and execution of the missing migration before recovery. A fake
  advisory should use a clearly fictional identifier in the screen itself, rather than a real-looking CVE and package
  version pair whose accuracy is not established.

The writer notes inherit a packet error: git-history scanning belongs to security phase 2, not phase 1. They also group
drift detection, hygiene checks and SBOM export with phase 3, although the revised proposal places them in phase 2. The
complete roadmap inventory in the research notes uses the revised security proposal and later decisions.

The separate verification pass correctly flags that the writer notes overstate the current incident CLI handoff: the
Console evidence service exists, but the current CLI commands are absent. The page itself names no such command.

Two other verifier conclusions need narrowing. A phase-2 feature is allowed in this future-launch page; the error is its
phase label in the notes. The claim that all gradual deployments require autoscaling is also rejected: Lambda's strategy
does not require it, and current container validation checks ALB integration, target compatibility and Service Connect
constraints. The packet's separate sentence about configuring autoscaling should not be turned into a universal
prerequisite for traffic shifting. Evidence: `deployment-and-lifecycle/gradual-deployments.mdx` and
`apps/cli/src/domain/config-manager/utils/multi-container-workloads.ts`.

The verifier also reads “actual costs per project, stage and resource” as a promise that every dollar is attributed
immediately. Those words do not explicitly make that promise. Showing a report date and shared/unattributed costs would
remove the ambiguity; treat this as a useful clarification rather than a confirmed claim of real-time, complete data.

“Estimated price before every deploy” needs a defined launch workflow. The current evidence establishes the init
wizard's estimate; it does not establish that the wizard appears before every CLI or GitOps deployment. Pricing and the
hard-coded green system-status dot also need launch-time verification.

Editorial assessment: this stays close to the original and adds useful boundaries around monitoring, migrations and
budgets. Its technical lists and repeated “whole DevOps job” framing leave less room for a memorable customer story. The
notes dismiss public status pages as irrelevant to the audience's internal workflow; that is an editorial choice, not a
source finding. Agencies also need to communicate service health to clients.
