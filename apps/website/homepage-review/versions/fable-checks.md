# Local verification — Fable

This is the writer's unchanged alternative, produced from the common packet with tools disabled. The connected v42 →
rollback → investigation → v43 story is a useful editorial improvement. Its future features remain subject to the launch
prerequisites in the writer and research notes.

- **02, “a change to one service does not rebuild the others.”** Too broad: Next.js executes its build before comparing
  output artifacts. Artifact reuse does not establish universal build skipping. Evidence:
  `packages/packaging/src/web/nextjs-web.ts`.
- **05, secret storage:** the described behavior applies when a secret is stored and referenced using `$Secret()`. It is
  not an automatic guarantee for arbitrary plaintext values in config. The docs explicitly describe the required
  directive; the proposed secret scanner exists partly to catch values that bypass this workflow.
- **05, “every deploy is scanned.”** The proposed suite has explicit coverage gaps and unsupported/unavailable states.
  Describe supported, configured scans and show gaps. A populated sample coverage row does not establish universal
  coverage. Findings also differ: exposure and fixed-version fields are not applicable to every type of security issue.
- **Closing, “the whole DevOps job.”** Broader than the product and accepted roadmap. Human decisions, migrations and
  stateful recovery remain important work even with the proposed investigation and PR flow.
- **Shared example:** the queue is missing, the generated-resource count is unverified, and the WAF price is below the
  documented base charge. The resource rows already sum to $112.90 before the additional $0.90 shared-cost row, so the
  seven displayed cost bars do not match the total. Use a measured example or remove the figures.
- **07 visual and hero cost KPI:** the proposed rolling 30-day view differs from the existing month-based cost views.
  Show the supported month selection or flag a new cost-view requirement. Evidence:
  `apps/docs/content/managing-costs/dashboards.mdx` and `per-resource-breakdown.mdx`.

The notes put git-history scanning under phase 1 because the first packet grouped it there. The revised proposal puts it
in phase 2. Drift detection, hygiene checks and SBOM export also belong to phase 2, not the phase-3 group in the
omissions list. These corrections do not remove them from the intended future launch.

The hosted investigation's isolation and credential-broker architecture are legitimate planned prerequisites, not
properties established by the current EC2 runner work. The sample migration incident must still involve a person
reviewing and authorizing that stateful change; a code rollback alone does not reverse a migration.

Editorial assessment: Fable improves source-privacy wording, keeps ownership concrete and connects the release screens
well. The account-free invitation arrives below the hero, and the monitoring and security paragraphs remain dense.
Public status pages are included; RUM and SBOM export are left out of the visitor story.
