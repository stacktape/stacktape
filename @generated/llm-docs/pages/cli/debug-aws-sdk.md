# debug:aws-sdk

The `stacktape debug:aws-sdk` command executes read-only AWS SDK v3 operations against resources in your AWS account. Use it to list Lambda functions, describe DynamoDB tables, inspect S3 objects, or query any supported AWS service directly from your terminal — without risk of accidental writes.

## Usage

```bash
stacktape debug:aws-sdk --region eu-west-1 --service lambda --command ListFunctions
```

The command requires three flags: `--service` (the AWS service to target), `--command` (the SDK operation name), and `--region`. An optional `--input` flag passes JSON parameters to the operation.


## CLI Options: `stacktape debug:aws-sdk`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--command (-cmd)` | yes | `string` | AWS SDK Command AWS SDK command name (e.g., ListFunctions, Scan, GetObject). | - |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--service` | yes | `string` | AWS SDK Service AWS service name (e.g., lambda, dynamodb, s3, logs). | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--input` | no | `string` | AWS SDK Input JSON string containing the command input parameters. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console.

`info`: Basic information about the operation.
`error`: Only errors.
`debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format:

`jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.
`plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.
`tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.
If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--stage (-s)` | no | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |


## Read-only enforcement

Only operations whose names start with `List`, `Get`, `Describe`, `Head`, or `Batch` are allowed. Attempting any other operation — such as `PutItem`, `DeleteFunction`, or `Scan` — returns an error listing the allowed prefixes. This restriction makes the command safe for inspecting production stacks without risk of accidental writes or data modification.


> **Warning:** Operation names are prefix-matched. `GetItem` and `ListTables` are valid. `Scan`, `Query`, and `FilterLogEvents` are not — they don't start with an allowed prefix. For DynamoDB scans, use [`debug:dynamodb`](/cli/debug-dynamodb) instead.


## Discovering services and commands

The command supports multiple AWS services. Run without `--service` to see the full list of supported service names. Common services include `lambda`, `dynamodb`, `s3`, and `logs`.

If `--command` is missing, Stacktape raises a missing-required-flag error. When the service is recognized, the error detail includes example commands for that service — a quick way to discover available operations without leaving the terminal.

```bash
stacktape debug:aws-sdk --region eu-west-1 --service dynamodb
```

This prints the supported DynamoDB operations (e.g. `ListTables`, `DescribeTable`, `GetItem`). Command names match AWS SDK v3 class names without the `Command` suffix — `ListFunctions` maps to `ListFunctionsCommand`.

## Passing input parameters

Use the `--input` flag with a JSON string to pass parameters to the SDK command. The JSON structure matches the AWS SDK v3 input type for that operation.

List objects in a specific S3 bucket:

```bash
stacktape debug:aws-sdk --region eu-west-1 --service s3 --command ListObjectsV2 --input '{"Bucket": "my-bucket", "MaxKeys": 20}'
```

Describe a DynamoDB table:

```bash
stacktape debug:aws-sdk --region eu-west-1 --service dynamodb --command DescribeTable --input '{"TableName": "my-table"}'
```

Get a specific item from DynamoDB:

```bash
stacktape debug:aws-sdk --region eu-west-1 --service dynamodb --command GetItem --input '{"TableName": "my-table", "Key": {"id": {"S": "user-123"}}}'
```

Fetch recent log events from a Lambda function's log group:

```bash
stacktape debug:aws-sdk --region eu-west-1 --service logs --command GetLogEvents --input '{"logGroupName": "/aws/lambda/my-func", "logStreamName": "2024/01/15/[$LATEST]abc123"}'
```

Refer to the [AWS SDK v3 documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/) for the exact input schema of each command.

## Output

In normal mode, the command prints `<service>.<command> result:` followed by the pretty-printed JSON response returned by the AWS SDK executor.

In agent mode (`--agent`), the command prints JSON containing `ok`, `service`, `command`, and `data` fields. This is useful for programmatic consumption by scripts or AI coding assistants.

## No config file required

Unlike most Stacktape commands, `debug:aws-sdk` does not require a Stacktape configuration file. You need valid AWS credentials and the `--region` flag. Use `--profile` to select an AWS profile, or `--awsAccount` to use a connected AWS account from the [Stacktape Console](/stacktape-console/connecting-your-aws-account). This makes the command useful for quick inspection of any AWS account you have access to.

## Examples

### List all Lambda functions in a region

```bash
stacktape debug:aws-sdk --region us-east-1 --service lambda --command ListFunctions
```

### Describe a specific Lambda function

```bash
stacktape debug:aws-sdk --region eu-west-1 --service lambda --command GetFunction --input '{"FunctionName": "my-project-prod-api"}'
```

### List DynamoDB tables

```bash
stacktape debug:aws-sdk --region eu-west-1 --service dynamodb --command ListTables
```

### Describe a specific ECS service

```bash
stacktape debug:aws-sdk --region eu-west-1 --service ecs --command DescribeServices --input '{"cluster": "my-cluster", "services": ["my-service"]}'
```

### Check CloudFormation stack status

```bash
stacktape debug:aws-sdk --region eu-west-1 --service cloudformation --command DescribeStacks --input '{"StackName": "my-project-prod"}'
```

### Get a secret value

```bash
stacktape debug:aws-sdk --region eu-west-1 --service secretsmanager --command GetSecretValue --input '{"SecretId": "my-secret"}'
```

### List CloudWatch alarms in ALARM state

```bash
stacktape debug:aws-sdk --region eu-west-1 --service cloudwatch --command DescribeAlarms --input '{"StateValue": "ALARM"}'
```

### Batch-get multiple DynamoDB items

```bash
stacktape debug:aws-sdk --region eu-west-1 --service dynamodb --command BatchGetItem --input '{"RequestItems": {"my-table": {"Keys": [{"id": {"S": "user-1"}}, {"id": {"S": "user-2"}}]}}}'
```

### Use agent mode for machine-readable output

```bash
stacktape debug:aws-sdk --region eu-west-1 --service lambda --command ListFunctions --agent
```

## Related commands

- [`debug:logs`](/cli/debug-logs) — fetch and filter logs from deployed resources
- [`debug:metrics`](/cli/debug-metrics) — fetch CloudWatch metrics for a resource
- [`debug:dynamodb`](/cli/debug-dynamodb) — higher-level DynamoDB operations (scan, query, get, schema)
- [`debug:container-exec`](/cli/debug-container-exec) — execute commands inside running containers

## FAQ

### When should I use debug:aws-sdk instead of the specialized debug commands?

Use `debug:aws-sdk` when the specialized commands ([`debug:logs`](/cli/debug-logs), [`debug:dynamodb`](/cli/debug-dynamodb), [`debug:redis`](/cli/debug-redis), [`debug:sql`](/cli/debug-sql)) don't cover the AWS service you need to inspect. It gives you direct access to any supported AWS SDK v3 read-only operation, making it the most flexible debugging tool. For common tasks — fetching logs, querying DynamoDB, or inspecting Redis — the specialized commands are faster to use and require fewer flags.

### Can I use debug:aws-sdk to modify resources?

No. The command enforces read-only access by only allowing operations whose names start with `List`, `Get`, `Describe`, `Head`, or `Batch`. Any other operation — including `PutItem`, `DeleteFunction`, `Scan`, or `UpdateTable` — is rejected with an error before the request reaches AWS.

### Do I need a Stacktape config file to use this command?

No. Unlike [`deploy`](/cli/deploy) or [`dev`](/cli/dev), this command does not require a `stacktape.ts` or `stacktape.yml` file. You need valid AWS credentials (via `--profile` or `--awsAccount`) and the `--region` flag. This makes it useful for ad-hoc inspection of any AWS account.

### How do I find out which services and commands are supported?

Run the command without `--service` to see all supported service names. Run with `--service` but without `--command` to see example operations for that service. Command names follow AWS SDK v3 naming — they match the SDK class names without the `Command` suffix. For the full operation list per service, check the [AWS SDK v3 documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/).

### How is the --input flag structured?

The `--input` flag accepts a JSON string matching the AWS SDK v3 input type for the chosen command. For example, `GetItem` expects `{"TableName": "name", "Key": {...}}`, and `DescribeStacks` expects `{"StackName": "name"}`. If the JSON is malformed, Stacktape returns a parse error with guidance. Refer to the AWS SDK v3 docs for each command's expected input shape.

### Can I use this command in CI/CD pipelines?

Yes. Use `--agent` to get structured JSON output containing `ok`, `service`, `command`, and `data` fields. This makes it straightforward to parse in scripts or chain with other tools. Without `--agent`, the output is human-readable and includes formatting that may be harder to parse programmatically.

### What happens if I get an AccessDeniedException?

An `AccessDeniedException` means your AWS credentials lack the IAM permissions for that operation. Either adjust the IAM policy attached to your AWS profile or role, or use `--awsAccount` to switch to a connected account with the required permissions. If the AWS SDK executor returns a hint, Stacktape includes it with the error message.

### What's the difference between debug:aws-sdk and the AWS CLI?

Both let you call AWS APIs. `debug:aws-sdk` initializes debug-agent credentials automatically, enforces read-only operations to prevent accidents in production, and integrates with Stacktape's credential management (`--profile`, `--awsAccount`). The AWS CLI gives full read-write access and requires you to manage credentials separately. Use `debug:aws-sdk` when you want a safety net; use the AWS CLI when you need write operations or unsupported services.

### Can I query resources across multiple regions?

Each invocation targets a single region specified by `--region`. To inspect resources across regions, run the command once per region. In scripts, you can loop over regions and use `--agent` for structured output that's easy to aggregate.
