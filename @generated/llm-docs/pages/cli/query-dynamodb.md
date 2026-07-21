# query:dynamodb

The `query:dynamodb` command lets you inspect data in a deployed [DynamoDB table](/resources/databases/dynamodb) directly from the command line. It supports five read-only operations — `sample`, `scan`, `query`, `get`, and `schema` — so you can check table structure, look up items by key, or browse data without leaving the terminal.

Use this command as your first tool when you need to verify data in a deployed DynamoDB table. The command resolves your Stacktape `DynamoDbTable` resource by name and runs read-only operations against the deployed table, so there's no risk of accidental writes.

## Usage

```bash
stacktape query:dynamodb --stage <stage> --region <region> --resourceName <tableName> --operation <operation>
```

The `--resourceName` must match the name of a `DynamoDbTable` resource in your Stacktape configuration. If you omit `--operation`, the command defaults to `sample`. When `--limit` is omitted, the command uses a default limit of 100.

## CLI reference


## CLI Options: `stacktape query:dynamodb`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resourceName (-rn)` | yes | `string` | Resource Name The name of the resource as defined in your Stacktape configuration. | - |
| `--stage (-s)` | yes | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--configPath (-cp)` | no | `string` | Config File Path The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--currentWorkingDirectory (-cwd)` | no | `string` | Current Working Directory The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--index` | no | `string` | Database Index Index name. For DynamoDB: secondary index to query. For OpenSearch: index to search. | - |
| `--limit (-lim)` | no | `number` | Limit Maximum number of items to return. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--operation` | no | `string` | Database Operation The operation to perform (varies by database type). | - |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--pk` | no | `string` | DynamoDB Partition Key JSON object with partition key name and value (e.g., '{"id": "123"}'). | - |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--sk` | no | `string` | DynamoDB Sort Key JSON object with sort key name and value (e.g., '{"timestamp": 12345}'). | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Operations

The `query:dynamodb` command supports five operations. All are read-only.

### sample

The `sample` operation returns items from the table — useful for a quick sanity check that data exists and looks right. This is the default operation when `--operation` is omitted. Use `--limit` to control how many items are returned.

```bash
stacktape query:dynamodb --stage prod --region eu-west-1 --resourceName ordersTable --operation sample
```

### schema

The `schema` operation returns schema information for the table. Run this first when you're unfamiliar with a table — use the returned metadata to choose values for `--pk`, `--sk`, or `--index`.

```bash
stacktape query:dynamodb --stage prod --region eu-west-1 --resourceName ordersTable --operation schema
```

### scan

The `scan` operation reads items from the table without filtering by key. Use `--limit` to control how many items are returned (defaults to 100 when omitted). Scans read the table sequentially, so they consume read capacity proportional to the data scanned — keep `--limit` reasonable on large tables.

```bash
stacktape query:dynamodb --stage prod --region eu-west-1 --resourceName ordersTable --operation scan --limit 20
```

### query

The `query` operation fetches items matching a specific partition key, optionally filtered by sort key. Requires `--pk` with a JSON object mapping the partition key name to its value. Use `--sk` to narrow results by sort key, and `--index` to query a global secondary index instead of the primary table.

```bash
stacktape query:dynamodb --stage prod --region eu-west-1 --resourceName ordersTable --operation query --pk '{"userId": "u-42"}'
```

Query a GSI with a sort key filter:

```bash
stacktape query:dynamodb --stage prod --region eu-west-1 --resourceName ordersTable --operation query --pk '{"status": "shipped"}' --sk '{"createdAt": "2025-01-01"}' --index statusIndex
```

### get

The `get` operation retrieves a single item by its full primary key (partition key + sort key if the table has one). Requires `--pk`; use `--sk` when the table has a composite key. If no item matches, the command prints the result returned by DynamoDB.

```bash
stacktape query:dynamodb --stage prod --region eu-west-1 --resourceName ordersTable --operation get --pk '{"userId": "u-42"}' --sk '{"orderId": "ord-99"}'
```

## Programmatic output

The `--agent` flag switches to programmatic output mode. With `--agent`, `query:dynamodb` prints the operation result as a JSON object (with `ok`, `resource`, `operation`, and the operation-specific data) for programmatic consumption by scripts or AI coding agents.

```bash
stacktape query:dynamodb --stage prod --region eu-west-1 --resourceName ordersTable --operation sample --agent
```


> **Tip:** Run `--operation schema` first on unfamiliar tables. It returns table metadata you need to choose values for `--pk` and `--sk`.


## Examples

Quickly check if a table has data after a fresh deployment:

```bash
stacktape query:dynamodb --stage dev --region us-east-1 --resourceName usersTable
```

Inspect the key schema and indexes before writing a query:

```bash
stacktape query:dynamodb --stage prod --region eu-west-1 --resourceName usersTable --operation schema
```

Fetch all items for a specific user:

```bash
stacktape query:dynamodb --stage prod --region eu-west-1 --resourceName usersTable --operation query --pk '{"userId": "abc-123"}' --limit 50
```

Get a single item by composite key:

```bash
stacktape query:dynamodb --stage prod --region eu-west-1 --resourceName usersTable --operation get --pk '{"userId": "abc-123"}' --sk '{"createdAt": "2025-03-15T10:00:00Z"}'
```

Scan for recent items (up to 10):

```bash
stacktape query:dynamodb --stage staging --region us-east-1 --resourceName eventsTable --operation scan --limit 10
```

## Related commands

- [`query:sql`](/cli/query-sql) — run read-only SQL queries against deployed PostgreSQL or MySQL databases.
- [`query:redis`](/cli/query-redis) — inspect keys and values in a deployed Redis cluster.
- [`query:opensearch`](/cli/query-opensearch) — search and inspect deployed OpenSearch domains.

## FAQ

### Can I query a global secondary index?

Yes. Pass `--index <indexName>` with the `query` operation. The `--pk` value must match the GSI's partition key, not the table's primary partition key. Run `--operation schema` first to inspect the table metadata before querying.

### What format does --pk expect?

The `--pk` flag takes a JSON object mapping the key attribute name to its value — for example, `'{"userId": "abc-123"}'`. The attribute name must match the partition key name in the table's schema. The same format applies to `--sk`. If the JSON is malformed, the command returns an error asking for valid JSON objects.

### What is the default limit for sample and scan?

When `--limit` is omitted, the command uses a default limit of 100 items, for both `sample` and `scan`. Use `--limit` to request fewer or more items.

### Is this command safe to run against production tables?

Yes. All five operations are strictly read-only — the command never writes, updates, or deletes items. Be mindful of `scan` on large tables: it consumes DynamoDB read capacity units proportional to the data scanned, which could affect performance if your table's provisioned capacity is low. Use `--limit` to keep scans bounded.

### How is this different from aws:call, and can I use it on tables not managed by Stacktape?

The [`aws:call`](/cli/aws-call) command gives raw AWS SDK access and requires you to construct the full DynamoDB API input (including the physical table name and marshalled attribute values). `query:dynamodb` instead resolves your Stacktape resource name to the underlying table and provides higher-level operations like `schema` and `sample`, so you can inspect data without knowing the physical table name or DynamoDB API shape. The trade-off: it only accepts a deployed Stacktape resource whose type is `dynamo-db-table`. For tables outside Stacktape, use [`aws:call`](/cli/aws-call) with the DynamoDB SDK commands directly.

### Does this command need a bastion tunnel or VPC access?

No. DynamoDB is a regional AWS service accessible over the public internet — it does not run inside a VPC. No bastion tunnel is needed, unlike VPC-only resources such as [relational databases](/resources/databases/relational-database) or [Redis clusters](/resources/databases/redis).
