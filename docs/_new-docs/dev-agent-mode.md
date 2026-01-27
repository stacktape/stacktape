# Dev Command Agent Mode

Agent mode provides a programmatic HTTP API for the `stacktape dev` command, designed for AI coding agents and
automation tools.

## Quick Start

```bash
# Start dev mode with agent server
stacktape dev --agent --agentPort 9900 --resources all --stage dev --region eu-west-1

# Or with specific workloads
stacktape dev --agent --agentPort 9900 --resources myApi,myFrontend --stage dev
```

## CLI Arguments

| Argument      | Alias | Required | Description                                       |
| ------------- | ----- | -------- | ------------------------------------------------- |
| `--agent`     | `-ag` | Yes      | Enable agent mode                                 |
| `--agentPort` | `-ap` | Yes      | HTTP server port (e.g., 9900)                     |
| `--agentDir`  | `-ad` | No       | Log directory (default: `.stacktape/dev-agent`)   |
| `--resources` | `-r`  | Yes\*    | Workloads to run (`all` or comma-separated names) |

\*`--resources` is required in agent mode since there's no interactive picker.

## API Endpoints

Base URL: `http://localhost:{agentPort}`

### Health Check

```
GET /trpc/health
```

Minimal response for polling:

```json
{ "ok": true, "phase": "ready" }
```

### Get Status

```
GET /trpc/status
```

Compact response (default):

```json
{
  "phase": "ready",
  "ready": true,
  "workloads": {
    "myApi": "http://localhost:3000",
    "myFrontend": "http://localhost:5173",
    "myFunction": "starting"
  }
}
```

Verbose response with full details:

```
GET /trpc/status?input={"verbose":true}
```

```json
{
  "phase": "ready",
  "ready": true,
  "uptime": 45,
  "workloads": [
    {
      "name": "myApi",
      "type": "container",
      "status": "running",
      "url": "http://localhost:3000",
      "port": 3000,
      "sourceDir": "/path/to/api/dist"
    },
    {
      "name": "myFrontend",
      "type": "hosting-bucket",
      "status": "running",
      "url": "http://localhost:5173",
      "sourceDir": "/path/to/frontend"
    }
  ],
  "localResources": [
    {
      "name": "myDb",
      "type": "postgres",
      "status": "running",
      "port": 5432
    }
  ],
  "logFile": "/path/to/.stacktape/dev-agent/9900-logs.txt",
  "availableWorkloads": ["myApi", "myFrontend", "myFunction"]
}
```

**Phase values:**

- `starting` - Workloads are being initialized
- `ready` - All workloads are running (or errored)
- `rebuilding` - A rebuild is in progress
- `stopping` - Shutdown initiated
- `stopped` - Server stopped

### Get Logs

```
GET /trpc/logs
GET /trpc/logs?input={"limit":100}
GET /trpc/logs?input={"workload":"myApi"}
GET /trpc/logs?input={"cursor":1706000000000}
```

Parameters:

- `limit` (number, 1-500, default: 50) - Max logs to return
- `workload` (string) - Filter by workload name
- `cursor` (number) - Unix timestamp ms, get logs after this point

Response:

```json
{
  "logs": "14:30:15 [myApi] Server started\n14:30:16 [myFrontend] Compiling...",
  "count": 2,
  "nextCursor": 1706000000001
}
```

**Cursor-based pagination:** Use `nextCursor` from the response as the `cursor` in your next request to get only new
logs.

### Rebuild Workload

```
POST /trpc/rebuild
Content-Type: application/json

{"workload": "myApi"}
```

Success:

```json
{ "ok": true }
```

Error (workload not found):

```json
{
  "ok": false,
  "error": "Workload \"myApi2\" not found",
  "available": ["myApi", "myFrontend"],
  "similar": ["myApi"]
}
```

### Rebuild All

```
POST /trpc/rebuildAll
```

```json
{ "ok": true }
```

### Stop Dev Mode

```
POST /trpc/stop
```

```json
{ "ok": true }
```

## Usage Patterns

### Polling for Ready State

```bash
# Wait for dev mode to be ready
while true; do
  status=$(curl -s http://localhost:9900/trpc/status)
  if echo "$status" | jq -e '.ready == true' > /dev/null; then
    echo "Ready!"
    break
  fi
  sleep 1
done
```

### Streaming Logs

```bash
cursor=0
while true; do
  response=$(curl -s "http://localhost:9900/trpc/logs?input={\"cursor\":$cursor}")
  logs=$(echo "$response" | jq -r '.logs')
  if [ -n "$logs" ] && [ "$logs" != "" ]; then
    echo "$logs"
  fi
  cursor=$(echo "$response" | jq -r '.nextCursor')
  sleep 1
done
```

### Rebuild After Code Change

```bash
# Edit code...
curl -X POST http://localhost:9900/trpc/rebuild -d '{"workload":"myApi"}'

# Wait for rebuild
while true; do
  status=$(curl -s http://localhost:9900/trpc/status | jq -r '.workloads.myApi')
  if [ "$status" != "starting" ]; then
    echo "Rebuild complete: $status"
    break
  fi
  sleep 0.5
done
```

## Log Format

Logs use a compact format to minimize token usage:

```
HH:MM:SS [source] message
HH:MM:SS [source] WARN warning message
HH:MM:SS [source] ERROR error message
```

Examples:

```
14:30:15 [myApi] Container started on port 3000
14:30:16 [myFrontend] Dev server ready at http://localhost:5173
14:30:17 [system] All workloads started successfully
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "ok": false,
  "error": "Description of what went wrong"
}
```

Common errors:

- `Workload "X" not found` - Check `available` field for valid names
- `Invalid JSON in request body` - Malformed JSON
- `Validation error: ...` - Missing or invalid parameters
- `Use POST for rebuild` - Wrong HTTP method

## Tips for AI Agents

1. **Start simple:** Use compact status first, only request verbose when needed
2. **Use cursors:** For logs, always use `nextCursor` to avoid re-fetching
3. **Check ready:** Before making requests, check `phase === "ready"`
4. **Use sourceDir:** When debugging errors, the `sourceDir` field shows where source files are
5. **Limit logs:** Default limit is 50, increase only if needed
6. **Rebuild smartly:** Rebuild specific workloads, not all, when possible
