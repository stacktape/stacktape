# Local Dev Mode Plan

## Goals

- Run Postgres/MySQL/MariaDB/Redis locally via Docker for dev mode.
- Keep Lambda dev mode running in AWS (local DB tunneling deferred).
- Allow `--resourceName all` to run all dev-compatible workloads.
- If no `--resourceName`, allow selection of dev-compatible workloads.
- Auto-detect local resources when not deployed or via `--local` override.

## Decisions

- Use host directory persistence: `.stacktape/dev-data/<resourceName>/data/`.
- Reuse running local DB containers when present.
- Auto-resolve port conflicts by selecting next free port and print it.
- Aurora emulation: treat as standard Postgres/MySQL and warn once.

## Implementation Status

### Completed

1. **Local DB runner module** (`src/commands/dev/local-resources/`)
   - `index.ts` - orchestration, resource categorization, env var generation
   - `postgres.ts` - Postgres container runner with health check
   - `mysql.ts` - MySQL/MariaDB container runner with health check
   - `redis.ts` - Redis container runner with health check

2. **Resource resolution logic**
   - `categorizeConnectToResources()` - splits connectTo into local vs deployed
   - Auto-detect: resources not deployed → run locally
   - `--local <name>` or `--local all` to force local emulation

3. **Environment variable handling**
   - `getLocalResourceEnvVars()` - generates STP\_\* env vars for local resources
   - `getWorkloadEnvironmentVars()` updated to accept `localResourceEnvVars`
   - Handles Docker networking (localhost → host.docker.internal on Windows/Mac)

4. **Dev container flow integration**
   - Categorizes connectTo resources before starting
   - Starts local DB containers with multi-spinner progress
   - Only creates bastion tunnels for deployed resources
   - Works without deployed stack when using local resources only

5. **CLI updates**
   - Added `--local` argument to types
   - `--resourceName all` runs all dev-compatible workloads
   - Selection prompt includes "All resources" option

6. **Parallel workload runner** (`src/commands/dev/parallel-runner/index.ts`)
   - Runs multiple containers and lambdas simultaneously
   - File-change targeted restarts (only rebuilds workload whose files changed)
   - Shared local resources and bastion tunnels across workloads
   - `rs` command restarts all, `rs <name>` restarts specific workload
   - Log streaming for all lambda functions

## Out of Scope

- Lambda → local DB tunneling (requires external tunnel service)
- Upstash Redis emulation
- MongoDB Atlas emulation

## Files Changed

| File                                           | Type     | Description                       |
| ---------------------------------------------- | -------- | --------------------------------- |
| `src/commands/dev/local-resources/index.ts`    | New      | Main orchestration module         |
| `src/commands/dev/local-resources/postgres.ts` | New      | Postgres Docker runner            |
| `src/commands/dev/local-resources/mysql.ts`    | New      | MySQL/MariaDB Docker runner       |
| `src/commands/dev/local-resources/redis.ts`    | New      | Redis Docker runner               |
| `src/commands/dev/parallel-runner/index.ts`    | New      | Parallel workload runner          |
| `src/commands/dev/container/index.ts`          | Modified | Integrated local resources        |
| `src/commands/dev/utils.ts`                    | Modified | Updated env var handling          |
| `src/commands/dev/index.ts`                    | Modified | Added resourceName=all + parallel |
| `types/args.d.ts`                              | Modified | Added --local argument            |

## Usage Examples

```bash
# Run container with local Postgres (auto-detected if not deployed)
stacktape dev --resourceName myWebService

# Force local database even if deployed
stacktape dev --resourceName myWebService --local myDatabase

# Force all databases local
stacktape dev --resourceName myWebService --local all

# Run all dev-compatible workloads in parallel
stacktape dev --resourceName all

# Run all with file watching (auto-restart on changes)
stacktape dev --resourceName all --watch

# Interactive: restart all workloads
# Type: rs

# Interactive: restart specific workload
# Type: rs myWebService
```

## Data Persistence

Local database data is stored in:

```
.stacktape/
  dev-data/
    <resourceName>/
      data/   # Database files (Postgres, MySQL, Redis)
```

Recommend adding to `.gitignore`:

```
.stacktape/dev-data/
```

## Testing

### Unit Tests Passed

Docker container tests verified that all database types start correctly:

- **Postgres** (`postgres:16`): ✓ Starts, health check passes
- **MySQL** (`mysql:8.0`): ✓ Starts, health check passes
- **MariaDB** (`mariadb:10.11`): ✓ Starts, health check passes
- **Redis** (`redis:7.2`): ✓ Starts, health check passes

### Module Compilation

All new modules compile and import correctly:

- `startLocalPostgres`, `startLocalMysql`, `startLocalRedis`
- `categorizeConnectToResources`, `startLocalResources`, `getLocalResourceEnvVars`
- `runParallelWorkloads`

### Test Stack Created

Test stack at `_test-stacks/local-dev-mode/` with:

- Postgres, MySQL, MariaDB, Redis resources
- Web service connecting to all databases
- Private service for inter-service communication
- Lambda function for parallel runner testing
