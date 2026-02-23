# Stacktape Development Mode

Use `stacktape dev` to run your application locally while connecting to AWS resources.

## Starting Dev Mode

```bash
stacktape dev --agent \
  --projectName <project> \
  --stage <stage> \
  --region <region> \
  --configPath ./stacktape.ts
```

**Key Flags:**
- `--agent`: Enables the HTTP API for AI agents.
- `--stage`: Must be unique for your session (e.g., `dev-user-1`).
- `--freshDb`: Wipes local database data on start.
- `--resources`: Comma-separated list of resources to run (defaults to interactive picker).

## Agent API

When running with `--agent`, Stacktape exposes a local HTTP server (port printed on startup, usually random or specified via `--agentPort`).

### Workflow

1.  **Start**: Run `stacktape dev --agent ...`
2.  **Wait**: Poll `GET /health` until `{"phase": "ready"}`.
3.  **Interact**: Use the API to query databases, invoke functions, etc.
4.  **Rebuild**: Call `POST /rebuild/:workload` after editing code.
5.  **Stop**: Call `POST /stop` or kill the process.

### Endpoints

-   `GET /health`: Check status.
-   `POST /rebuild/:workload`: Rebuild a specific resource (e.g., `myFunc`).
-   `POST /stop`: Gracefully stop.
-   `POST /postgres/:resourceName/query`: Execute SQL.
-   `POST /aws/cli`: Execute AWS CLI commands scoped to the stack.

## Database Access

SQL databases (Postgres, MySQL) are emulated locally.

```bash
# Query
curl -X POST http://localhost:<port>/postgres/myDb/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM users"}'
```

## AWS CLI Proxy

Execute AWS commands against the stack's resources without configuring local credentials.

```bash
curl -X POST http://localhost:<port>/aws/cli \
  -d '{"command": "lambda list-functions"}'
```
