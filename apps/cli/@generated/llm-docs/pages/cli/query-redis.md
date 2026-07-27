# query:redis

The `query:redis` command lets you inspect a deployed [Redis cluster](/resources/databases/redis) directly from the command line. It supports five read-only operations — `keys`, `get`, `ttl`, `info`, and `type` — so you can check cached values, list keys by pattern, or view server stats without setting up a local Redis client or tunnel.

## Usage

```bash
stacktape query:redis --stage prod --region eu-west-1 --resourceName myRedis --operation info
```

The `--resourceName` must refer to a `redis-cluster` resource defined in your Stacktape configuration. The command resolves the cluster's connection details (host, port, password) from the deployed stack automatically.

## Operations

The `--operation` flag selects what to do. If omitted, it defaults to `info`.

| Operation | What it does | Required flags |
|-----------|-------------|----------------|
| `info` | Returns Redis server information (memory, clients, stats). Optionally filter with `--section`. | — |
| `keys` | Lists keys matching a glob pattern. `--pattern` is optional and defaults to `*`. | — |
| `get` | Returns the value stored at a specific key. | `--key` |
| `ttl` | Returns the remaining time-to-live (in seconds) for a key. | `--key` |
| `type` | Returns the data type of a key (string, list, set, hash, zset, etc.). | `--key` |

All operations are read-only. You cannot write, delete, or modify data through this command.

## Accessing VPC-only clusters

Redis clusters deployed inside a VPC are not publicly accessible. To reach them from your local machine, pass `--bastionResource` to tunnel through a [bastion host](/resources/security/bastion-host) in your stack. When `--bastionResource` resolves a tunnel target, the command starts an SSM port-forwarding session, uses localhost for the query, and closes the tunnel after the query.

```bash
stacktape query:redis --stage prod --region eu-west-1 --resourceName myRedis --bastionResource myBastion --operation keys --pattern "session:*"
```

If the Redis endpoint is reachable from your machine, omit `--bastionResource`. For VPC-only clusters, pass a bastion resource name.

## Examples

### View server info

Returns the full Redis INFO output.

```bash
stacktape query:redis --stage prod --region eu-west-1 --resourceName myRedis --operation info
```

Use `--section` to pass a Redis INFO section such as `server`, `memory`, or `stats`. The command passes the section string directly to Redis.

```bash
stacktape query:redis --stage prod --region eu-west-1 --resourceName myRedis --operation info --section memory
```

### List keys by pattern

Lists keys matching a glob pattern. The `--pattern` flag is optional and defaults to `*` (all keys). Use `--limit` to cap the number of returned keys.

```bash
stacktape query:redis --stage prod --region eu-west-1 --resourceName myRedis --operation keys --pattern "user:*" --limit 20
```

### Get a key's value

```bash
stacktape query:redis --stage prod --region eu-west-1 --resourceName myRedis --operation get --key "session:abc123"
```

### Check a key's TTL

Returns the remaining time-to-live in seconds. A value of `-1` means the key has no expiration; `-2` means the key does not exist.

```bash
stacktape query:redis --stage prod --region eu-west-1 --resourceName myRedis --operation ttl --key "session:abc123"
```

### Check a key's type

```bash
stacktape query:redis --stage prod --region eu-west-1 --resourceName myRedis --operation type --key "user:42"
```

### Query through a bastion tunnel

When your Redis cluster is VPC-only, pass `--bastionResource` to route the connection through a bastion host.

```bash
stacktape query:redis --stage prod --region eu-west-1 --resourceName myRedis --bastionResource myBastion --operation get --key "config:feature-flags"
```

## Agent mode

When running inside an AI coding agent or CI pipeline, pass `--agent` to switch to agent-oriented output. In agent mode, `query:redis` prints the Redis result as a JSON object containing `ok`, `resource`, `operation`, and the operation-specific result fields. Agent mode also disables interactive terminal UI.

```bash
stacktape query:redis --stage prod --region eu-west-1 --resourceName myRedis --operation get --key "session:abc123" --agent
```

## Flags reference


## CLI Options: `stacktape query:redis`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resourceName (-rn)` | yes | `string` | Resource Name The name of the resource as defined in your Stacktape configuration. | - |
| `--stage (-s)` | yes | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--bastionResource (-br)` | no | `string` | Bastion Resource Name The name of the bastion resource as defined in your Stacktape configuration. | - |
| `--configPath (-cp)` | no | `string` | Config File Path The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--currentWorkingDirectory (-cwd)` | no | `string` | Current Working Directory The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--key` | no | `string` | Redis Key The key name to operate on. | - |
| `--limit (-lim)` | no | `number` | Limit Maximum number of items to return. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--operation` | no | `string` | Database Operation The operation to perform (varies by database type). | - |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--pattern` | no | `string` | Redis Key Pattern Pattern for matching keys (default: *). Supports glob-style patterns. | - |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--section` | no | `string` | Redis Info Section Specific section of Redis INFO output (e.g., server, memory, stats). | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Related commands

- [`query:dynamodb`](/cli/query-dynamodb) — query, scan, or inspect DynamoDB tables.
- [`query:opensearch`](/cli/query-opensearch) — search, count, or inspect OpenSearch indices.
- [`bastion:tunnel`](/cli/bastion-tunnel) — open a persistent tunnel through a bastion host for use with a local Redis client (e.g., `redis-cli`). Use `query:redis` for quick one-off lookups; use [`bastion:tunnel`](/cli/bastion-tunnel) when you need an ongoing local session.
