# debug:redis

The `debug:redis` command runs read-only queries against a deployed Redis cluster directly from your terminal. Use it to inspect keys, check TTLs, retrieve values, or view server info without connecting a Redis client manually or configuring network access yourself.

## Usage

```bash
stacktape debug:redis --stage prod --region eu-west-1 --resourceName myRedis --operation info
```

The command requires `--stage`, `--region`, and `--resourceName`. The resource must be a `redis-cluster` type defined in your Stacktape configuration.

## Operations

The `--operation` flag selects what to query. All operations are read-only. If omitted, defaults to `info`.

| Operation | Purpose | Required flags |
|-----------|---------|----------------|
| `info` | Show Redis server information (memory, connections, stats) | None (optionally `--section`) |
| `keys` | List keys matching a pattern | None (optionally `--pattern`, `--limit`) |
| `get` | Retrieve the value of a key | `--key` |
| `ttl` | Check remaining time-to-live for a key | `--key` |
| `type` | Show the data type of a key | `--key` |

## Accessing VPC-only clusters

Redis clusters deployed inside a VPC are not publicly accessible. To reach them from your local machine, use `--bastionResource` to tunnel through a [bastion host](/resources/security/bastion-host) defined in your stack. Stacktape establishes an SSM port-forwarding session automatically.

```bash
stacktape debug:redis --stage prod --region eu-west-1 --resourceName myRedis --bastionResource myBastion --operation keys --pattern "session:*"
```

The tunnel is created and destroyed within the command's lifecycle — no manual setup needed.

## Examples

List all keys matching a pattern, limited to 50 results:

```bash
stacktape debug:redis --stage prod --region eu-west-1 --resourceName myRedis --operation keys --pattern "user:*" --limit 50
```

Get the value stored at a specific key:

```bash
stacktape debug:redis --stage prod --region eu-west-1 --resourceName myRedis --operation get --key "session:abc123"
```

Check the TTL of a key:

```bash
stacktape debug:redis --stage prod --region eu-west-1 --resourceName myRedis --operation ttl --key "cache:homepage"
```

Show only the memory section of Redis INFO:

```bash
stacktape debug:redis --stage prod --region eu-west-1 --resourceName myRedis --operation info --section memory
```

Check the data type of a key:

```bash
stacktape debug:redis --stage prod --region eu-west-1 --resourceName myRedis --operation type --key "queue:jobs"
```

## Agent mode

When run with `--agent`, the command outputs structured JSON instead of formatted text. This is useful for AI coding assistants and scripts that parse the output programmatically.

```bash
stacktape debug:redis --stage prod --region eu-west-1 --resourceName myRedis --operation info --agent
```

## Flags reference


## CLI Options: `stacktape debug:redis`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resourceName (-rn)` | yes | `string` | Resource Name The name of the resource as defined in your Stacktape configuration. | - |
| `--stage (-s)` | yes | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--bastionResource (-br)` | no | `string` | Bastion Resource Name The name of the bastion resource as defined in your Stacktape configuration. | - |
| `--configPath (-cp)` | no | `string` | Config File Path The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--currentWorkingDirectory (-cwd)` | no | `string` | Current Working Directory The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--key` | no | `string` | Redis Key The key name to operate on. | - |
| `--limit (-lim)` | no | `number` | Limit Maximum number of items to return. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console.

`info`: Basic information about the operation.
`error`: Only errors.
`debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--operation` | no | `string` | Database Operation The operation to perform (varies by database type). | - |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format:

`jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.
`plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.
`tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.
If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--pattern` | no | `string` | Redis Key Pattern Pattern for matching keys (default: *). Supports glob-style patterns. | - |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--section` | no | `string` | Redis Info Section Specific section of Redis INFO output (e.g., server, memory, stats). | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Related commands

- [`debug:logs`](/cli/debug-logs) — fetch and filter logs from any deployed resource
- [`debug:sql`](/cli/debug-sql) — run read-only SQL queries against relational databases
- [`debug:dynamodb`](/cli/debug-dynamodb) — query DynamoDB tables
- [`bastion:tunnel`](/cli/bastion-tunnel) — create a persistent tunnel for direct client access
