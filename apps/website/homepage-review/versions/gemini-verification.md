# Verification Review Report

**Verification Scope & Limits:** Conducted strictly as a read-only analysis of the provided packet and draft text. In accordance with instructions, no external tools, local file reads, shell commands, or web searches were performed. Unchecked source references outside the prompt packet are explicitly categorized as unverified.

---

## 1. Surviving Confirmed Findings

### Finding 1: Section 05 Promises "Least-Privilege" Service Connections
- **Section / Location:** `03 · What Stacktape does` -> `05 · Secures it` -> **What you get** (Bullet 1).
- **Actual Claim:** *"Automated private VPC networking, least-privilege service connections, and encrypted Secrets Manager references."*
- **Triggering Reader Interpretation:** Technical buyers and security evaluators (CTOs/auditors) will interpret this as an ironclad guarantee that Stacktape automatically synthesizes mathematically minimal IAM privilege policies for all connected resources.
- **Expected Claim:** Describe wiring permissions and network access without claiming strict least privilege (or acknowledge that underlying AWS policies can be broad).
- **Impact:** Overpromises security posture and regulatory compliance.
- **Source Evidence:** `Product evidence and limitations` under `configuration/connecting-resources.mdx`:
  > *"a resource connection wires service permissions, network access, and generated connection variables. Avoid promising minimum possible privileges: some service policies are broad."*
- **Confidence:** High.

---

### Finding 2: Section 05 Claims Database Subnet Isolation Occurs "By Default"
- **Section / Location:** `03 · What Stacktape does` -> `05 · Secures it` -> **Explanation** (Sentence 1–2).
- **Actual Claim:** *"Enforce enterprise-grade security posture by default. Stacktape isolates databases in private subnets, provisions IAM roles scoped strictly to connected services..."*
- **Triggering Reader Interpretation:** Developers will assume that any database provisioned via Stacktape is placed in private subnets out of the box without requiring explicit policy configuration.
- **Expected Claim:** Private database isolation must be framed as a configurable guardrail policy or rule, not a universal resource default.
- **Impact:** Misleads developers on default AWS networking; databases created without guardrail enforcement may expose public endpoints.
- **Source Evidence:** `Product evidence and limitations` under `guardrails/*`:
  > *"Standard database resource defaults are not universally private; phrase as configured protection or a policy."*
- **Confidence:** High.

---

### Finding 3: Section 07 Invents Commercial Term ("Zero Per-Seat Fees")
- **Section / Location:** `03 · What Stacktape does` -> `07 · Tracks costs` -> **What you get** (Bullet 3).
- **Actual Claim:** *"Free tier covers up to $100/month of managed AWS spend, followed by predictable usage tiers with zero per-seat fees."*
- **Triggering Reader Interpretation:** Buyers assume Stacktape has permanently eliminated all per-user/seat pricing across paid plans.
- **Expected Claim:** State free-tier terms ($100/month AWS costs for one member) and link to `/pricing` rather than inventing ungrounded commercial models.
- **Impact:** Creates potential commercial and legal liability by committing to unverified pricing structures.
- **Source Evidence:** `Product evidence and limitations` under `managing-costs/*`:
  > *"The current public pricing page shows a free plan up to $100/month AWS costs for one member, then paid percentage tiers; don't say all features are free, unlimited free team, or no Stacktape fee. Prefer linking pricing to inventing v4 commercial terms."*
- **Confidence:** High.

---

### Finding 4: Review Notes Omitted Governance Framework for Roadmap Gates
- **Section / Location:** `=== REVIEW NOTES ===` -> `2. Inventory of Roadmap Claims, Locations, and Technical Prerequisites`.
- **Actual Claim:** The review notes table tracks only `Planned Feature Claim` and `Technical Prerequisites & Dependencies`.
- **Triggering Reader Interpretation:** Technical reviewers cannot evaluate the operational safety boundaries, override authority, or fallback behaviors of the proposed automated gates.
- **Expected Claim:** For roadmap gates (specifically: automated release health bake gates in Section 03 and security deployment gates in Section 05), the notes must document **Prerequisite, Authority, Fallback, and Consequence**.
- **Impact:** Breaches the user contract requirement for reviewing future-launch roadmap gating mechanisms.
- **Source Evidence:** `User's contract`:
  > *"For roadmap gates preserve Prerequisite, Authority, Fallback, Consequence where relevant."*
- **Confidence:** High.

---

### Finding 5: Section 06 Visual Timeline Contains Internal Narrative Contradiction
- **Section / Location:** `03 · What Stacktape does` -> `06 · Handles incidents` -> **Visual**.
- **Actual Claim:** The incident timeline specifies: `13:58 v41 deployed`, followed at `14:03` by `PrismaClientKnownRequestError: column "fulfillment_status" does not exist`.
- **Triggering Reader Interpretation:** The timeline suggests deploying the prior release (`v41`) triggered a schema error for `fulfillment_status`.
- **Expected Claim:** In Section 03 Visual and Section 7, `v41` is the stable prior release, whereas `v42` is the newly deployed release introducing `"orders: fulfillment status"` (`v42 · main a1b2c3d · "orders: fulfillment status"`). Deploying `v41` would not cause a missing-column error for a feature introduced in `v42`. The triggering release should be `v42`.
- **Impact:** Internal narrative contradiction across visual mockups.
- **Source Evidence:** Section 03 Visual (`v42 ... "orders: fulfillment status"`) and Section 7 (`Releases v41 (previous) and v42 (current)`).
- **Confidence:** High.

---

## 2. Falsified / Disproven Candidate Concerns

1. **Proposed Incident CLI Commands on Public Surface:** The orchestrator flagged that incident commands require an unshipped label. **Falsification:** The draft exposes no CLI incident commands on the public page (it displays only `init` and `deploy`). Evidence bundle exports are described conceptually, and the Review Notes explicitly mark CLI/MCP bundles as unshipped under Observability Batch 2.
2. **Autonomous AI Production Modification:** The draft was checked for unmonitored self-healing. **Falsification:** Section 06 copy and visuals explicitly require pull requests and mandatory human review, fully aligning with roadmap constraints.
3. **Subheadline Modification:** The contract permits subheadline changes for a clear reason. **Falsification:** The Review Notes provide an explicit technical justification (eliminating the scientifically indefensible marketing claim *"makes sure your app runs flawlessly forever after"*).

---

## 3. Unavailable Verification & Unproven Concerns

- **Secret-History Scanning Phase (Phase 1 vs. Phase 2):** The orchestrator noted that primary files assign secret-history scanning to Phase 2. However, the supplied text packet states: *"- Phase 1: ... secret patterns/history scanning (Gitleaks)..."*. Because primary repository files (`858dd17f-d0e5-45f8-8f9d-98fdd5ef029e`) cannot be inspected without tools, this candidate is **unverified**.
- **Nixpacks Support:** Section 02 claims *"native support for custom Dockerfiles and Nixpacks"*. The supplied packet mentions *"built-in buildpacks, own Dockerfile, prebuilt images and other buildpacks"* without naming Nixpacks. Whether Nixpacks is officially supported or imported from competitor documentation is **unverified**.
- **Verbatim Legacy Homepage Comparison:** The baseline legacy page was omitted from the prompt packet; full verbatim regression verification against legacy text is **unverified**.
