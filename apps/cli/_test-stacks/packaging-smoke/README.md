# Packaging smoke stack

This disposable stack proves Node packaging against real AWS, on both paths at once.

`retryAdvisor` and `catalogReport` import the same catalog, which is large enough to become a shared Lambda layer, so
they share one split build. `catalogNote` sets `includeFiles`, which the split path does not implement, so it is
packaged on its own — and it reads a file at runtime that only `includeFiles` puts there.

Each response names its handler and returns the catalog entry count and fingerprint. A valid run proves:

- all three functions execute;
- all three report the fingerprint computed from this source tree;
- the two split functions reference the same Lambda layer version;
- `catalogNote` carries no layer and still finds its notice, so one incompatible function neither joins the shared build
  nor pushes the others out of it;
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

Use `param:get` for `retryAdvisor.url`, `catalogReport.url` and `catalogNote.url`, invoke all three, then compare their
fingerprint with:

```sh
bun --eval "console.log((await import('./apps/cli/_test-stacks/packaging-smoke/src/status-catalog.ts')).catalogFingerprint())"
```

Use `aws:call` with Lambda `GetFunctionConfiguration` for all three physical functions. `retryAdvisor` and
`catalogReport` must show the same layer-version ARN; `catalogNote` must show no layers at all, and its response must
carry `"notice": "packaged-by-the-per-function-path"`. Redeploy unchanged, then delete and confirm the stack is absent:

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
