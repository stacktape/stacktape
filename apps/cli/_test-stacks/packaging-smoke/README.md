# Packaging smoke stack

A disposable stack that checks Stacktape's Node packaging against real AWS.

`src/retry-advisor.ts` and `src/catalog-report.ts` are two Node Lambdas that both import `src/status-catalog.ts`.
Two Node Lambdas is the minimum that turns split bundling on, and the catalog is larger than the 1 KiB minimum chunk
size, so a correct deployment lifts the shared code into a Lambda layer instead of copying it into both packages.
Each function is exposed through its own public function URL, and each response carries:

- `handler` — which of the two handlers ran;
- `revision` — the environment-only revision used by the automated update canary;
- `catalog.entryCount` and `catalog.fingerprint` — the identity of the shared module that ran with it;
- handler-specific work: `retryAdvisor` answers one status lookup, `catalogReport` aggregates the whole catalog.

Same fingerprint from both URLs plus the same fingerprint computed from this source tree is the proof that the shared
module was packaged intact and executed on both functions.

`tsconfig.json` is here because the Lambda bundler reads the config file's directory: it is the compiler
configuration for `src/`, not for `stacktape.ts` (which is loaded by Stacktape's own TypeScript loader). The CLI's
`typecheck` script runs against it too, so the deployed handlers are type-checked before anyone spends a deployment
on them.

Read [`DEVELOPMENT.md`](../../../../DEVELOPMENT.md) first — it covers credentials, the development CLI, and the
dev-only guardrails. Everything below assumes you already confirmed the AWS identity, account and region.

## Cost and blast radius

Two 128 MB Lambdas, up to three Lambda layer versions, the CloudFormation stack, and the artifact objects Stacktape
uploads to its deployment bucket. Nothing runs unless you call a URL, so an idle stack costs effectively nothing —
but it is still a real stack in a real account. Delete it when you are done.

Both function URLs are **public and unauthenticated**. They serve static HTTP semantics and read no input other than
a status code, but do not leave them deployed longer than the check needs.

## Automated canary

The release lane runs this fixture through `scripts/real-aws/packaging-canary.ts`. That runner verifies the exact AWS
account before mutation, refuses to delete a stack without the exact run-owner tag, deploys and invokes both functions, proves an unchanged deploy
is a no-op, changes only `STP_AWS_CANARY_REVISION`, proves code and layer identity remain stable, and deletes the stack
and automatic Lambda log groups. Its required opt-ins and local invocation are documented in the root
[`DEVELOPMENT.md`](../../../../DEVELOPMENT.md).

The commands below remain the human-readable manual diagnostic flow.

## Manual commands

Run on Linux, macOS, or a WSL-native checkout from the repository root. The Windows checkout cannot run this CLI
because of the Bun bundling constraint in `DEVELOPMENT.md`. `--configPath` is resolved against `apps/cli`, where the
`dev` script runs.

Create a unique, deliberately short name. A short name keeps generated AWS names readable:

```sh
set -euo pipefail
project_name="v4pkg-$(date -u +%m%d%H%M%S)-$RANDOM"
stage=dev
region=eu-west-1
```

Choose exactly one credential selector and keep it explicit for the whole run:

```sh
# Stacktape-connected development account:
account_args=(--awsAccount '<connected-account>')

# Or a local AWS profile:
# account_args=(--profile '<profile>')
# export AWS_PROFILE='<profile>'
```

For a local profile, confirm the raw AWS identity:

```sh
aws sts get-caller-identity --region "$region" --profile '<profile>'
```

For a connected account, inspect the authenticated Stacktape identity and connected accounts:

```sh
pnpm --filter @stacktape/cli run dev info:whoami --agent
```

Find the entry whose `name` exactly matches the value in `account_args`; confirm it is `ACTIVE` and its `awsAccountId`
is the expected disposable development account. Then list that target account's existing stacks and confirm
`${project_name}-${stage}` is absent:

```sh
pnpm --filter @stacktape/cli run dev info:stacks --region "$region" "${account_args[@]}" --agent
```

Install cleanup before deploying so interruption and ordinary command failures also attempt deletion:

```sh
delete_stack() {
  pnpm --filter @stacktape/cli run dev delete \
    --configPath _test-stacks/packaging-smoke/stacktape.ts \
    --projectName "$project_name" --stage "$stage" --region "$region" \
    "${account_args[@]}" --agent
}
cleanup_on_exit() {
  delete_stack || true
}
trap cleanup_on_exit EXIT
```

Deploy:

```sh
pnpm --filter @stacktape/cli run dev deploy \
  --configPath _test-stacks/packaging-smoke/stacktape.ts \
  --projectName "$project_name" --stage "$stage" --region "$region" \
  "${account_args[@]}" --agent
```

The deployment log must report one shared layer and both workloads using it. If it reports no layer, split bundling
regressed.

Find the two URLs — they are printed at the end of deploy and can also be fetched individually. Unlike `info:stack`,
`param:get` uses the explicitly selected local profile or connected account:

```sh
pnpm --filter @stacktape/cli run dev param:get \
  --projectName "$project_name" --stage "$stage" --region "$region" \
  "${account_args[@]}" --resourceName retryAdvisor --paramName url --agent
pnpm --filter @stacktape/cli run dev param:get \
  --projectName "$project_name" --stage "$stage" --region "$region" \
  "${account_args[@]}" --resourceName catalogReport --paramName url --agent
```

Copy those outputs into shell variables and invoke both functions:

```sh
retry_advisor_url='<retryAdvisorUrl output>'
catalog_report_url='<catalogReportUrl output>'
curl --fail --silent --show-error "${retry_advisor_url}?status=503"
curl --fail --silent --show-error "$catalog_report_url"
```

Check that:

- `retryAdvisor` returns `advice: "retry-with-backoff"` and the `503` record;
- `catalogReport` returns `countsByClass` and `retryableCodes`, and no `status` field;
- both return the **same** `catalog.fingerprint` and `catalog.entryCount`;
- that fingerprint matches the one this working tree produces:

```sh
bun --eval "console.log((await import('./apps/cli/_test-stacks/packaging-smoke/src/status-catalog.ts')).catalogFingerprint())"
```

Redeploy without changing anything — this should report cache hits and an unchanged stack rather than rebuilding and
replacing the layer:

```sh
pnpm --filter @stacktape/cli run dev deploy \
  --configPath _test-stacks/packaging-smoke/stacktape.ts \
  --projectName "$project_name" --stage "$stage" --region "$region" \
  "${account_args[@]}" --agent
```

### Confirm both functions share one layer version

The responses prove the shared module ran correctly. This proves it was actually _shared_ — packaged once into a
layer and attached to both functions, rather than copied into each deployment package.

The short project name keeps the physical function names deterministic. Query both through Stacktape's reviewed
read-only operation:

```sh
for resource in retryAdvisor catalogReport; do
  pnpm --filter @stacktape/cli run dev aws:call \
    --projectName "$project_name" --stage "$stage" --region "$region" \
    "${account_args[@]}" \
    --service lambda --command GetFunctionConfiguration \
    --input "{\"FunctionName\":\"${project_name}-${stage}-${resource}\"}" --agent
done
```

The command may warn that it could not assume the stack's narrower debug role and fall back to the already validated
user credentials. Each function must list at least one layer, and the _same_ layer version ARN — identical down to the
trailing version number — must appear in both outputs. One function with no layer, or two different layer ARNs, means
the fixture failed.

Logs, if a function misbehaved:

```sh
pnpm --filter @stacktape/cli run dev logs \
  --projectName "$project_name" --stage "$stage" --region "$region" \
  "${account_args[@]}" --resourceName retryAdvisor --startTime 30m --agent
```

Delete it explicitly. With `set -e`, a failed deletion exits and the trap makes one more best-effort attempt:

```sh
delete_stack
```

List the same target account's stacks again and confirm `${project_name}-${stage}` is absent:

```sh
pnpm --filter @stacktape/cli run dev info:stacks --region "$region" "${account_args[@]}" --agent
```

Only after confirming absence, disable the already-installed cleanup trap:

```sh
trap - EXIT
```

## Changing the fixture

`../../tests/characterization/packaging-smoke-fixture.spec.ts` runs without AWS and fails if the shared catalog drops
under the layering threshold, if the two handlers stop being distinguishable, or if the stack stops declaring two
Lambdas with function URLs. Run it after any edit here:

```powershell
pnpm --filter @stacktape/cli exec bun test tests/characterization/packaging-smoke-fixture.spec.ts
```
