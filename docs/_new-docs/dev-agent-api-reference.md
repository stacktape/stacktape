# Dev Agent API Reference

Quick reference for the agent mode HTTP API.

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
