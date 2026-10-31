# query redis

The `query redis` command lets you inspect a deployed [Redis cache](/resources/databases/redis) directly from the command line. It supports five read-only operations — `keys`, `get`, `ttl`, `info`, and `type` — so you can check cached values, list keys by pattern, or view server stats without setting up a local Redis client or tunnel.

## Usage

```bash
stacktape query redis myRedis --stage prod --region eu-west-1 --operation info
```

The resource name argument must refer to a `redis` resource defined in your Stacktape configuration. The command resolves the cluster's connection details (host, port, password) from the deployed stack automatically.

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

Redis caches deployed inside a VPC are not publicly accessible. To reach them from your local machine, pass `--bastion-resource` to tunnel through a [bastion host](/resources/security/bastion-host) in your stack. When `--bastion-resource` resolves a tunnel target, the command starts an SSM port-forwarding session, uses localhost for the query, and closes the tunnel after the query.

```bash
stacktape query redis myRedis --stage prod --region eu-west-1 --bastion-resource myBastion --operation keys --pattern "session:*"
```

If the Redis endpoint is reachable from your machine, omit `--bastion-resource`. For VPC-only clusters, pass a bastion resource name.

## Examples

### View server info

Returns the full Redis INFO output.

```bash
stacktape query redis myRedis --stage prod --region eu-west-1 --operation info
```

Use `--section` to pass a Redis INFO section such as `server`, `memory`, or `stats`. The command passes the section string directly to Redis.

```bash
stacktape query redis myRedis --stage prod --region eu-west-1 --operation info --section memory
```

### List keys by pattern

Lists keys matching a glob pattern. The `--pattern` flag is optional and defaults to `*` (all keys). Use `--limit` to cap the number of returned keys.

```bash
stacktape query redis myRedis --stage prod --region eu-west-1 --operation keys --pattern "user:*" --limit 20
```

### Get a key's value

```bash
stacktape query redis myRedis --stage prod --region eu-west-1 --operation get --key "session:abc123"
```

### Check a key's TTL

Returns the remaining time-to-live in seconds. A value of `-1` means the key has no expiration; `-2` means the key does not exist.

```bash
stacktape query redis myRedis --stage prod --region eu-west-1 --operation ttl --key "session:abc123"
```

### Check a key's type

```bash
stacktape query redis myRedis --stage prod --region eu-west-1 --operation type --key "user:42"
```

### Query through a bastion tunnel

When your Redis cache is VPC-only, pass `--bastion-resource` to route the connection through a bastion host.

```bash
stacktape query redis myRedis --stage prod --region eu-west-1 --bastion-resource myBastion --operation get --key "config:feature-flags"
```

## Agent mode

When running inside an AI coding agent or CI pipeline, pass `--agent` to switch to agent-oriented output. In agent mode, `query redis` prints the Redis result as a JSON object containing `ok`, `resource`, `operation`, and the operation-specific result fields. Agent mode also disables interactive terminal UI.

```bash
stacktape query redis myRedis --stage prod --region eu-west-1 --operation get --key "session:abc123" --agent
```

## Flags reference


## CLI Options: `stacktape query redis`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resource-name (positional 1)` | yes | `string` | Resource Name — The name of the resource as defined in your Stacktape configuration. | - |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters and no fixed maximum. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `--bastion-resource` | no | `string` | Bastion Resource Name — The name of the bastion resource as defined in your Stacktape configuration. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--key` | no | `string` | Redis Key — The key name to operate on. | - |
| `--limit` | no | `number` | Limit — Maximum number of items to return. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--operation` | no | `string` | Database Operation — The operation to perform (varies by database type). | - |
| `--pattern` | no | `string` | Redis Key Pattern — Pattern for matching keys (default: *). Supports glob-style patterns. | - |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--section` | no | `string` | Redis Info Section — Specific section of Redis INFO output (e.g., server, memory, stats). | - |


## Related commands

- [`query dynamodb`](/cli/query-dynamodb) — query, scan, or inspect DynamoDB tables.
- [`query opensearch`](/cli/query-opensearch) — search, count, or inspect OpenSearch indices.
- [`bastion tunnel`](/cli/bastion-tunnel) — open a persistent tunnel through a bastion host for use with a local Redis client (e.g., `redis-cli`). Use `query redis` for quick one-off lookups; use [`bastion tunnel`](/cli/bastion-tunnel) when you need an ongoing local session.
