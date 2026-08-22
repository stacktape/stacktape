# Real AWS canaries

These runners test behavior that local and emulator tests cannot prove. They create billable resources and are never
part of `pnpm check` or a normal release.

## Guardrails

Run from Linux, macOS, or a WSL-native checkout. Both runners refuse Windows, implicit credentials, AWS endpoint
overrides, unsafe project names, and an account-id mismatch.

Before starting:

1. Use STS to confirm the exact account and region.
2. Confirm that the account is disposable. A production account named “dev” is not disposable.
3. Choose a unique project name and owner for this run.
4. List existing stacks and confirm the name is unused.
5. Keep the state file if the process is interrupted; it is the recovery identity.

Never weaken these checks to make a canary run on a convenient machine or account.

## Packaging canary

This deploys the two-Lambda fixture in `_test-stacks/packaging-smoke`, invokes it, proves an exact redeploy is a no-op,
changes one environment value without changing code/layer identity, and deletes the stack and owned log groups.

```sh
export STACKTAPE_API_KEY='<development API key>'
export STP_AWS_CANARY_DEPLOY=1
export STP_AWS_CANARY_CONFIRM_DISPOSABLE=this-is-a-disposable-test-account
export STP_AWS_CANARY_EXPECTED_ACCOUNT_ID='<12-digit account id>'
export STP_AWS_CANARY_CREDENTIAL_MODE=profile
export STP_AWS_CANARY_PROFILE='<profile>'
export STP_AWS_CANARY_PROJECT_NAME="v4canary-$(date -u +%s)"
export STP_AWS_CANARY_OWNER="local-$(date -u +%s)"
pnpm --filter @stacktape/cli run test:real-aws-canary
```

## Init canary

This drives the browser-facing `stacktape init` API, writes and validates the generated config, deploys it, resolves the
composed resource URL, checks the live response, and removes the exact resources recorded for the run.

```sh
export STACKTAPE_API_KEY='<development API key>'
export STP_AWS_CANARY_DEPLOY=1
export STP_AWS_CANARY_CONFIRM_DISPOSABLE=this-is-a-disposable-test-account
export STP_AWS_CANARY_EXPECTED_ACCOUNT_ID='<12-digit account id>'
export STP_AWS_CANARY_CREDENTIAL_MODE=profile
export STP_AWS_CANARY_PROFILE='<profile>'
export STP_INIT_CANARY_AWS_ACCOUNT='<connected disposable account name>'
export STP_AWS_CANARY_PROJECT_NAME="v4canary-init-$(date -u +%s)"
export STP_AWS_CANARY_OWNER="local-init-$(date -u +%s)"
export STP_AWS_CANARY_STATE_FILE="$(pwd)/.stacktape-init-canary-${STP_AWS_CANARY_PROJECT_NAME}.json"
export STP_INIT_CANARY_FIXTURE=express-basic
export STP_INIT_CANARY_CODING_AGENT=none
pnpm --filter @stacktape/cli run test:real-aws-init-canary
```

Fixtures are `express-basic`, `express-postgres-migration`, `vite-static`, and `fastapi-basic`. Set the coding agent to
`claude-code` or `codex` only when that mode is the subject of the test.

To test an immutable preview, set `STP_AWS_CANARY_CLI_PATH` to its absolute executable and
`STP_AWS_CANARY_EXPECTED_CLI_VERSION` to the exact version. The init process and deploy child then use the same binary.

If the run stops before cleanup, restore the same account, project, owner, fixture and state-file variables, then run:

```sh
pnpm --filter @stacktape/cli run test:real-aws-init-canary -- --cleanup-only
```

Cleanup verifies the recorded account, stack identity, owner and creation time before deleting anything. Investigate a
refusal; do not edit the state file to bypass it.
