---
docType: getting-started
title: Using with AI
tags:
  - using
  - with
  - getting-started
source: docs/_curated-docs/getting-started/using-with-ai.mdx
priority: 2
---

# Using with AI

Stacktape's dev mode has an **agent mode** designed for AI coding assistants. It provides an HTTP API that lets AI agents start dev environments, trigger rebuilds, read logs, and even query databases - all programmatically.

## The AI workflow

When an AI agent builds infrastructure with Stacktape, the workflow looks like this:

1. **Write config** - AI writes/edits `stacktape.ts` based on your requirements
2. **Start dev mode** - AI starts agent mode to run the stack locally
3. **Write application code** - AI implements your handlers, services, etc.
4. **Test and iterate** - AI reads logs, triggers rebuilds, fixes errors
5. **Deploy** - Once working locally, AI deploys to AWS

The key is the **feedback loop**: the AI can see what's happening (logs, errors) and iterate until it works.

## Starting agent mode

```bash
stacktape dev --agent --agentPort 9900 --resources all --stage dev --region us-east-1
```

| Flag          | Description                                 |
| ------------- | ------------------------------------------- |
| `--agent`     | Enable agent mode with HTTP API             |
| `--agentPort` | Port for the HTTP server (default: 7331)    |
| `--resources` | Workloads to run (`all` or comma-separated) |

The command outputs API endpoints when ready:

```
AGENT_READY on port 9900
GET  /status         - workload status
GET  /logs           - get logs
POST /rebuild/{name} - rebuild workload
POST /stop           - shutdown
```

## API endpoints

### Check status

```bash
curl http://localhost:9900/status
```

```json
{
  "phase": "ready",
  "ready": true,
  "workloads": {
    "myApi": "http://localhost:3000",
    "myWorker": "running"
  }
}
```

**Phase values:** `starting`, `ready`, `rebuilding`, `stopping`, `stopped`

### Get verbose status

```bash
curl "http://localhost:9900/status?verbose=true"
```

Returns full details including ports, source directories, and local database status.

### Read logs

```bash
curl "http://localhost:9900/logs?limit=50"
```

```json
{
  "logs": "14:30:15 [myApi] Server started\n14:30:16 [myWorker] Processing...",
  "count": 2,
  "nextCursor": 1706000001
}
```

**Cursor-based pagination:** Use `nextCursor` from the response as `cursor` in the next request to get only new logs.

```bash
curl "http://localhost:9900/logs?cursor=1706000001"
```

### Rebuild a workload

After making code changes:

```bash
curl -X POST http://localhost:9900/rebuild/myApi
```

### Rebuild all

```bash
curl -X POST http://localhost:9900/rebuild/all
```

### Stop dev mode

```bash
curl -X POST http://localhost:9900/stop
```

## Database endpoints

Agent mode exposes endpoints to query locally-emulated databases directly.

### PostgreSQL / MySQL

```bash
# Execute SQL
curl -X POST http://localhost:9900/postgres/myDb/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM users LIMIT 10"}'

# Get schema
curl http://localhost:9900/postgres/myDb/schema

# List tables
curl http://localhost:9900/postgres/myDb/tables
```

### Redis

```bash
# Execute command
curl -X POST http://localhost:9900/redis/myCache/command \
  -d '{"command": ["GET", "mykey"]}'

# List keys
curl http://localhost:9900/redis/myCache/keys
```

### DynamoDB

```bash
# Scan table
curl -X POST http://localhost:9900/dynamodb/myTable/scan

# Query
curl -X POST http://localhost:9900/dynamodb/myTable/query \
  -d '{"partitionKey": "user123"}'
```

## AI agent example session

Here's what an AI session might look like:

```
User: Build me an API that stores and retrieves notes

AI: I'll create the config and start dev mode.

[Writes stacktape.ts with Lambda + DynamoDB]
[Writes src/handler.ts with basic CRUD]

$ stacktape dev --agent --agentPort 9900 --resources all --stage dev

AI: Dev mode is starting. Let me check the status...

$ curl http://localhost:9900/status
{"phase":"ready","ready":true,"workloads":{"api":"http://localhost:3000"}}

AI: Everything is running. Let me test the endpoint...

$ curl http://localhost:3000/notes
{"error":"Table not found"}

AI: There's an error. Let me check the logs...

$ curl http://localhost:9900/logs
{"logs":"[api] ERROR: STP_NOTES_TABLE_NAME is undefined"}

AI: The environment variable isn't being injected. I need to add connectTo.

[Edits stacktape.ts to add connectTo: [notesTable]]

$ curl -X POST http://localhost:9900/rebuild/api

AI: Rebuilt. Testing again...

$ curl http://localhost:3000/notes
{"notes":[]}

AI: Working! The API is ready.
```

## Best practices for AI agents

1. **Poll status first** - Wait for `phase === "ready"` before making requests
2. **Use cursors for logs** - Always use `nextCursor` to avoid re-fetching old logs
3. **Rebuild specific workloads** - Faster than rebuilding everything
4. **Check sourceDir in verbose status** - Know where source files are when debugging
5. **Use database endpoints** - Query data directly to verify behavior

## Stopping agent mode

From another terminal:

```bash
stacktape dev --stop --agentPort 9900
```

Or via API:

```bash
curl -X POST http://localhost:9900/stop
```

## Next steps

- [Dev Mode](/getting-started/dev-mode) - Understanding dev mode in depth
- [Console](/getting-started/console) - Web-based management
