# Packaging smoke stack

This disposable stack proves Node split bundling against real AWS. Its two public Lambda functions import the same
catalog, which is large enough to become a shared Lambda layer.

Each response names its handler and returns the catalog entry count and fingerprint. A valid run proves:

- both functions execute;
- both report the fingerprint computed from this source tree;
- both reference the same Lambda layer version;
- an unchanged redeploy is a CloudFormation no-op;
- an environment-only update does not change function code or layer identity.

The URLs are public and unauthenticated. The functions read no sensitive input, but delete the stack after the test.

## Preferred test

Use the guarded automated runner in `scripts/real-aws/packaging-canary.ts`. It verifies the account and ownership before
mutation and cleanup. Required opt-ins are in [`scripts/real-aws/README.md`](../../scripts/real-aws/README.md).

## Manual diagnostic

Run only after verifying the exact AWS account and confirming a unique project name is unused:

```sh
project_name="v4pkg-$(date -u +%m%d%H%M%S)-$RANDOM"
account_args=(--profile '<disposable-profile>') # or --awsAccount '<connected-account>'

pnpm dev:cli deploy \
  --configPath _test-stacks/packaging-smoke/stacktape.ts \
  --projectName "$project_name" --stage dev --region eu-west-1 \
  "${account_args[@]}" --agent
```

Use `param:get` for `retryAdvisor.url` and `catalogReport.url`, invoke both, then compare their fingerprint with:

```sh
bun --eval "console.log((await import('./apps/cli/_test-stacks/packaging-smoke/src/status-catalog.ts')).catalogFingerprint())"
```

Use `aws:call` with Lambda `GetFunctionConfiguration` for both physical functions and confirm the same layer-version ARN
appears. Redeploy unchanged, then delete and confirm the stack is absent:

```sh
pnpm dev:cli delete \
  --configPath _test-stacks/packaging-smoke/stacktape.ts \
  --projectName "$project_name" --stage dev --region eu-west-1 \
  "${account_args[@]}" --agent
```

The credential-free fixture contract runs in the normal suite:

```sh
pnpm --filter @stacktape/cli exec bun test tests/characterization/packaging-smoke-fixture.spec.ts
```
