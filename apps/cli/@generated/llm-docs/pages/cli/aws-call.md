# aws:call

The `aws:call` command sends a reviewed read-only AWS SDK v3 operation against resources in a deployed Stacktape
stack. Use it when Stacktape's purpose-built inspection commands do not expose the AWS data you need.

## Safety model

Stacktape uses an explicit allowlist for every supported AWS service. A command is accepted only when its exact
service and operation pair has been reviewed and appears in that service's list.

This is not a prefix check. An operation is not accepted merely because its name begins with `Get`, `List`,
`Describe`, `Head`, or `Batch`. For example, Stacktape rejects:

- DynamoDB `BatchWriteItem`, because it writes data.
- SQS `ReceiveMessage`, because it hides messages from their consumers for the visibility timeout.
- Step Functions `GetActivityTask`, because it claims work and starts the task timeout.

Unknown services and unlisted operations are rejected. The error includes the operations that `aws:call` accepts for
the selected service. Coverage is deliberately incomplete: a genuinely read-only operation remains unavailable until
it has been reviewed and added to the service's allowlist.

The allowlist is the command's read-only guard, not an IAM permission boundary. Stacktape prefers the deployed stack's
debug role when it is available. If that role is unavailable or cannot be assumed, the command falls back to the
caller's selected AWS credentials. An accepted operation therefore runs with the permissions of the credentials that
are ultimately used.

## Target stack and credentials

`aws:call` always initializes services for an existing deployed Stacktape stack. It does not require a local
`stacktape.ts` file, but it does require enough information to identify a deployed stack:

- `--region` is required.
- `--projectName` and `--stage` may be omitted only when your configured Stacktape defaults already identify the
  target stack.
- Otherwise, provide the missing `--projectName` and `--stage` values explicitly.

Use `--profile` to select a local AWS profile or `--awsAccount` to select a connected Stacktape AWS account. These
credentials are also the fallback when the deployed stack's debug role is unavailable.

## Basic usage

List Lambda functions visible to the target stack's debug role or credential fallback:

```bash
stacktape aws:call \
  --projectName my-project \
  --stage production \
  --region eu-west-1 \
  --service lambda \
  --command ListFunctions
```

Pass command input as JSON:

```bash
stacktape aws:call \
  --projectName my-project \
  --stage production \
  --region eu-west-1 \
  --service dynamodb \
  --command Scan \
  --input '{"TableName":"my-table","Limit":10}'
```

If project and stage defaults are configured, you can omit those two flags:

```bash
stacktape aws:call \
  --region eu-west-1 \
  --service logs \
  --command FilterLogEvents \
  --input '{"logGroupName":"/aws/lambda/my-function","limit":20}'
```

The command prints the AWS response as JSON. In agent mode, the response is wrapped in a structured object containing
`ok`, `service`, `command`, and `data`.

## Choosing the right command

Prefer Stacktape's resource-aware commands when one exists. They resolve Stacktape resource names, apply
resource-specific validation, and usually provide more useful output.

| Task                                    | Preferred command                           |
| --------------------------------------- | ------------------------------------------- |
| Read function or service logs           | [`logs`](/cli/logs)                         |
| Inspect CloudWatch metrics              | [`metrics`](/cli/metrics)                   |
| Inspect a Stacktape DynamoDB table      | [`query:dynamodb`](/cli/query-dynamodb)     |
| Inspect a Stacktape relational database | [`query:sql`](/cli/query-sql)               |
| Inspect a Stacktape Redis cluster       | [`query:redis`](/cli/query-redis)           |
| Inspect a Stacktape OpenSearch domain   | [`query:opensearch`](/cli/query-opensearch) |
| Call another reviewed read-only AWS API | `aws:call`                                  |

## CLI options


## CLI Options: `stacktape aws:call`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--command (-cmd)` | yes | `string` | AWS SDK Command — AWS SDK command name (e.g., ListFunctions, Scan, GetObject). | - |
| `--region (-r)` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--service` | yes | `string` | AWS SDK Service — AWS service name (e.g., lambda, dynamodb, s3, logs). | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode — Optimizes CLI output for programmatic/LLM consumption: • Uses strict JSONL/NDJSON output (one JSON object per line) • Disables interactive terminal UI • Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--help (-h)` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--input` | no | `string` | AWS SDK Input — JSON string containing the command input parameters. | - |
| `--logLevel (-ll)` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format — Controls the CLI output format: • `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. • `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. • `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name — The name of the Stacktape project for this operation. | - |
| `--stage (-s)` | no | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--ui (-ui)` | no | `string` | Terminal UI — Controls the interactive presentation when output format is `tty`: • `auto`: Uses native terminal scrollback for verbose phases and a fullscreen dashboard for structured deployment phases. • `stream`: Keeps native terminal scrollback visible and only redraws currently active work. • `dashboard`: Uses the fullscreen interactive dashboard for the whole command. Press Ctrl+T during a command to switch views and pin that choice for the rest of the run. | `auto`, `stream`, `dashboard` |


## Troubleshooting

### The service is not supported

The service has no reviewed operations in the `aws:call` allowlist. Use a Stacktape purpose-built command, use the AWS
CLI directly when appropriate, or request review of the specific read-only operation you need.

### The operation is rejected

The exact service and operation pair is not allowlisted. The error lists the operations accepted for that service.
Do not infer support from the operation's verb prefix.

### The target stack cannot be found

Confirm that the stack is already deployed in the selected region. Then provide `--projectName` and `--stage`, or
configure defaults that identify that same stack.

### The call returns AccessDenied

The debug role or fallback AWS credentials do not allow the operation for the requested resource. Verify the selected
AWS account/profile and target stack. The allowlist prevents known state-changing operations; it does not grant IAM
permissions.

### Can I use `aws:call` without a Stacktape project?

No. A local configuration file is optional, but a deployed target stack is not. Use the AWS CLI or an AWS SDK directly
for resources that are not associated with a deployed Stacktape stack.
