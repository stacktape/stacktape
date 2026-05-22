# debug:opensearch

The `debug:opensearch` command lets you run read-only queries against a deployed [OpenSearch domain](/resources/databases/opensearch) directly from the CLI. Use it to inspect indices, retrieve documents, check mappings, and run search queries without connecting through a bastion or writing custom scripts.

## Usage

```bash
stacktape debug:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation indices
```

The `--resourceName` must reference an OpenSearch domain defined in your Stacktape configuration. The command authenticates using your configured AWS credentials and connects to the domain endpoint.

## Operations

The `--operation` flag controls what the command does. Defaults to `indices` when omitted. All operations are read-only.

### indices

Lists all indices in the OpenSearch domain. No additional flags required.

```bash
stacktape debug:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation indices
```

### mapping

Returns the field mapping for a specific index. Requires `--index`.

```bash
stacktape debug:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation mapping --index users
```

### count

Returns the document count for a specific index, or for all indices when `--index` is omitted.

```bash
stacktape debug:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation count --index users
```

### get

Retrieves a single document by ID. Requires both `--index` and `--id`.

```bash
stacktape debug:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation get --index users --id doc123
```

### search

Runs an OpenSearch query DSL search. Requires `--query` with valid JSON. Use `--index` to scope the search to a specific index. Use `--limit` to control how many results are returned (defaults to 10).

```bash
stacktape debug:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation search --query "{\"match_all\": {}}"
```

Search with a filter on a specific index, returning up to 50 results:

```bash
stacktape debug:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation search --index products --query "{\"match\": {\"category\": \"electronics\"}}" --limit 50
```

## Important flags

| Flag | Purpose |
|------|---------|
| `--resourceName` | Name of the OpenSearch domain resource in your config (required) |
| `--operation` | One of `search`, `get`, `indices`, `mapping`, `count` (defaults to `indices`) |
| `--index` | Target index name (required for `mapping` and `get`, optional for `count` and `search`) |
| `--id` | Document ID to retrieve (required for `get`) |
| `--query` | OpenSearch query DSL as JSON string (required for `search`) |
| `--limit` | Maximum number of results to return (defaults to 10) |


> **Info:** The `--query` flag accepts OpenSearch Query DSL in JSON format. Wrap the JSON in single quotes on Linux/macOS or escape double quotes on Windows.


## Agent mode

When invoked with `--agent`, the command outputs structured JSON suitable for programmatic or LLM consumption. The output includes the operation performed, the resource name, and the query results in a single JSON object.

```bash
stacktape debug:opensearch --stage prod --region eu-west-1 --resourceName mySearch --operation indices --agent
```

## Flags reference


## CLI Options: `stacktape debug:opensearch`

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
| `--configPath (-cp)` | no | `string` | Config File Path The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--currentWorkingDirectory (-cwd)` | no | `string` | Current Working Directory The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--id` | no | `string` | Document ID ID of the document to retrieve (for OpenSearch get operation). | - |
| `--index` | no | `string` | Database Index Index name. For DynamoDB: secondary index to query. For OpenSearch: index to search. | - |
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
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--query (-q)` | no | `string` | Logs Query CloudWatch Logs Insights query string. Example: &quot;fields @timestamp, @message | filter @message like /ERROR/ | limit 50&quot; | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Related commands

- [`debug:logs`](/cli/debug-logs) — fetch and analyze logs from deployed resources
- [`debug:dynamodb`](/cli/debug-dynamodb) — query deployed DynamoDB tables
- [`debug:sql`](/cli/debug-sql) — execute read-only SQL queries against deployed relational databases
- [`bastion:tunnel`](/cli/bastion-tunnel) — create a secure tunnel to access private VPC resources
