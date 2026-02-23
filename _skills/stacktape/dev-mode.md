# Local Development with Dev Mode

Run your entire stack locally for fast development.

## Quick Start

```bash
npx stacktape dev --stage dev --region us-east-1
```

This:
1. Deploys minimal infrastructure to AWS (API Gateway, auth, etc.)
2. Runs your functions/containers locally
3. Emulates databases locally (PostgreSQL, DynamoDB, Redis)
4. Hot reloads on code changes

## Options

| Option | Description |
|--------|-------------|
| `--watch` | Auto-rebuild on file changes |
| `--resources` | Run specific resources only (comma-separated) |
| `--freshDb` | Reset local database data |
| `--remoteResources` | Use deployed AWS resources instead of local |

## Examples

```bash
# Run with hot reload
npx stacktape dev --stage dev --region us-east-1 --watch

# Run only specific resources
npx stacktape dev --stage dev --region us-east-1 --resources api,worker

# Fresh database (reset data)
npx stacktape dev --stage dev --region us-east-1 --freshDb

# Use deployed database instead of local
npx stacktape dev --stage dev --region us-east-1 --remoteResources database
```

## Agent Mode (Programmatic Control)

```bash
npx stacktape dev --stage dev --region us-east-1 --agent --agentPort 7331
```

HTTP API available at `http://localhost:7331`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/trpc/health` | GET | Health check |
| `/trpc/status` | GET | Get workload status |
| `/trpc/logs` | GET | Get logs (supports pagination) |
| `/trpc/rebuild` | POST | Rebuild specific workload |
| `/trpc/stop` | POST | Stop dev mode |

## Local Database Data

Data persists in `.stacktape/dev-data/{stage}/{resourceName}/data/`

Use `--freshDb` to reset.

## Stop Dev Mode

```bash
# Stop running agent
npx stacktape dev:stop --agentPort 7331

# Cleanup orphaned containers
npx stacktape dev:stop --cleanupContainers
```
