# aws:call

The `aws:call` command executes read-only AWS SDK v3 operations directly from the Stacktape CLI. Use it to inspect Lambda functions, check CloudFormation stacks, list S3 objects, describe database instances, or call any supported AWS SDK operation whose command name starts with `List`, `Get`, `Describe`, `Head`, or `Batch`.

## What it does

Stacktape `aws:call` wraps the AWS SDK v3 and restricts usage to operations whose command name starts with a read-only prefix. You specify an AWS service name, a command name, and optional JSON input parameters. Stacktape initializes credentials for the call, sends the request, and prints the JSON response. Use `--profile` to select a local AWS profile, or `--awsAccount` to use a connected AWS account from the [Stacktape Console](/stacktape-console/console-overview).

Only commands whose name starts with one of these prefixes are allowed:

| Prefix | Examples |
|---|---|
| `List` | `ListFunctions`, `ListBuckets`, `ListTables`, `ListObjectsV2` |
| `Get` | `GetFunction`, `GetCallerIdentity`, `GetItem`, `GetLogEvents` |
| `Describe` | `DescribeStacks`, `DescribeDBInstances`, `DescribeTable`, `DescribeLogGroups` |
| `Head` | `HeadObject` |
| `Batch` | `BatchGetItem`, `BatchGetTraces` |

Attempting a command that doesn't start with one of these prefixes (e.g. `PutItem`, `DeleteObject`) fails with a clear error naming the allowed prefixes. Note that this guard is prefix-based — it blocks commands like `PutItem` or `DeleteFunction`, but a command like `BatchWriteItem` would pass the prefix check because it starts with `Batch`. In practice, the allowed prefixes cover the standard read/list/describe operations used for inspecting AWS resources.

## Usage

Three flags are required: `--service`, `--command`, and `--region`. The `--stage` and `--projectName` flags are optional — `aws:call` does not require a Stacktape configuration file.

List all Lambda functions in a region:

```bash
stacktape aws:call --region us-east-1 --service lambda --command ListFunctions
```

Describe a specific CloudFormation stack:

```bash
stacktape aws:call --region eu-west-1 --service cloudformation --command DescribeStacks --input '{"StackName": "my-project-prod"}'
```

Check which AWS identity the CLI is using:

```bash
stacktape aws:call --region us-east-1 --service sts --command GetCallerIdentity
```

You can include `--stage` for consistency with other Stacktape commands, though it is not required:

```bash
stacktape aws:call --stage prod --region eu-west-1 --service rds --command DescribeDBInstances
```

## Important flags

### `--service`

The AWS service to call (e.g. `lambda`, `dynamodb`, `s3`, `cloudformation`, `rds`, `logs`, `ecs`). If `--service` is omitted, the CLI prints the full list of supported service names.

### `--command`

The AWS SDK v3 command name — for example `ListFunctions`, `DescribeStacks`, or `GetCallerIdentity`. Pass the command name as shown in the [AWS SDK v3 documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/) (e.g. `ListFunctions`, not `ListFunctionsCommand`). The `Command` suffix is not required.

When `--command` is omitted and `--service` is a recognized service, the CLI prints example commands for that service.

### `--input`

A JSON string containing the command's input parameters. The keys and values match the AWS SDK v3 input shape for the command you're calling. When omitted, the command runs with no input parameters (equivalent to `{}`).

List S3 objects under a specific prefix:

```bash
stacktape aws:call --region us-east-1 --service s3 --command ListObjectsV2 --input '{"Bucket": "my-bucket", "Prefix": "uploads/"}'
```

If the JSON is malformed, the CLI returns a parse error with guidance on the expected format.

### `--region`

The AWS region to execute the command in. Required for every `aws:call` invocation.

### `--profile`

The AWS profile to use for credentials. You can manage AWS profiles with [`aws-profile:create`](/cli/aws-profile-create). Alternatively, use `--awsAccount` to select a connected AWS account from the [Stacktape Console](/stacktape-console/console-overview).

### `--agent`

Enables agent mode for programmatic consumption. On success, the output is a JSON object containing `ok`, `service`, `command`, and `data` fields. The [Stacktape MCP server](/using-with-ai/mcp-server-setup) and AI coding agents use this flag to inspect AWS resources programmatically. Errors are raised through the CLI error path with a relevant message and hint.

## Examples

### Inspect a CloudFormation stack

Check the status and outputs of a deployed stack:

```bash
stacktape aws:call --region eu-west-1 --service cloudformation --command DescribeStacks --input '{"StackName": "my-project-prod"}'
```

### List ECS services in a cluster

```bash
stacktape aws:call --region us-east-1 --service ecs --command ListServices --input '{"cluster": "my-cluster"}'
```

### Look up a DynamoDB table schema

For table-level metadata, use `DescribeTable` via `aws:call`. For item-level queries (scan, query, get), use [`query:dynamodb`](/cli/query-dynamodb) instead — it accepts a `--resourceName` from your Stacktape stack so you don't need to look up physical table names.

```bash
stacktape aws:call --region eu-west-1 --service dynamodb --command DescribeTable --input '{"TableName": "my-table"}'
```

### Get a single DynamoDB item

```bash
stacktape aws:call --region eu-west-1 --service dynamodb --command GetItem --input '{"TableName": "users", "Key": {"userId": {"S": "abc123"}}}'
```

### List CloudWatch log groups

For viewing log events, use [`logs`](/cli/logs) instead. Use `aws:call` when you need metadata about log groups themselves.

```bash
stacktape aws:call --region us-east-1 --service logs --command DescribeLogGroups --input '{"logGroupNamePrefix": "/aws/lambda/"}'
```

### Check a secret in Secrets Manager

```bash
stacktape aws:call --region eu-west-1 --service secretsmanager --command DescribeSecret --input '{"SecretId": "my-secret"}'
```

### Get CloudWatch alarm states

```bash
stacktape aws:call --region us-east-1 --service cloudwatch --command DescribeAlarms --input '{"AlarmNamePrefix": "stp-"}'
```

### Look up an RDS database instance

```bash
stacktape aws:call --region eu-west-1 --service rds --command DescribeDBInstances --input '{"DBInstanceIdentifier": "my-db"}'
```

### Verify AWS credentials

Confirm which AWS identity the CLI is using — useful for troubleshooting permission errors:

```bash
stacktape aws:call --region us-east-1 --service sts --command GetCallerIdentity
```

## When to use `aws:call`

Stacktape provides purpose-built commands for the most common inspection tasks. Use those first — they handle resource resolution, formatting, and stack-awareness automatically. Fall back to `aws:call` when you need direct AWS API access that the purpose-built commands don't cover.

| Task | Recommended command |
|---|---|
| Read database rows | [`query:sql`](/cli/query-sql) |
| Query DynamoDB items | [`query:dynamodb`](/cli/query-dynamodb) |
| Query Redis keys | [`query:redis`](/cli/query-redis) |
| Search OpenSearch | [`query:opensearch`](/cli/query-opensearch) |
| View application logs | [`logs`](/cli/logs) |
| Check alarm states | [`alarms`](/cli/alarms) |
| View metrics | [`metrics`](/cli/metrics) |
| Run a command in a container | [`container:exec`](/cli/container-exec) |
| View stack outputs and resources | [`info:stack`](/cli/info-stack) |
| Anything not covered above | `aws:call` |


> **Tip:** Use [`query:dynamodb`](/cli/query-dynamodb) for DynamoDB item queries (scan, query, get, schema, and sample operations) and [`logs`](/cli/logs) for viewing application logs. These purpose-built commands accept `--resourceName` from your Stacktape stack — no need to look up physical table names or log group ARNs.


## Error handling

The CLI produces structured error messages for common problems:

- **Missing `--service`**: Prints the full list of supported service names so you can pick the right one.
- **Missing `--command`** with a recognized `--service`: Prints example commands for that service.
- **Disallowed command prefix**: Returns an error naming the five allowed prefixes (`List*`, `Get*`, `Describe*`, `Head*`, `Batch*`).
- **Invalid `--input` JSON**: Returns a parse error with an example of valid JSON input.
- **AWS SDK errors**: Surfaces the SDK error message. Access denied errors typically indicate missing IAM permissions.

In agent mode (`--agent`), errors are raised through the CLI error path with a message and hint, consistent with other Stacktape commands.

## Flags reference


## CLI Options: `stacktape aws:call`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--command (-cmd)` | yes | `string` | AWS SDK Command AWS SDK command name (e.g., ListFunctions, Scan, GetObject). | - |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--service` | yes | `string` | AWS SDK Service AWS service name (e.g., lambda, dynamodb, s3, logs). | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--input` | no | `string` | AWS SDK Input JSON string containing the command input parameters. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--stage (-s)` | no | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |


## Related commands

- [`logs`](/cli/logs) — Fetch and filter logs from a deployed resource.
- [`query:dynamodb`](/cli/query-dynamodb) — Query a deployed DynamoDB table by resource name.
- [`query:sql`](/cli/query-sql) — Execute read-only SQL queries against a deployed relational database.

## FAQ

### Can I run write operations with `aws:call`?

Stacktape `aws:call` rejects any command whose name does not start with `List`, `Get`, `Describe`, `Head`, or `Batch`. Attempting `PutItem` or `DeleteObject` returns an error listing the allowed prefixes. This prefix-based guard blocks most write operations, though some `Batch*` commands (e.g. `BatchWriteItem`) would pass the check. For typical inspection tasks, the guard provides a useful safety layer against accidental modifications.

### Do I need a Stacktape configuration file to use `aws:call`?

No. Unlike [`deploy`](/cli/deploy) or [`dev`](/cli/dev), the `aws:call` command does not load or require a `stacktape.ts` configuration file. It operates directly against the AWS API using your credentials. The `--stage` and `--projectName` flags are accepted but optional.

### When should I use `aws:call` instead of the AWS CLI?

Use `aws:call` when you're already working in the Stacktape CLI and want to avoid switching tools. It uses credentials from `--profile` or `--awsAccount`, enforces the prefix-based read-only guard, and produces clean JSON output. If you need full write access, advanced features like JMESPath `--query` filtering, or output formatting options, use the AWS CLI directly.

### Does `aws:call` work with AI coding agents and the MCP server?

Yes. The `--agent` flag switches successful output to structured JSON containing `ok`, `service`, `command`, and `data` fields. The [Stacktape MCP server](/using-with-ai/mcp-server-setup) and AI coding agents use this to inspect AWS resources and retrieve metadata programmatically without parsing human-readable output.

### Why does my command fail with an access denied error?

An access denied error means the credentials from your `--profile` or `--awsAccount` lack the IAM permission for that operation — `aws:call` surfaces the AWS SDK error message directly. Confirm which identity the CLI is using by running `GetCallerIdentity` against the `sts` service, then check that the identity has read access to the service you're calling.
