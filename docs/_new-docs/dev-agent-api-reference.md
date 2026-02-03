# Dev Agent API Reference

Quick reference for the agent mode HTTP API.

## Info Commands

Use these CLI commands to query deployment information without a config file:

| Command | Description |
| ------- | ----------- |
| `stacktape info:whoami` | Show current user, organization, AWS accounts, and projects |
| `stacktape info:projects` | List all projects with stages, status, and costs |
| `stacktape info:operations [--projectName X] [--stage Y] [--limit N]` | Recent deployment operations |
| `stacktape info:stack --stackName NAME --region REGION [--awsAccount NAME]` | Stack outputs and resources |

### info:whoami

```
User
  Name: John Doe
  Email: john@example.com

Organization
  Name: Acme Corp

Connected AWS Accounts
  - default (123456789012) - ACTIVE

Accessible Projects
  - my-api
  - my-frontend
```

### info:projects

Lists all projects with their deployed stages, status (in-progress, errored), and monthly costs.

### info:operations

Shows recent deploy/delete operations with success/failure status. Use filters:
- `--projectName my-api` - filter by project
- `--stage dev` - filter by stage
- `--limit 50` - number of results (default 25, max 100)

Failed operations include error descriptions.

### info:stack

Returns stack outputs (URLs, endpoints) and CloudFormation resources. Requires:
- `--stackName my-api-dev` - the CloudFormation stack name
- `--region eu-west-1` - AWS region
- `--awsAccount default` - optional, auto-detected if only one account connected

## Start Command

```bash
stacktape dev --agent --agentPort PORT --resources WORKLOADS --stage STAGE
```

## Endpoints

| Method | Path               | Description         |
| ------ | ------------------ | ------------------- |
| GET    | `/trpc/health`     | Health check        |
| GET    | `/trpc/status`     | Get workload status |
| GET    | `/trpc/logs`       | Get logs            |
| POST   | `/trpc/rebuild`    | Rebuild workload    |
| POST   | `/trpc/rebuildAll` | Rebuild all         |
| POST   | `/trpc/stop`       | Stop dev mode       |

## Request/Response Examples

### GET /trpc/health

```json
{ "ok": true, "phase": "ready" }
```

### GET /trpc/status

```json
{ "phase": "ready", "ready": true, "workloads": { "api": "http://localhost:3000" } }
```

### GET /trpc/status?input={"verbose":true}

Returns full details including `sourceDir`, `port`, `localResources`, `uptime`.

### GET /trpc/logs?input={"limit":50,"cursor":0}

```json
{ "logs": "14:30:15 [api] Started", "count": 1, "nextCursor": 1706000001 }
```

### POST /trpc/rebuild

Body: `{"workload": "api"}`

```json
{ "ok": true }
```

### POST /trpc/rebuildAll

```json
{ "ok": true }
```

### POST /trpc/stop

```json
{ "ok": true }
```

## Status Values

**Phase:** `starting` | `ready` | `rebuilding` | `stopping` | `stopped`

**Workload status:** `pending` | `starting` | `running` | `error` | `stopped`

## Error Format

```json
{ "ok": false, "error": "message", "available": ["list"], "similar": ["suggestions"] }
```
