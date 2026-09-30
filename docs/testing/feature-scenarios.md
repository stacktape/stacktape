# Feature acceptance recipes

Read the [test-selection policy](../testing.md), then the recipe for the feature being changed. These examples guide
evidence selection; they do not claim existing automated coverage or add mandatory cases to unrelated work. Use the
private [Console E2E guide](../../apps/console/e2e/README.md) for reusable fixtures and actual lane coverage.

## Observability

Send a uniquely identifiable signal through the real ingestion path. Verify its normalized stored form, Console API
response, browser rendering, filters/pagination, and organization isolation. Test malformed, duplicated, late, and
recovery events. Delete the canary stack and any retained signals the scenario owns.

## Security and guardrails

State the threat or unsafe configuration first. Prove a positive detection and a nearby safe case that does not alert.
Verify tenant and project boundaries, redaction, deduplication, severity, remediation text, acknowledgement/ignore, and
recovery. Use a synthesized template for deterministic rules; use disposable AWS only for facts that depend on AWS's
runtime or control plane. Never put a real credential or exploitable public resource in a fixture.

## EC2 runners and AMIs

Build or select the dev AMI, start one owned runner, run a representative CLI workload, verify logs/result/lease
release, and terminate it. Assert instance selection, IAM, ownership, leasing, timeout or cleanup where those behaviors
changed. Exercise boot failure or cancellation when that behavior changed. The final check must confirm there is no
running instance, volume, test AMI/snapshot, or active lease owned by the scenario.

## Git providers

Use the provider-specific flow in
[`../../.agents/skills/console-development/references/git-provider-e2e.md`](../../.agents/skills/console-development/references/git-provider-e2e.md).
The reusable fixture inventory records only provider, account/workspace label, repository label, default branch, and
expected webhook/app installation. It never stores provider tokens. Drive install/connect, push, pull/merge request,
retry, disconnect/reconnect, and provider-side removal as applicable. Verify the resulting deployment or recorded
failure, not only the callback page.

## Worked example: a feature spanning CLI and Console

Take a security finding: the CLI detects an unsafe configuration, reports it through the API, and an authorized user
acknowledges it in the Console. A nearby safe configuration produces no finding, and users outside the project or
organization cannot read or change it. First identify the actual path: some rules run entirely during synthesis, others
inspect AWS or arrive through a scheduled worker. Do not invent an endpoint or worker to follow this example.

1. **Rule:** unsafe and nearby safe inputs through the real rule or resolver; assert the finding and severity.
2. **CLI to API:** spawn the source CLI against the changed API, as described in
   [prove the changed revision](console.md#prove-the-changed-revision); check the tRPC result, not only HTTP status.
3. **Persistence and access:** the real router against disposable PostgreSQL. Assert the stored finding, deduplication
   on repeated delivery, scoped acknowledgement, and denial for another project and organization. The
   [isolated Console application](e2e.md#isolated-console-application) seeds independent tenants for this.
4. **Browser:** find the finding, acknowledge it, reload, and confirm the state persisted.
5. **External facts:** if production reads AWS state or a deployed worker transforms the finding, add a small owned dev
   AWS scenario or deploy the changed worker and send a real event. Synthetic input proves rule logic only.

Clean up only what the scenario created, and name any provider, worker, AWS or tenant boundary left unverified. A green
generic browser smoke test is not acceptance for a new feature.
