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

## Deploy

Run only after verifying the exact AWS account, and use a unique project name:

```sh
project_name="obsmoke-$(date -u +%m%d%H%M)"

pnpm dev:cli deploy \
  --configPath _test-stacks/observability-smoke/stacktape.ts \
  --projectName "$project_name" --stage dev --region eu-west-1 --agent
```

Then invoke the `api` function URL and the `web` service URL a few times, wait ~2 minutes, and verify via
`pnpm dev:cli aws:call`: spans in `aws/spans` (logs `FilterLogEvents`), canary Lambdas and alarms
(`lambda`/`cloudwatch`), screenshots (`s3 ListObjectsV2` under `synthetics/`), uptime manifests
(`ssm GetParametersByPath /stacktape/uptime-checks/<stackName>` in each prober region).

## Cleanup

```sh
pnpm dev:cli delete --projectName "$project_name" --stage dev --region eu-west-1 --agent
```
