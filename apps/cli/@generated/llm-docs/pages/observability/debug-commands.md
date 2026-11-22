# Debug commands

These CLI commands inspect a deployed stack from your terminal. Each takes the stage and region (`--stage`,
`--region`), reads the project from your config, and runs with your AWS credentials, or through the Console when the
CLI is signed in. Except for the container and bastion sessions, they only read.

## Pick a command

| You want to | Command |
|---|---|
| Read a function's or container's logs, or follow them live | [`stacktape logs`](/cli/logs) |
| See a metric of a function, database or HTTP API | [`stacktape metrics`](/cli/metrics) |
| Check which alarms are firing | [`stacktape alarm list`](/cli/alarms) |
| Run a `SELECT` against a SQL database | [`stacktape query sql`](/cli/query-sql) |
| Look at items of a DynamoDB table | [`stacktape query dynamodb`](/cli/query-dynamodb) |
| Look at keys of a Redis cluster | [`stacktape query redis`](/cli/query-redis) |
| Search an OpenSearch domain | [`stacktape query opensearch`](/cli/query-opensearch) |
| Read the state of any other AWS resource | [`stacktape aws call`](/cli/aws-call) |
| See the stack's status, outputs and resources | [`stacktape status`](/cli/info-stack) |
| Run one command in a running container | [`stacktape container exec`](/cli/container-exec) |
| Open a shell in a running container | [`stacktape container shell`](/cli/container-session) |
| Reach a VPC-only database from your machine | [`stacktape bastion tunnel`](/cli/bastion-tunnel) |

## Logs and metrics

```bash
stacktape logs api --stage production --region eu-west-1 --since 30m
stacktape metrics api Errors --stage production --region eu-west-1 --stat Sum --since 24h
```

[Logs](/observability/logs) covers live tail, a fixed incident window, filter patterns and Logs Insights queries.
[Metrics](/observability/metrics) lists the metrics each resource type supports.

## Query a database

The `query` commands are read-only: `query sql` accepts only `SELECT`, `SHOW`, `DESCRIBE` and `EXPLAIN`, and the
DynamoDB, Redis and OpenSearch commands offer only read operations.

```bash
stacktape query sql --stage production --region eu-west-1 --resource-name mainDb --sql "SELECT count(*) FROM orders"
```

For a database that is reachable only inside the VPC, add `--bastion-resource <name>` with a
[bastion host](/resources/security/bastion-host) from your stack; the query tunnels through it and closes the tunnel
when it finishes. For a desktop database client, open a lasting tunnel with `stacktape bastion tunnel`.

## Read AWS state with aws call

```bash
stacktape aws call --stage production --region eu-west-1 --service lambda --command GetFunctionConfiguration \
  --input '{"FunctionName": "my-app-production-api"}'
```

`aws call` runs one AWS SDK operation, but only from a reviewed list of read-only operations per service. Everything
else is refused, including calls that look like reads but change state, such as SQS `ReceiveMessage`. Secret values
(`GetSecretValue`, `GetParameter`) are refused, and environment variable values of functions and containers come back
redacted. Log events and S3 objects come back as they are. A refusal lists the operations the service accepts.

The call runs with the stack's own read-only debug role, not your credentials. If the stack has no such role, or the
role can't be assumed, the command fails. A stack whose first deploy failed before it had outputs accepts only
CloudFormation reads of that stack.

## Get into a container

`container exec` runs one command in a running container and returns its output; `container shell` opens an
interactive shell. Both change nothing by themselves, but whatever you run inside a live container can. Both need
remote sessions turned on for the workload. See [Debugging deployed containers](/observability/debugging-containers).

## Use them from a coding agent

With `--agent`, or when a coding agent runs them through the [Stacktape MCP server](/using-with-ai/mcp-server-setup),
the commands print JSON. A `logs` read returns `{ logGroup, events }`; a Logs Insights query returns
`{ logGroup, query, results }`.

The AWS calls behind these commands are billed as usual. Logs Insights queries (`logs --query`) are billed by the data
they scan.
