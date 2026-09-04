# Observability smoke stack

This disposable stack proves the observability suite against real AWS: Lambda tracing on the default runtime, container
tracing through the collector sidecar, uptime checks, and both synthetic-test flavors with their alarms.

A valid run proves:

- the Transaction Search custom resource enables span storage (the `aws/spans` log group exists and receives spans);
- the traced Lambda (default runtime + AWS-managed OTel layer) produces spans carrying the `stacktape.project` resource
  attribute;
- the traced container service's own OpenTelemetry SDK reaches the collector sidecar and its spans arrive in `aws/spans`
  too;
- prober Lambdas and SSM manifests exist in the three uptime regions, and the check reports to the Console;
- both canaries run and pass (their `SuccessPercent` alarms settle in `OK`), the browser run stores a screenshot under
  `synthetics/` in the deployment bucket, and the failure notification rule exists.

The function URL and web service are public and unauthenticated; they return static JSON. Delete the stack after the
test.

## Setup

Run `bun install` in this folder once (the container app bundles its own OpenTelemetry SDK).

## Automated proof

Use the guarded runner instead of reproducing checks by hand. It verifies the exact account and owner, records recovery
state, waits for every signal and artifact, deletes the exact stack in `finally`, and verifies deletion:

```sh
pnpm test:aws -- --aws-scenario=observability-signal-path
```

The required environment variables and exact cleanup-only recovery command are in
[`../../scripts/real-aws/README.md`](../../scripts/real-aws/README.md).

For diagnosis, the runner checks spans in `aws/spans`, Synthetics runs and alarms, screenshots under `synthetics/`, and
SSM manifests under `/stacktape/uptime-checks/<stackName>` in each prober region. Transaction Search and the shared
uptime-prober infrastructure are account-level prerequisites; stack deletion intentionally leaves those shared
facilities available to other workloads.
