# Debug Commands Implementation Plan

## Overview

Rename and enhance existing commands, add new debugging capabilities for deployed applications.

## Command Renames (Breaking Changes)

| Old Command         | New Command               | Status       |
| ------------------- | ------------------------- | ------------ |
| `logs`              | `debug:logs`              | To implement |
| `container:session` | `debug:container:session` | To implement |
| `bastion:tunnel`    | `debug:bastion:tunnel`    | To implement |

## New Commands

| Command         | Purpose                      | Status       |
| --------------- | ---------------------------- | ------------ |
| `debug:metrics` | View CloudWatch metrics      | To implement |
| `debug:alarms`  | View CloudWatch alarm states | To implement |

---

## 1. `debug:logs` (rename from `logs`)

### Changes Required

- Rename command in `commands.ts`
- Update command file location: `src/commands/logs/` -> `src/commands/debug-logs/`
- Add CloudWatch Logs Insights query support for agent mode
- Support structured output format

### New Flags

```
--query         CloudWatch Logs Insights query (agent mode)
--logGroup      Direct log group name (optional, alternative to resourceName)
--tail          Stream logs in real-time
--limit         Max number of log events (default: 100)
--startTime     ISO timestamp or relative (e.g., "1h", "30m")
--endTime       ISO timestamp (default: now)
```

### Agent Mode Output Format

```json
{
  "logGroup": "/aws/lambda/myStack-myFunc",
  "events": [{ "timestamp": "2024-01-15T10:30:00Z", "message": "...", "logStream": "..." }],
  "nextToken": "..."
}
```

### CloudWatch Logs Insights Query Support

```bash
# Using native CloudWatch Logs Insights syntax
stacktape debug:logs --agent \
  --projectName myapp --stage prod --region eu-west-1 \
  --resourceName myLambda \
  --query "fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 50"
```

---

## 2. `debug:container:session` (rename from `container:session`)

### Changes Required

- Rename command
- Add `--taskArn` flag for agent mode (skip interactive task selection)
- Add `--command` flag for non-interactive command execution
- Agent mode: if `--command` provided, execute and return output; otherwise return connection instructions

### New Flags

```
--taskArn       Specific ECS task ARN (required in agent mode if multiple tasks)
--command       Command to execute (non-interactive)
--timeout       Command timeout in seconds (default: 30)
```

### Agent Mode Behavior

- If `--command` provided: Execute command, capture output, return result
- If no `--command`: Return error with instructions for manual connection

### Agent Mode Output (with --command)

```json
{
  "taskArn": "arn:aws:ecs:...",
  "container": "myContainer",
  "command": "cat /app/config.json",
  "exitCode": 0,
  "output": "{ ... }",
  "stderr": ""
}
```

### Agent Mode Output (without --command)

```
[x] CLI Error

Interactive session not supported in agent mode.

Hints:
  -> Use --command to execute a specific command
  -> Available tasks: arn:aws:ecs:...:task/abc123 (started: 2024-01-15T10:00:00Z)
  -> Example: stacktape debug:container:session --agent --resourceName myService --taskArn <arn> --command "ls -la"
```

---

## 3. `debug:bastion:tunnel` (rename from `bastion:tunnel`)

### Changes Required

- Rename command
- Agent mode: Start tunnel, return connection details, optionally run in background

### New Flags

```
--background    Start tunnel in background, return connection info immediately
--timeout       Auto-close tunnel after N seconds (with --background)
```

### Agent Mode Behavior

- With `--background`: Start tunnel, return connection details, don't block
- Without `--background`: Return error suggesting --background flag

### Agent Mode Output (with --background)

```json
{
  "tunnels": [
    {
      "resource": "myDatabase",
      "localPort": 15432,
      "remoteHost": "mydb.cluster-xxx.eu-west-1.rds.amazonaws.com",
      "remotePort": 5432,
      "connectionString": "postgresql://user:pass@127.0.0.1:15432/mydb"
    }
  ],
  "pid": 12345,
  "message": "Tunnel running. Kill with: kill 12345"
}
```

---

## 4. `debug:metrics` (new)

### Purpose

Fetch CloudWatch metrics for stack resources.

### Flags

```
--resourceName  Stacktape resource name (required)
--metric        Metric name (e.g., "Invocations", "CPUUtilization")
--period        Aggregation period in seconds (default: 300)
--stat          Statistic: Sum, Average, Maximum, Minimum, p99 (default: Average)
--startTime     ISO timestamp or relative (default: "1h")
--endTime       ISO timestamp (default: now)
```

### Supported Resource Types & Metrics

| Resource Type | Available Metrics                                                                  |
| ------------- | ---------------------------------------------------------------------------------- |
| Lambda        | Invocations, Errors, Duration, Throttles, ConcurrentExecutions                     |
| ECS Service   | CPUUtilization, MemoryUtilization, RunningTaskCount                                |
| RDS           | CPUUtilization, DatabaseConnections, FreeStorageSpace, ReadLatency, WriteLatency   |
| API Gateway   | Count, 4XXError, 5XXError, Latency, IntegrationLatency                             |
| SQS Queue     | NumberOfMessagesSent, NumberOfMessagesReceived, ApproximateNumberOfMessagesVisible |

### Agent Mode Output

```json
{
  "resource": "myLambda",
  "metric": "Errors",
  "period": 300,
  "stat": "Sum",
  "datapoints": [
    { "timestamp": "2024-01-15T10:00:00Z", "value": 5 },
    { "timestamp": "2024-01-15T10:05:00Z", "value": 0 }
  ],
  "unit": "Count"
}
```

---

## 5. `debug:alarms` (new)

### Purpose

View CloudWatch alarm states for stack resources.

### Flags

```
--resourceName  Filter by Stacktape resource name (optional)
--state         Filter by state: OK, ALARM, INSUFFICIENT_DATA (optional)
```

### Agent Mode Output

```json
{
  "alarms": [
    {
      "name": "myStack-myLambda-ErrorRate",
      "resource": "myLambda",
      "state": "OK",
      "metric": "Errors",
      "threshold": "5",
      "comparison": "GreaterThanThreshold",
      "lastUpdated": "2024-01-15T10:30:00Z"
    },
    {
      "name": "myStack-myDb-CPUUtilization",
      "resource": "myDb",
      "state": "ALARM",
      "metric": "CPUUtilization",
      "threshold": "80",
      "comparison": "GreaterThanThreshold",
      "lastUpdated": "2024-01-15T10:25:00Z",
      "reason": "Threshold Crossed: 1 datapoint [85.2] was greater than the threshold (80.0)"
    }
  ]
}
```

---

## Implementation Order

1. **Add CloudWatch client to AWS SDK manager** - Required for metrics/alarms
2. **`debug:alarms`** - Simpler, good starting point
3. **`debug:metrics`** - Builds on CloudWatch client
4. **`debug:logs`** - Rename + enhance with Insights queries
5. **`debug:container:session`** - Rename + add command execution
6. **`debug:bastion:tunnel`** - Rename + add background mode

---

## Files to Create/Modify

### New Files

- `src/commands/debug-logs/index.ts`
- `src/commands/debug-container-session/index.ts`
- `src/commands/debug-bastion-tunnel/index.ts`
- `src/commands/debug-metrics/index.ts`
- `src/commands/debug-alarms/index.ts`

### Modified Files

- `src/config/cli/commands.ts` - Add new command definitions, remove old
- `src/config/cli/options.ts` - Add new flags
- `src/index.ts` - Import new command executors
- `shared/aws/sdk-manager/index.ts` - Add CloudWatch client methods
- `skills/SKILL.md` - Document debug commands

### Files to Delete

- `src/commands/logs/` (replaced by debug-logs)
- `src/commands/container-session/` (replaced by debug-container-session)
- `src/commands/bastion-tunnel/` (replaced by debug-bastion-tunnel)
