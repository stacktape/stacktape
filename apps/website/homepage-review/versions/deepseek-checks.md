# Local verification — DeepSeek

This is the writer's unchanged alternative. Future features are permitted by the brief; the following issues remain even
with that scope.

- **01, third bullet: “Nothing is sent to Stacktape.”** Too broad. The init wizard records anonymous outcome statistics
  unless disabled. The supported promise concerns source code, filenames and config contents. Evidence:
  `apps/init-ui/src/steps/StartStep.tsx`, outcome-statistics paragraph.
- **04, explanation: “nothing to install” and all data remaining in AWS.** Contradicts the same section's container SDK
  requirement. Incident/issue metadata and findings are stored by the Console; the roadmap does not promise that all
  operational data stays in customer AWS. Evidence: `observability/tracing.mdx`, Console incident store, security
  session line 561.
- **04, third bullet: probes and synthetics grouped under “no per-check fee.”** Uptime has no separate monitoring
  subscription per check; CloudWatch Synthetics bills per run. The combined sentence hides that distinction. Evidence:
  `observability/synthetic-tests.mdx`, Cost; `uptime-checks.mdx`.
- **Closing: “the whole DevOps job.”** Exceeds the stated product/roadmap scope, which explicitly keeps human decisions,
  migrations and stateful recovery outside autonomous remediation.
- **01 and shared example:** the unverified resource count, missing queue and implausible WAF price are inherited from
  the baseline. Labelling data illustrative does not make it a useful AWS example. Use measured figures or remove them;
  `web-application-firewall.mdx` documents the base charge.
- **Writer notes classify the incident CLI as present.** Current incident API contracts and handoff source exist, but
  commands are absent from the CLI refactor. Treat exact CLI availability as a launch prerequisite. The future-launch
  page can retain the intended capability.

The separate model verification pass also made claims that do not survive local checking. Merely omitting
collector-sidecar mechanics from a marketing bullet is not a defect when the setup requirement is clear; its broader
“nothing to install” statement is the actual problem. Its claim that git-history scanning belongs in phase 1 is
contradicted by the full revised proposal at security session line 502: plaintext-config patterns are P1;
repository/history scans are explicitly P2.

Editorial assessment: it covers substantial scope, but dense security bullets and implementation terms weaken the page's
ease of reading. Keep it as an alternative to inspect, not a validated final page.
