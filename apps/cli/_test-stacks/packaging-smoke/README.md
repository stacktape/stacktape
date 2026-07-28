# Packaging smoke stack

A disposable stack that checks Stacktape's Node packaging against real AWS.

`src/retry-advisor.ts` and `src/catalog-report.ts` are two Node Lambdas that both import `src/status-catalog.ts`.
Two Node Lambdas is the minimum that turns split bundling on, and the catalog is larger than the 1 KiB minimum chunk
size, so a correct deployment lifts the shared code into a Lambda layer instead of copying it into both packages.
Each function is exposed through its own public function URL, and each response carries:

- `handler` — which of the two handlers ran;
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

## Commands

Run from the repository root. `--configPath` is resolved against `apps/cli`, which is where the `dev` script runs.

Confirm the account you are about to deploy into, with the raw AWS CLI — not `stacktape aws:call`, which initializes
the CLI against an already-deployed target stack and can pick up persisted defaults on the way:

```powershell
aws sts get-caller-identity --region eu-west-1 --profile <profile>
```

Omit `--profile` only if you are deliberately using the default profile. If you are not on the default profile, the
simplest way to keep the whole session consistent is to export it once — `$env:AWS_PROFILE = '<profile>'` — because
`--profile` is accepted by most Stacktape commands but not by `info:stack`, which takes no such flag and would reject
it. (`--awsAccount` is a different thing entirely: it names an AWS account connected through the Stacktape Console,
not a local profile.)

Deploy:

```powershell
pnpm --filter @stacktape/cli run dev deploy --configPath _test-stacks/packaging-smoke/stacktape.ts --projectName stacktape-v4-packaging-smoke --stage dev --region eu-west-1
```

The deployment log names the shared chunk layer it built. If it reports no layer, split bundling regressed.

Find the two URLs — they are printed at the end of a deploy, and afterwards available as stack outputs:

```powershell
pnpm --filter @stacktape/cli run dev info:stack --projectName stacktape-v4-packaging-smoke --stage dev --region eu-west-1
```

A single URL can also be read directly:

```powershell
pnpm --filter @stacktape/cli run dev param:get --projectName stacktape-v4-packaging-smoke --stage dev --region eu-west-1 --resourceName retryAdvisor --paramName url
```

Invoke both functions, with the two output values in shell variables:

```powershell
$retryAdvisorUrl = '<retryAdvisorUrl output>'
$catalogReportUrl = '<catalogReportUrl output>'
Invoke-RestMethod "$($retryAdvisorUrl)?status=503" | ConvertTo-Json -Depth 5
Invoke-RestMethod $catalogReportUrl | ConvertTo-Json -Depth 5
```

```sh
curl -s "${RETRY_ADVISOR_URL}?status=503"
curl -s "${CATALOG_REPORT_URL}"
```

Check that:

- `retryAdvisor` returns `advice: "retry-with-backoff"` and the `503` record;
- `catalogReport` returns `countsByClass` and `retryableCodes`, and no `status` field;
- both return the **same** `catalog.fingerprint` and `catalog.entryCount`;
- that fingerprint matches the one this working tree produces:

```powershell
bun --eval "console.log((await import('./apps/cli/_test-stacks/packaging-smoke/src/status-catalog.ts')).catalogFingerprint())"
```

Redeploy without changing anything — this should report cache hits and an unchanged stack rather than rebuilding and
replacing the layer:

```powershell
pnpm --filter @stacktape/cli run dev deploy --configPath _test-stacks/packaging-smoke/stacktape.ts --projectName stacktape-v4-packaging-smoke --stage dev --region eu-west-1
```

### Confirm both functions share one layer version

The responses prove the shared module ran correctly. This proves it was actually _shared_ — packaged once into a
layer and attached to both functions, rather than copied into each deployment package.

Use the raw AWS CLI. `aws:call` is the wrong tool here: the stack's debug role does not normally grant the Lambda
read actions this needs, so the call comes back `AccessDenied` and proves nothing either way.

List the stack's Lambda functions with their logical IDs, so you can pick out the fixture's two:

```powershell
$region = 'eu-west-1'
$awsProfile = '<profile>'   # not $profile — PowerShell already uses that for your profile script path
$stack = 'stacktape-v4-packaging-smoke-dev'

aws cloudformation list-stack-resources --stack-name $stack --region $region --profile $awsProfile `
  --query "StackResourceSummaries[?ResourceType=='AWS::Lambda::Function'].[LogicalResourceId,PhysicalResourceId]" `
  --output table
```

Read the physical IDs of the two entries whose logical IDs name `retryAdvisor` and `catalogReport`, then ask Lambda
what layers each one has attached:

```powershell
$retryAdvisorFn = '<retryAdvisor physical id>'
$catalogReportFn = '<catalogReport physical id>'

aws lambda get-function-configuration --function-name $retryAdvisorFn --region $region --profile $awsProfile `
  --query "{Function:FunctionName,Layers:Layers[].Arn}" --output json
aws lambda get-function-configuration --function-name $catalogReportFn --region $region --profile $awsProfile `
  --query "{Function:FunctionName,Layers:Layers[].Arn}" --output json
```

**The check, which you have to make yourself:** each function must list at least one layer, and the _same_ layer
version ARN — identical down to the trailing version number — must appear in both lists. One function with no layer,
or two different layer ARNs, means split bundling did not produce a shared layer and the fixture has failed.

The POSIX equivalent, which prints one line of layer ARNs per function so you can compare them directly:

```sh
region=eu-west-1; aws_profile=<profile>; stack=stacktape-v4-packaging-smoke-dev
for fn in $(aws cloudformation list-stack-resources --stack-name "$stack" --region "$region" --profile "$aws_profile" \
  --query "StackResourceSummaries[?ResourceType=='AWS::Lambda::Function'].PhysicalResourceId" --output text); do
  printf '%s: ' "$fn"
  aws lambda get-function-configuration --function-name "$fn" --region "$region" --profile "$aws_profile" \
    --query "Layers[].Arn" --output text
done
```

Logs, if a function misbehaved:

```powershell
pnpm --filter @stacktape/cli run dev logs --projectName stacktape-v4-packaging-smoke --stage dev --region eu-west-1 --resourceName retryAdvisor --startTime 30m
```

Delete it. Do this even when the check failed:

```powershell
pnpm --filter @stacktape/cli run dev delete --projectName stacktape-v4-packaging-smoke --stage dev --region eu-west-1 --configPath _test-stacks/packaging-smoke/stacktape.ts
```

Confirm nothing is left:

```powershell
pnpm --filter @stacktape/cli run dev info:stacks --region eu-west-1
```

## Changing the fixture

`../../tests/characterization/packaging-smoke-fixture.spec.ts` runs without AWS and fails if the shared catalog drops
under the layering threshold, if the two handlers stop being distinguishable, or if the stack stops declaring two
Lambdas with function URLs. Run it after any edit here:

```powershell
pnpm --filter @stacktape/cli exec bun test tests/characterization/packaging-smoke-fixture.spec.ts
```
