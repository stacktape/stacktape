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

<CliCommandsApiReference command="query:redis" sortedArgs={[
  {
    "name": "region",
    "required": true,
    "alias": "r",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "us-east-2",
      "us-east-1",
      "us-west-1",
      "us-west-2",
      "ap-east-1",
      "ap-south-1",
      "ap-northeast-3",
      "ap-northeast-2",
      "ap-southeast-1",
      "ap-southeast-2",
      "ap-northeast-1",
      "ca-central-1",
      "eu-central-1",
      "eu-west-1",
      "eu-west-2",
      "eu-west-3",
      "eu-north-1",
      "me-south-1",
      "sa-east-1",
      "af-south-1",
      "eu-south-1"
    ],
    "shortDescription": "<p> AWS Region</p>\n",
    "longDescription": "<p>The AWS region for the operation. For a list of available regions, see the <a href=\"https://docs.aws.amazon.com/general/latest/gr/rande.html\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">AWS documentation</a>.</p>\n"
  },
  {
    "name": "resourceName",
    "required": true,
    "alias": "rn",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Resource Name</p>\n",
    "longDescription": "<p>The name of the resource as defined in your Stacktape configuration.</p>\n"
  },
  {
    "name": "stage",
    "required": true,
    "alias": "s",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Stage</p>\n",
    "longDescription": "<p>The stage for the operation (e.g., <code>production</code>, <code>staging</code>, <code>dev-john</code>). You can set a default stage using the <code>defaults:configure</code> command. The maximum length is 12 characters.</p>\n"
  },
  {
    "name": "agent",
    "required": false,
    "alias": "ag",
    "allowedTypes": [
      "boolean"
    ],
    "shortDescription": "<p> Agent Mode</p>\n",
    "longDescription": "<p>Optimizes CLI output for programmatic/LLM consumption:</p>\n<ul>\n<li>Uses strict JSONL/NDJSON output (one JSON object per line)</li>\n<li>Disables interactive terminal UI</li>\n<li>Automatically confirms operations (equivalent to --autoConfirmOperation)\nFor dev command: also enables HTTP server for programmatic control.</li>\n</ul>\n"
  },
  {
    "name": "awsAccount",
    "required": false,
    "alias": "aa",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> AWS Account</p>\n",
    "longDescription": "<p>The name of the AWS account to use for the operation. The account must first be connected in the <a href=\"https://console.stacktape.com/aws-accounts\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">Stacktape console</a>.</p>\n"
  },
  {
    "name": "bastionResource",
    "required": false,
    "alias": "br",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Bastion Resource Name</p>\n",
    "longDescription": "<p>The name of the bastion resource as defined in your Stacktape configuration.</p>\n"
  },
  {
    "name": "configPath",
    "required": false,
    "alias": "cp",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Config File Path</p>\n",
    "longDescription": "<p>The path to your Stacktape configuration file, relative to the current working directory.</p>\n"
  },
  {
    "name": "currentWorkingDirectory",
    "required": false,
    "alias": "cwd",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Current Working Directory</p>\n",
    "longDescription": "<p>The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file.</p>\n"
  },
  {
    "name": "help",
    "required": false,
    "alias": "h",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Show Help</p>\n",
    "longDescription": "<p>If provided, the command will not execute and will instead print help information.</p>\n"
  },
  {
    "name": "key",
    "required": false,
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Redis Key</p>\n",
    "longDescription": "<p>The key name to operate on.</p>\n"
  },
  {
    "name": "limit",
    "required": false,
    "alias": "lim",
    "allowedTypes": [
      "number"
    ],
    "shortDescription": "<p> Limit</p>\n",
    "longDescription": "<p>Maximum number of items to return.</p>\n"
  },
  {
    "name": "logLevel",
    "required": false,
    "alias": "ll",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "info",
      "debug",
      "error"
    ],
    "shortDescription": "<p> Log Level</p>\n",
    "longDescription": "<p>The level of logs to print to the console.</p>\n<ul>\n<li><code>info</code>: Basic information about the operation.</li>\n<li><code>error</code>: Only errors.</li>\n<li><code>debug</code>: Detailed information for debugging.</li>\n</ul>\n"
  },
  {
    "name": "operation",
    "required": false,
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Database Operation</p>\n",
    "longDescription": "<p>The operation to perform (varies by database type).</p>\n"
  },
  {
    "name": "outputFormat",
    "required": false,
    "alias": "ofmt",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "jsonl",
      "plain",
      "tty"
    ],
    "shortDescription": "<p> Output Format</p>\n",
    "longDescription": "<p>Controls the CLI output format:</p>\n<ul>\n<li><code>jsonl</code>: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.</li>\n<li><code>plain</code>: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.</li>\n<li><code>tty</code>: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.\nIf not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl.</li>\n</ul>\n"
  },
  {
    "name": "pattern",
    "required": false,
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Redis Key Pattern</p>\n",
    "longDescription": "<p>Pattern for matching keys (default: *). Supports glob-style patterns.</p>\n"
  },
  {
    "name": "profile",
    "required": false,
    "alias": "p",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> AWS Profile</p>\n",
    "longDescription": "<p>The AWS profile to use for the command. You can manage profiles using the <code>aws-profile:*</code> commands and set a default profile with <code>defaults:configure</code>.</p>\n"
  },
  {
    "name": "projectName",
    "required": false,
    "alias": "prj",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Project Name</p>\n",
    "longDescription": "<p>The name of the Stacktape project for this operation.</p>\n"
  },
  {
    "name": "section",
    "required": false,
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Redis Info Section</p>\n",
    "longDescription": "<p>Specific section of Redis INFO output (e.g., server, memory, stats).</p>\n"
  },
  {
    "name": "templateId",
    "required": false,
    "alias": "ti",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Template ID</p>\n",
    "longDescription": "<p>The ID of the template to download. You can find a list of available templates on the <a href=\"https://console.stacktape.com/templates\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">Config Builder page</a>.</p>\n"
  }
]} />

## Related commands

- [`query:dynamodb`](/cli/query-dynamodb) — query, scan, or inspect DynamoDB tables.
- [`query:opensearch`](/cli/query-opensearch) — search, count, or inspect OpenSearch indices.
- [`bastion:tunnel`](/cli/bastion-tunnel) — open a persistent tunnel through a bastion host for use with a local Redis client (e.g., `redis-cli`). Use `query:redis` for quick one-off lookups; use [`bastion:tunnel`](/cli/bastion-tunnel) when you need an ongoing local session.
