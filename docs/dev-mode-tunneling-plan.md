# Dev Mode Tunneling for Lambda Functions

## Overview

Enable Lambda functions running in AWS to connect to locally running databases during dev mode by creating secure
tunnels using [bore](https://github.com/ekzhang/bore).

## How It Works

```
┌─────────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Local Machine     │         │   bore.pub      │         │   AWS Lambda    │
│                     │         │   (tunnel)      │         │                 │
│  ┌───────────────┐  │         │                 │         │                 │
│  │ Postgres:5432 │──┼────────►│ :54321 ─────────┼────────►│ Connect to      │
│  └───────────────┘  │  TCP    │                 │         │ bore.pub:54321  │
│                     │ Tunnel  │                 │         │                 │
└─────────────────────┘         └─────────────────┘         └─────────────────┘
```

1. Start local databases as usual
2. For each local resource that a Lambda references, start a bore tunnel
3. Update Lambda environment variables to point to tunnel URLs
4. On exit, restore original Lambda env vars

## Limitations

- **VPC Lambdas without NAT**: Lambdas with `joinDefaultVpc: true` cannot connect to external tunnels (no internet
  access). These will be skipped with a warning.
- **Latency**: Tunnel adds ~100-200ms round trip latency (acceptable for development)

## Implementation Status: COMPLETE ✓

### Phase 1: bore Binary Management ✓

- [x] Pre-bundle bore binaries in `scripts/assets/bore/` for all platforms
- [x] Support Windows (bore-win.exe), macOS (bore-macos, bore-macos-arm), Linux (bore-linux, bore-linux-arm)
- [x] Use `fsPaths.borePath()` to get platform-specific binary path
- [x] Include bore in release build process (build-dist-package.ts, build-cli-sources.ts)

### Phase 2: Tunnel Manager ✓

- [x] Create `src/commands/dev/tunnel-manager/index.ts`
- [x] Implement `startTunnel(resourceName, localPort)` - spawns bore process with retry logic
- [x] Implement `stopAllTunnels()` - kills all bore processes
- [x] Parse tunnel URL from bore stdout (format: `bore.pub:PORT`)
- [x] Handle tunnel process errors with retry attempts (2 retries, 2s delay)
- [x] Register cleanup hook to stop tunnels on exit
- [x] Handle tunnel dying mid-session (warn user)
- [x] Verify bore binary exists before starting

### Phase 3: Lambda Environment Manager ✓

- [x] Create `src/commands/dev/lambda-env-manager/index.ts`
- [x] Implement `detectLambdasNeedingTunnels()` - find Lambdas connected to local resources
- [x] Implement `updateLambdaEnvVarsWithTunnels()` - update with tunnel URLs (with backup)
- [x] Implement `restoreLambdaEnvVars()` - restore original env vars on exit
- [x] Handle `AWS_ENDPOINT_URL_DYNAMODB` for DynamoDB local
- [x] Skip Lambdas with `joinDefaultVpc: true` (warn user)
- [x] Skip Lambdas not deployed (warn user)
- [x] Handle Lambda update conflicts with retry logic (ResourceConflictException)
- [x] Proper camelCase to SNAKE_CASE conversion for resource names

### Phase 4: Integration with Dev Command ✓

- [x] Modify `src/commands/dev/parallel-runner/index.ts` to integrate tunnel flow
- [x] Detect if any Lambdas reference local resources
- [x] Start tunnels after local resources are ready
- [x] Update Lambda env vars before starting local workloads
- [x] Add `--noTunnel` flag to disable tunneling
- [x] Ensure proper cleanup order on exit (via applicationManager cleanup hooks)

### Phase 5: Testing & Polish ✓

- [x] Test bore tunnel establishment (Windows verified)
- [x] Test Lambda env var update and restore
- [x] Test end-to-end: Lambda in AWS connecting to local Postgres through tunnel
- [x] Test connection string replacement for various formats
- [x] Test cleanup hooks restore Lambda env vars
- [x] Test build process includes bore binary
- [x] Add proper error messages for all failure modes

## Environment Variable Mapping

| Local Resource | Original Env Var               | Tunnel Env Var                     |
| -------------- | ------------------------------ | ---------------------------------- |
| Postgres       | `STP_<NAME>_CONNECTION_STRING` | Same, with `bore.pub:PORT`         |
| MySQL/MariaDB  | `STP_<NAME>_CONNECTION_STRING` | Same, with `bore.pub:PORT`         |
| Redis          | `STP_<NAME>_CONNECTION_STRING` | Same, with `bore.pub:PORT`         |
| DynamoDB       | `STP_<NAME>_ENDPOINT`          | Same + `AWS_ENDPOINT_URL_DYNAMODB` |

**Note**: Resource names are converted from camelCase to SNAKE_CASE for env var matching.

- `postgresDb` → `STP_POSTGRES_DB_*`
- `myDatabase` → `STP_MY_DATABASE_*`

## Connection String Patterns Handled

The following localhost patterns are replaced with tunnel URLs:

- `localhost:PORT`
- `127.0.0.1:PORT`
- `host.docker.internal:PORT`

## User Experience

```bash
$ stacktape dev --local postgresDb,redis

✓ Starting local postgres: postgresDb port 5432
✓ Starting local redis: redis port 6379
✓ Starting tunnel: postgresDb → bore.pub:54321
✓ Starting tunnel: redis → bore.pub:54322
✓ Updating Lambda env vars: apiFunction
✓ [webService] Container started on port 3000
✓ All workloads running

# On Ctrl+C:
i Restoring Lambda env vars...
✓ Lambda env vars restored (1 function)
i Stopping tunnels...
✓ Tunnels stopped
✓ Cleanup complete
```

## Error Handling

1. **bore.pub unavailable**: Retries 2 times with 2s delay, then fails with helpful message
2. **Lambda not deployed**: Skipped with warning, suggests running `stacktape deploy`
3. **Lambda in VPC**: Skipped with warning explaining no internet access without NAT
4. **Lambda update conflict**: Retries 3 times with 2s delay (handles concurrent updates)
5. **Tunnel dies mid-session**: Warns user that Lambda connectivity may be lost
6. **Restore failure**: Warns user to redeploy affected functions

## Files Created/Modified

### New Files

- `src/commands/dev/tunnel-manager/index.ts` - Manages bore tunnel lifecycle
- `src/commands/dev/lambda-env-manager/index.ts` - Detects Lambdas needing tunnels, updates/restores env vars
- `scripts/assets/bore/` - Pre-bundled bore binaries for all platforms
- `scripts/download-bore-binaries.ts` - Script to update bore binaries

### Modified Files

- `src/commands/dev/parallel-runner/index.ts` - Integration point for tunnel and lambda env manager
- `types/args.d.ts` - Added `noTunnel` flag
- `src/config/cli.ts` - Added `noTunnel` to dev command args and aliases
- `shared/utils/constants.ts` - Added `BORE_BINARY_FILE_NAMES`
- `shared/naming/fs-paths.ts` - Added `borePath()` function
- `scripts/release/build-cli-sources.ts` - Added `copyBoreBinary()`, updated `EXECUTABLE_FILE_PATTERNS`
- `scripts/build-dist-package.ts` - Added bore binary to build process

## Test Stack

A test stack is deployed for testing:

- Project: `new-ts-config`
- Stage: `test1`
- Region: `eu-west-1`
- Lambda URL: https://5a225fyhk5joqjvjzrp76k66si0xgdro.lambda-url.eu-west-1.on.aws/
