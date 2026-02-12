# Phase 0: Contracts

Define all API shapes, schemas, and error codes before writing implementation code. This avoids schema churn during
later phases.

## MCP Tool API Shapes

### Tool 1: `stacktape_docs`

```typescript
// Input
type StacktapeDocsInput = {
  query: string;
  mode?: "answer" | "reference" | "snippet"; // default: 'answer'
  resourceType?: string; // e.g. 'function', 'web-service', 'relational-database'
  maxItems?: number; // default: 3
};

// Output
type StacktapeDocsOutput = {
  answer: string; // concise natural-language answer
  references: {
    title: string;
    path: string; // relative path within ai-docs corpus
    docType: "config-ref" | "recipe" | "concept" | "troubleshooting" | "getting-started" | "cli-ref";
  }[];
  snippets?: {
    language: string; // 'typescript' | 'yaml'
    code: string;
  }[];
  nextQueries?: string[]; // suggested follow-up queries
};
```

Description for discoverability:

```
Search Stacktape documentation for configuration help, resource types, deployment
patterns, and troubleshooting.

Use this tool when:
- User mentions Stacktape, deploying to AWS, or cloud infrastructure
- The project has a stacktape.ts, stacktape.yml, or stacktape.yaml file
- User needs help with Stacktape configuration, resource types, or deployment commands
- User asks about AWS Lambda, ECS, RDS, S3, DynamoDB, or similar AWS services in a deployment context
```

### Tool 2: `stacktape_ops`

```typescript
type StacktapeOpsInput = {
  operation:
    | "preview_changes"
    | "deploy"
    | "delete"
    | "rollback"
    | "script_run"
    | "compile_template"
    | "secret_create"
    | "secret_get"
    | "secret_delete";
  args: {
    projectName?: string;
    stage?: string;
    region?: string;
    configPath?: string;
    resourceName?: string;
    scriptName?: string;
    secretName?: string;
    secretValue?: string;
    // ... other per-operation args
  };
  confirm?: boolean; // required true for destructive ops (delete)
};

type StacktapeOpsOutput = {
  ok: boolean;
  code: string; // e.g. 'OK', 'VALIDATION_ERROR', 'DEPLOY_FAILED'
  message: string; // human-readable summary
  data?: object; // structured result (stack outputs, changeset, etc.)
  rawTail?: string; // last N lines of CLI output (bounded)
  nextActions?: string[];
};
```

Description:

```
Execute Stacktape infrastructure operations: deploy, delete, preview changes,
manage secrets, run scripts.

Use this tool when:
- User wants to deploy, delete, or preview infrastructure changes
- User needs to manage secrets or run deployment scripts
- The project uses Stacktape for AWS infrastructure
```

### Tool 3: `stacktape_dev`

```typescript
type StacktapeDevInput = {
  operation: "start" | "status" | "logs" | "rebuild" | "rebuild_all" | "stop";
  args: {
    // for 'start':
    stage?: string;
    region?: string;
    resources?: string[]; // e.g. ['all'] or ['myApi', 'myDb']
    configPath?: string;
    agentPort?: number;
    freshDb?: boolean;
    // for 'logs':
    limit?: number;
    cursor?: number;
    workload?: string;
    // for 'rebuild':
    workload?: string;
  };
};

type StacktapeDevOutput = {
  ok: boolean;
  code: string;
  message: string;
  data?: {
    // for 'start': agentPort, pid, workloads
    // for 'status': phase, ready, workloads map
    // for 'logs': logs text, count, nextCursor
    // for 'rebuild': confirmation
    [key: string]: unknown;
  };
  nextActions?: string[];
};
```

Description:

```
Control Stacktape dev mode: start local development environment, check status,
read logs, rebuild workloads, and stop.

Use this tool when:
- User wants to run their Stacktape app locally for development
- User needs to see logs, rebuild after code changes, or stop dev mode
- An active dev session needs management
```

### Tool 4: `stacktape_diagnose`

```typescript
type StacktapeDiagnoseInput = {
  operation:
    | "info_stack"
    | "info_stacks"
    | "info_operations"
    | "info_whoami"
    | "logs"
    | "metrics"
    | "alarms"
    | "container_exec"
    | "sql"
    | "dynamodb"
    | "redis"
    | "opensearch"
    | "aws_sdk";
  args: {
    projectName?: string;
    stage?: string;
    region?: string;
    configPath?: string;
    resourceName?: string;
    // per-operation args (sql query, metric name, etc.)
    [key: string]: unknown;
  };
};

type StacktapeDiagnoseOutput = {
  ok: boolean;
  code: string;
  message: string;
  data?: object;
  rawTail?: string;
  nextActions?: string[];
};
```

Description:

```
Diagnose and inspect deployed Stacktape infrastructure: view logs, metrics, alarms,
query databases, execute commands in containers, and call AWS SDK.

Use this tool when:
- User needs to debug a deployed application
- User wants to view logs, metrics, or alarm states
- User needs to query a database or inspect container state
- User wants to check stack info or deployment history
```

## NDJSON Event Stream Schema (CLI `--agent` output)

When CLI runs with `--agent`, stdout emits one JSON object per line (NDJSON/JSONL).

### Event types

```typescript
// Progress event (emitted during long-running operations)
type ProgressEvent = {
  v: "1.0";
  type: "progress";
  phase: string; // e.g. 'packaging', 'uploading', 'deploying', 'creating'
  message: string; // human-readable progress text
  ts: string; // ISO timestamp
  pct?: number; // optional 0-100 percentage
};

// Log event (emitted for workload/resource logs)
type LogEvent = {
  v: "1.0";
  type: "log";
  source: string; // resource/workload name
  level: "info" | "warn" | "error";
  message: string;
  ts: string;
};

// Final result event (always the last line)
type ResultEvent = {
  v: "1.0";
  type: "result";
  ok: boolean;
  code: string; // e.g. 'OK', 'DEPLOY_FAILED', 'VALIDATION_ERROR', 'TIMEOUT'
  message: string;
  data?: object; // structured command-specific payload
};
```

### Example NDJSON stream (deploy)

```
{"v":"1.0","type":"progress","phase":"packaging","message":"Building function api","ts":"2026-02-12T10:00:01Z"}
{"v":"1.0","type":"progress","phase":"uploading","message":"Uploading artifacts","ts":"2026-02-12T10:00:05Z","pct":40}
{"v":"1.0","type":"progress","phase":"deploying","message":"Updating CloudFormation stack","ts":"2026-02-12T10:00:10Z","pct":60}
{"v":"1.0","type":"progress","phase":"deploying","message":"Stack update complete","ts":"2026-02-12T10:03:00Z","pct":100}
{"v":"1.0","type":"result","ok":true,"code":"OK","message":"Deploy completed","data":{"stackName":"my-project-dev","outputs":{"apiUrl":"https://..."}}}
```

### Error codes

| Code                    | Meaning                               |
| ----------------------- | ------------------------------------- |
| `OK`                    | Success                               |
| `VALIDATION_ERROR`      | Missing/invalid arguments             |
| `DEPLOY_FAILED`         | CloudFormation deployment failed      |
| `DELETE_FAILED`         | Stack deletion failed                 |
| `ROLLBACK_FAILED`       | Rollback operation failed             |
| `TIMEOUT`               | Operation exceeded max wait time      |
| `AUTH_ERROR`            | API key or AWS credentials issue      |
| `NOT_FOUND`             | Stack/resource/secret not found       |
| `ALREADY_EXISTS`        | Resource already exists (e.g. secret) |
| `READ_ONLY_VIOLATION`   | Attempted write in read-only context  |
| `CONFIRMATION_REQUIRED` | Destructive op without confirm=true   |
| `INTERNAL_ERROR`        | Unexpected failure                    |

## Dev Agent HTTP API Normalization

Existing dev agent HTTP endpoints keep their paths but normalize response shape:

```typescript
// All dev agent responses use this envelope
type DevAgentResponse = {
  v: "1.0";
  ok: boolean;
  code: string;
  message?: string;
  data?: object;
};
```

## Exit criteria

- All type definitions above are finalized and documented.
- At least one sample payload per MCP tool (input + output).
- NDJSON event types and error codes are locked.
- Dev agent response envelope is defined.
