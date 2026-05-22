# debug:dynamodb

The `debug:dynamodb` command queries a deployed [DynamoDB table](/resources/databases/dynamodb) directly from your terminal. It supports five read-only operations — `scan`, `query`, `get`, `schema`, and `sample` — so you can inspect table structure and data without writing SDK code or opening the AWS Console.

## Usage

```bash
stacktape debug:dynamodb --stage prod --region eu-west-1 --resourceName myTable
```

The `--resourceName` must match the name of a deployed DynamoDB table resource in your Stacktape configuration. The three required flags are `--stage`, `--region`, and `--resourceName`. Running the command without `--operation` defaults to `sample`, which returns a small set of items so you can quickly see what's in the table.

## Operations

The `--operation` flag selects what kind of read to perform. All five operations are read-only — they never modify data.

### sample

Runs the `sample` operation to return a small number of items from the table. This is the default when `--operation` is omitted — use it to quickly check what data looks like before writing a more targeted query.

```bash
stacktape debug:dynamodb --stage prod --region eu-west-1 --resourceName myTable --operation sample
```

### schema

Runs the `schema` operation for the deployed table. Use it before `query` or `get` when you need to inspect the table's key structure and understand which attributes to pass as `--pk` and `--sk`.

```bash
stacktape debug:dynamodb --stage prod --region eu-west-1 --resourceName myTable --operation schema
```

### scan

Runs the `scan` operation with the provided `--limit` (defaults to 100). In DynamoDB, scans read items sequentially across the entire table. Scans can be costly on large tables, so prefer `query` when you know the partition key.

```bash
stacktape debug:dynamodb --stage prod --region eu-west-1 --resourceName myTable --operation scan --limit 50
```

### query

Runs the `query` operation. The `--pk` flag is required and must be a JSON object mapping the partition key attribute name to its value. The optional `--sk` flag narrows results by sort key, and the optional `--index` flag passes a DynamoDB secondary index name.

In DynamoDB, `query` is usually the right read path when you know the partition key — it is more efficient and cheaper than a scan.

Query by partition key only:

```bash
stacktape debug:dynamodb --stage prod --region eu-west-1 --resourceName myTable --operation query --pk '{"userId": "123"}'
```

Narrow results with a sort key:

```bash
stacktape debug:dynamodb --stage prod --region eu-west-1 --resourceName myTable --operation query --pk '{"userId": "123"}' --sk '{"timestamp": 1234}'
```

Query a global secondary index:

```bash
stacktape debug:dynamodb --stage prod --region eu-west-1 --resourceName myTable --operation query --pk '{"email": "user@example.com"}' --index emailIndex
```

### get

Runs the `get` operation with `--pk` and optional `--sk`. Use `--sk` when the table's primary key includes a sort key. This retrieves a single item by its exact primary key.

```bash
stacktape debug:dynamodb --stage prod --region eu-west-1 --resourceName myTable --operation get --pk '{"userId": "123"}' --sk '{"timestamp": 1234}'
```


> **Info:** The `--pk` and `--sk` values must be valid JSON objects mapping the key attribute name to its value. For example, `'{"userId": "abc"}'` or `'{"timestamp": 1234}'`. If the JSON is malformed, the command returns an error with a hint to provide valid JSON.


## Agent mode

When running with `--agent`, the command emits structured JSON for programmatic consumption instead of human-readable text. This is useful when integrating with AI coding assistants or automation scripts that parse CLI output.

```bash
stacktape debug:dynamodb --stage prod --region eu-west-1 --resourceName myTable --operation sample --agent
```

The output includes the operation result along with metadata such as the resource name and operation type, wrapped in a single JSON object.

## Flags reference


## CLI Options: `stacktape debug:dynamodb`

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
| `--pk` | no | `string` | DynamoDB Partition Key JSON object with partition key name and value (e.g., &#39;{&quot;id&quot;: &quot;123&quot;}&#39;). | - |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--sk` | no | `string` | DynamoDB Sort Key JSON object with sort key name and value (e.g., &#39;{&quot;timestamp&quot;: 12345}&#39;). | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Related commands

- [`debug:logs`](/cli/debug-logs) — fetch and filter logs from any deployed resource.
- [`debug:sql`](/cli/debug-sql) — run read-only SQL queries against a deployed relational database.
- [`debug:redis`](/cli/debug-redis) — query a deployed Redis cluster.
- [`debug:opensearch`](/cli/debug-opensearch) — query a deployed OpenSearch domain.
- [`debug:aws-sdk`](/cli/debug-aws-sdk) — execute read-only AWS SDK commands against deployed resources.

## FAQ

### What operations does debug:dynamodb support?

The command supports five read-only operations: `sample` (default), `schema`, `scan`, `query`, and `get`. No operation modifies data. Use `schema` to inspect the table's key structure, `query` or `get` for targeted lookups by key, `scan` for broad reads, and `sample` for a quick preview.

### Do I need a Stacktape config file to run this command?

No. The command does not require a configuration file — it reads the deployed stack directly from AWS. You need `--stage`, `--region`, and `--resourceName` to identify the table. If you do have a config file in the working directory, Stacktape uses it to resolve project context, but it is not required.

### How do I find the right --resourceName value?

The `--resourceName` must match the key you used for your DynamoDB table resource in the Stacktape configuration that was deployed. For example, if your config defines `resources: { orders: new DynamoDbTable({...}) }`, use `--resourceName orders`. You can also run [`info:stack`](/cli/info-stack) to list all resources in a deployed stack.

### When should I use query vs scan?

Use `query` when you know the partition key — it reads only the items matching that key, which is fast and cost-efficient regardless of table size. Use `scan` when you need to browse items without knowing a key, but be aware that DynamoDB scans read every item in the table (up to `--limit`), which can be slow and expensive on large tables. Default to `query` whenever possible.

### Can I query a global secondary index (GSI)?

Yes. Pass `--index` with the name of the secondary index when using the `query` operation. The `--pk` value should then contain the partition key attribute of the GSI, not the base table. Run `--operation schema` first if you are unsure of the index's key attributes.

### What format does --pk and --sk expect?

Both flags accept a JSON object mapping the key attribute name to its value. For example, `'{"userId": "abc123"}'` for a string key or `'{"timestamp": 1234}'` for a numeric key. The command validates the JSON and returns an error with a hint if it is malformed.

### What does the --limit flag default to?

When `--limit` is not provided, the command defaults to returning up to 100 items. This applies to `scan`, `query`, and `sample` operations. You can lower or raise the limit as needed.

### Can I use this command with AI coding assistants?

Yes. Pass `--agent` to switch the output to structured JSON, which AI coding assistants and automation scripts can parse. The Stacktape [MCP server](/using-with-ai/mcp-server-setup) also exposes DynamoDB debugging as a tool, so agents like Claude Code or Cursor can query your tables without manual CLI invocations.
