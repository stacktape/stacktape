### 1. Positioning Rationale & Target Audience Alignment

This draft represents an editorial, future-launch revision of the Stacktape homepage. It balances two distinct buyer and user personas identified in the business source documents (`01-ideal-customer-profile.md`, `02-personas-we-design-product-for.md`, `03-messaging.md`, and `04-product-design-philosophy.md`):

1. **Developers (Persona 1 - Primary Daily User):** Fullstack and backend developers in early-stage startups and boutique agencies (5–50 employees, 2–10 developers) who do not have an internal DevOps or SRE team. They need infrastructure simplicity, zero configuration where possible, fast feedback loops, and sensible defaults so they never feel stranded by obscure AWS primitives. They interact with the tooling repeatedly throughout the day.
2. **CTOs and Engineering Managers (Persona 2 - Economic Buyer & Risk Evaluator):** Leaders who evaluate long-term fit, software development lifecycle (SDLC) integration, cloud governance, security compliance, and vendor lock-in. They need to know that choosing Stacktape does not box them into a proprietary black box, that their workloads run inside their own AWS accounts, and that native CloudFormation/CDK escape hatches exist if custom requirements emerge.

#### Subheadline Modification Rationale
- **Original Subheadline:**
  > "Stacktape reads your repository, designs the infrastructure like a senior DevOps team would, deploys it to your own AWS account and makes sure your app runs flawlessly forever after. It keeps you in the loop for any decision that requires human attention."
- **Revised Subheadline:**
  > "Stacktape inspects your application, configures production-grade AWS infrastructure with sensible defaults, deploys directly to your own AWS account, and safeguards health and security across the entire software lifecycle. You stay in complete control of every architectural decision, with zero vendor lock-in."
- **Reason for Change:**
  - The claim that Stacktape *"makes sure your app runs flawlessly forever after"* is an absolute, scientifically indefensible marketing exaggeration. Technical buyers (especially CTOs) recognize that outages, network partitions, application bugs, and cloud provider failures are inevitable. Promising perpetual flawless execution undermines technical credibility.
  - The revision articulates the full lifecycle scope (design, deploy, observability, security posture, and incident handling) while grounding the value proposition in developer control, sensible defaults, and zero vendor lock-in.

#### Competitive Context & Differentiation
- **Versus Traditional PaaS (e.g., Render, Railway):** Rather than hosting apps on a proprietary multi-tenant cloud where teams inevitably hit scalability, compliance, VPC peering, or cost barriers, Stacktape provisions native resources inside the customer's own AWS account.
- **Versus Infrastructure Frameworks (e.g., SST, Serverless Framework):** Stacktape provides a unified single-file declarative experience paired with an end-to-end operational suite (local browser wizard, buildpack packaging on dedicated EC2 runners, integrated guardrails, multi-region synthetic uptime probes, and AI-assisted triage).
- **Versus AWS-Native Deployment Wrappers (e.g., Ravion / formerly Flightcontrol):** Stacktape differentiates through its local-first initial analysis (which requires no cloud account just to inspect and estimate costs), integrated organizational guardrails, and deep AI/MCP diagnostic workflows.
- The copy intentionally highlights these structural advantages without naming or disparaging competitors.

---

### 2. Inventory of Roadmap Claims, Locations, and Technical Prerequisites

All planned and future capabilities are incorporated into this editorial draft as specified in the observability (`2888f417-b796-4b93-b188-ca9b9ee94860`) and security (`858dd17f-d0e5-45f8-8f9d-98fdd5ef029e`) roadmaps. None of these claims may be published as generally available until their respective prerequisites are deployed and verified.

| Section | Planned Feature Claim | Technical Prerequisites & Dependencies |
| :--- | :--- | :--- |
| **Hero** | Announcement pill highlighting automated security scanning, unified incidents, and AI remediation. | Completion and deployment of Security Phase 1–2 and Observability Batches 1–4. |
| **Hero (Visual)** | KPI tile showing `Vulnerabilities 0 critical` and nav item `Security`. | Console UI implementation of Security section and aggregated vulnerability metrics. |
| **03 · Deploys it** | Automated release health bake gates and post-deployment rollback verification. | Observability Roadmap Batch 5 (release comparison engine, bake window observer, and automated rollback triggering). |
| **05 · Secures it** | Continuous vulnerability and secret scanning (Trivy container/dependency scans, Gitleaks pattern detection). | Security Roadmap Phase 1 (integration of Trivy and Gitleaks into build pipeline and CLI/console). |
| **05 · Secures it** | Customer-stored deployment SBOMs with continuous CVE rechecking without rebuilds. | Security Roadmap Phase 1 (SBOM generation stored in customer's S3 bucket; streaming inventory recheck mechanism). |
| **05 · Secures it** | Post-build security deployment gates blocking vulnerable images or secret leaks. | Security Roadmap Phase 2 (pipeline gating engine based on scan findings). |
| **05 · Secures it (Visual)** | Console visual displaying SBOM recheck status and security posture rules. | Implementation of Console Security view and rule evaluator. |
| **06 · Handles incidents** | Unified incident engine correlating alarms, error groups, synthetics, and deploys. | Observability Roadmap Batches 1–3 (unified incident engine consolidating multi-signal telemetry). |
| **06 · Handles incidents** | Redacted CLI and MCP evidence bundles for local coding agents. | Observability Roadmap Batch 2 (CLI/MCP bundle generation with local credential redaction). |
| **06 · Handles incidents** | Hosted AI triage generating validated fix PRs in customer AWS. | Observability Roadmap Batch 4 (isolated runner in customer AWS, git write credentials, scoped tools, model execution). |
| **06 · Handles incidents (Visual)**| Incident timeline displaying agent triage fix PR #131. | Hosted triage job pipeline integrated into GitHub/GitLab pull request workflows. |

---

### 3. Candidates for Misleading or Unsupported Claims & Verification Checks

To maintain rigorous factual integrity, the following claims must be verified against current and future releases before publication:

1. **Claim: "Your source code and configs are never sent to Stacktape during initialization."**
   - *Risk of Misleading:* If users invoke AI-assisted scanning during `npx stacktape init`, code is transmitted to their configured AI provider (e.g., Anthropic Claude Code, OpenAI Codex).
   - *Safe Copy Defense:* The copy specifies that inspection runs locally and that code is never sent *to Stacktape*.
   - *Verification Check:* Inspect CLI network traffic and proxy logs during `npx stacktape init` with AI enabled. Verify that zero source payloads, file paths, or configuration contents are posted to `api.stacktape.com` or Stacktape-controlled endpoints.
2. **Claim: "Content-hashed build caching: only modified services rebuild."**
   - *Risk of Misleading:* Claiming that code is "never rebuilt twice" is inaccurate because cache purges, dependency updates, and runner cycling can force rebuilds.
   - *Safe Copy Defense:* Phrased as content-addressed caching that avoids rebuilding unchanged workloads.
   - *Verification Check:* Benchmark multiple consecutive deploys across mono-repositories. Confirm that unmodified Lambda packages and container stages register cache hits and skip build steps.
3. **Claim: "Eject anytime / zero vendor lock-in."**
   - *Risk of Misleading:* Buyers might assume there is an automated, one-click migration wizard that converts Stacktape stacks into standalone Terraform or CDK codebases.
   - *Safe Copy Defense:* Copy specifies open-source MIT CLI, standard AWS CloudFormation output, and CDK construct escape hatches.
   - *Verification Check:* Validate that CloudFormation templates generated by Stacktape can be exported and managed independently via AWS CLI/SDK without requiring the Stacktape control plane.
4. **Claim: "Configurable canary and linear traffic shifting."**
   - *Risk of Misleading:* Users might expect traffic shifting to apply universally to all compute types.
   - *Safe Copy Defense:* Copy explicitly constrains traffic shifting to "Lambda and ALB container services."
   - *Verification Check:* Verify CloudFormation configurations for ECS/Fargate services behind Application Load Balancers and CodeDeploy configurations for Lambda aliases.
5. **Claim: "Continuous SBOM CVE rechecking without rebuilding."**
   - *Risk of Misleading:* Users might believe all inventory data remains 100% inside AWS at all times under the default tier.
   - *Safe Copy Defense:* Copy notes customer-stored SBOMs and avoids promising zero data egress during default streaming checks.
   - *Verification Check:* In default mode, confirm that inventory streaming does not persist customer metadata on Stacktape servers; in strict mode, confirm that execution runs entirely within customer VPC/EC2.
6. **Claim: "Hosted AI triage generating validated pull requests."**
   - *Risk of Misleading:* Users might expect autonomous code deployment without human supervision.
   - *Safe Copy Defense:* Copy explicitly specifies "mandatory human review" and pull request generation, noting that diagnoses are hypotheses.
   - *Verification Check:* Confirm that the hosted AI remediation engine cannot push directly to production branches unless an explicit, dangerous stage override is configured, and that stateful database migrations are strictly excluded from AI remediation scopes.
7. **Claim: "Granular cost attribution per resource derived from native AWS billing data."**
   - *Risk of Misleading:* AWS Cost and Usage Reports (CUR) suffer from data delivery latency (up to 24 hours) and contain shared/unattributed costs (e.g., data transfer, NAT gateway baseline costs).
   - *Safe Copy Defense:* Frame budgets as threshold and forecast alerts rather than real-time hard spending caps.
   - *Verification Check:* Ensure the UI and documentation clearly disclose AWS CUR reporting latency and unattributed cost categories.

---

### 4. Omitted Roadmap Items and Prioritization Rationale

Several items from the internal engineering and product roadmaps were intentionally excluded or deprioritized from the homepage copy:

- **Cron / Heartbeat Monitoring:** Explicitly cut from the accepted observability roadmap plan (Claude Code session `2888f417-b796-4b93-b188-ca9b9ee94860`, line 11064/11282). Excluded completely from the copy to avoid advertising dead scope.
- **Autonomous Auto-Deployment of AI Fixes:** The roadmap allows for explicit per-stage opt-in for direct code-only hotfixes, but promoting autonomous production modifications on the homepage would alarm CTOs and senior developers. The narrative strictly emphasizes human PR review.
- **Browser Real User Monitoring (RUM) & Frontend Web Vitals:** Slated for late Batch 8 of the observability roadmap. Omitted from the main narrative to maintain focus on core backend/cloud infrastructure where early-stage startups face the greatest operational hurdles.
- **Advanced Compliance Frameworks (CIS Benchmarks, FSBP, SOC2 Client Reports):** Slated for Security Phase 3. Omitted because early-stage startups and small agencies require pragmatic vulnerability and secret hygiene before enterprise compliance mapping. Furthermore, reports are evidence, not formal compliance certifications.
- **AWS Macie and AWS Config:** Deliberately excluded during security roadmap planning due to excessive, unpredictable AWS billing overhead and high false-positive noise.
- **Centralized Multi-Tenant SBOM Storage:** Superseded by customer-AWS S3 bucket storage in the revised security proposal (session `858dd17f-d0e5-45f8-8f9d-98fdd5ef029e`, line 561) to preserve strict customer data sovereignty.

---

### 5. Disclosure of Working Limitations

This editorial brief was generated as an independent, clean-room exercise based strictly on the provided context packet, business source documents, and explicit roadmap records. Per the instructions, local repository files (`apps/docs/content/cli/init.mdx`, `apps/init-ui/src/steps/StartStep.tsx`, `.agents/prompts/external-review.md`) were inaccessible within the active workspace environment; all facts and technical boundaries were drawn directly from the verified brief. No external competitive attack copy, ungrounded benchmark claims, or fabricated testimonials were introduced.
