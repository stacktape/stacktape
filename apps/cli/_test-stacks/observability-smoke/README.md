# Observability smoke fixture — qualification pending

This disposable fixture is intended to exercise Lambda tracing, container tracing through the collector sidecar, uptime
checks, and both synthetic-test flavors. It has not completed a live qualification run. No automated observability
scenario is registered in the qualification runner yet.

## Acceptance checklist

A valid run must prove all of the following, not merely deploy successfully:

- Invoke the fixture's Lambda and container endpoints with a unique run identifier and assert their responses.
- Query `aws/spans` within the run's time window. Parse spans and assert the exact project, service, and run identifiers
  for each workload separately; a substring match or the existence of a shared log group is insufficient.
- Verify the uptime manifests in all three prober regions and a resulting check through Console ingestion, storage, API,
  and UI. Assert organization isolation and a recovery signal.
- Wait for both API and browser synthetic runs to pass against this fixture's endpoints. Assert their alarm states, the
  failure-notification rule, and an actual screenshot object under `synthetics/` in the deployment bucket.

The endpoints are public and unauthenticated and return static JSON. Install this fixture's dependencies with
`bun install` in this folder before packaging its instrumented container.

## Ownership and cleanup

Use the exact-account, unique-name, ownership, and recovery-state contract in
[`../../scripts/real-aws/README.md`](../../scripts/real-aws/README.md). Record account, region, stack ID, owner, and
every out-of-stack resource before mutation. A failed preflight must never trigger deletion.

Use the source-built CLI to delete the owned stack, then query AWS to verify its absence and reconcile owned log groups,
S3 artifacts, regional SSM manifests, and retained Console test data. Preserve recovery state until every owned resource
is accounted for. A raw CloudFormation fallback does not prove application-level cleanup.

Transaction Search and uptime probers can be shared account-level facilities. Inventory them before the run, leave
pre-existing shared facilities untouched, and report any newly created retained facilities and their cost explicitly. Do
not claim that everything was removed based only on the stack reaching DELETE_COMPLETE.
