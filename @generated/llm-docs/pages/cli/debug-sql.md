# debug:sql

The `debug:sql` command executes read-only SQL queries against a deployed [relational database](/resources/databases/relational-database). It supports PostgreSQL and MySQL engines, retrieves connection credentials automatically from AWS SSM Parameter Store, and restricts queries to `SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`, and `\d` statements to prevent accidental writes to production data.

## Usage

```bash
stacktape debug:sql --stage prod --region eu-west-1 --resourceName myDatabase --sql "SELECT * FROM users LIMIT 10"
```

The command resolves the database connection string from the deployed resource's SSM parameter — you provide the resource name from your Stacktape configuration, and `debug:sql` handles credential lookup, engine detection, and optional bastion tunneling.

Use `debug:sql` when you need to inspect data in a deployed database without setting up a local database client or managing connection credentials manually. Common scenarios include verifying that a migration ran correctly, checking row counts after a deployment, or investigating a production issue by examining recent records. For write operations (`INSERT`, `UPDATE`, `DELETE`), use [`bastion:tunnel`](/cli/bastion-tunnel) to open a persistent tunnel and connect with a full-featured client like `psql` or `mysql`.

## Read-only enforcement

The command performs a prefix check and only accepts SQL strings that start with `SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`, or `\d` (case-insensitive). Any other statement is rejected before the SQL query is executed. This prevents accidental writes but is not a comprehensive SQL safety mechanism — use it as a convenience guard, not a security boundary.

```bash
stacktape debug:sql --stage prod --region eu-west-1 --resourceName myDatabase --sql "EXPLAIN SELECT * FROM orders WHERE status = 'pending'"
```

## VPC-only databases

For VPC-only databases, pass `--bastionResource` so `debug:sql` can tunnel through a Stacktape [bastion host](/resources/security/bastion-host). When `--bastionResource` is provided, the command starts an SSM port-forwarding session through the bastion, routes your query through `localhost`, and tears down the tunnel after the query completes. Without `--bastionResource`, the command uses the database host and port from the connection string directly.

```bash
stacktape debug:sql --stage prod --region eu-west-1 --resourceName myDatabase --bastionResource myBastion --sql "SELECT COUNT(*) FROM orders"
```

## Reader endpoint preference

If the deployed resource exposes a `readerConnectionString` SSM parameter, `debug:sql` uses that connection string; otherwise it uses `connectionString`. For Aurora clusters with read replicas, this means read queries route through the reader endpoint, which can reduce load on the primary writer instance.

## Agent mode output

When running with `--agent`, the command outputs structured JSON instead of a formatted table. The JSON payload includes `ok`, `resource`, `engine`, `sql`, `rows`, `fields`, `rowCount`, and `truncated`. This makes it straightforward to pipe results into scripts or consume them from AI coding agents.

```bash
stacktape debug:sql --stage prod --region eu-west-1 --resourceName myDatabase --sql "SELECT id, email FROM users LIMIT 5" --agent
```

## Result limiting

The `--limit` flag caps the maximum number of rows returned (defaults to 1000). When the query helper reports `truncated`, the CLI shows `(truncated to <limit>)` in table mode; in agent mode the JSON includes `"truncated": true`. Use `--limit` to keep terminal output manageable for large tables.

```bash
stacktape debug:sql --stage prod --region eu-west-1 --resourceName myDatabase --sql "SELECT * FROM events" --limit 50
```

## Query timeout

The `--timeout` flag sets the maximum time in milliseconds to wait for query execution (defaults to 30000). Increase this for complex queries that scan large tables.

```bash
stacktape debug:sql --stage prod --region eu-west-1 --resourceName myDatabase --sql "SELECT * FROM large_table" --timeout 60000
```

## Examples

Query a PostgreSQL database for recent orders:

```bash
stacktape debug:sql --stage prod --region eu-west-1 --resourceName mainDatabase --sql "SELECT id, status, created_at FROM orders ORDER BY created_at DESC LIMIT 20"
```

Show all tables in a MySQL database:

```bash
stacktape debug:sql --stage staging --region us-east-1 --resourceName appDb --sql "SHOW TABLES"
```

Inspect table schema through a bastion host:

```bash
stacktape debug:sql --stage prod --region eu-west-1 --resourceName mainDatabase --bastionResource bastion --sql "DESCRIBE orders"
```

Use PostgreSQL's `\d` shorthand to list tables:

```bash
stacktape debug:sql --stage prod --region eu-west-1 --resourceName mainDatabase --sql "\dt"
```

## Flags reference


## CLI Options: `stacktape debug:sql`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resourceName (-rn)` | yes | `string` | Resource Name The name of the resource as defined in your Stacktape configuration. | - |
| `--sql` | yes | `string` | SQL Query SQL query to execute. Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN) are allowed. | - |
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
| `--limit (-lim)` | no | `number` | Limit Maximum number of items to return. | - |
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
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |
| `--timeout` | no | `number` | Query Timeout Maximum time to wait for query execution in milliseconds (default: 30000). | - |


## Related commands

- [`debug:logs`](/cli/debug-logs) — fetch and filter logs from deployed resources.
- [`bastion:tunnel`](/cli/bastion-tunnel) — open a persistent tunnel to a VPC resource for use with external database clients.
- [`debug:dynamodb`](/cli/debug-dynamodb) — query DynamoDB tables with scan, query, and get operations.
- [`debug:redis`](/cli/debug-redis) — query deployed Redis clusters.

## FAQ

### Which database engines does debug:sql support?

The command supports PostgreSQL and MySQL databases deployed as a Stacktape [relational database](/resources/databases/relational-database). It detects the engine from the connection string protocol (`postgresql://` or `mysql://`) and uses the appropriate driver. For DynamoDB tables, use [`debug:dynamodb`](/cli/debug-dynamodb); for Redis clusters, use [`debug:redis`](/cli/debug-redis).

### Can I run write queries with debug:sql?

No. The command performs a prefix check and only accepts SQL that starts with `SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`, or `\d`. Any other statement is rejected before the query is executed. For write operations, use [`bastion:tunnel`](/cli/bastion-tunnel) to open a persistent tunnel and connect with a full database client like `psql`, `mysql`, or a GUI tool.

### How does debug:sql connect to a VPC-only database?

Pass `--bastionResource` to tunnel through a [bastion host](/resources/security/bastion-host) in your stack. When that flag is present, the command resolves bastion tunnel targets and starts an SSM port-forwarding session to the database endpoint, runs your query through the local tunnel, and cleans up automatically when done.

### What happens if my query returns too many rows?

Results are capped by the `--limit` flag, which defaults to 1000 rows. When the query helper reports `truncated`, the CLI shows `(truncated to <limit>)` in table mode; in agent mode the JSON includes `"truncated": true`. Set a lower limit for large tables or use `LIMIT` directly in your SQL.

### Does debug:sql prefer the reader or writer endpoint?

If the deployed resource exposes a `readerConnectionString` SSM parameter (typical for Aurora clusters with read replicas), the command uses it. Otherwise it uses the primary `connectionString`. This preference reduces read load on the writer instance without requiring any extra flags.

### How do I increase the query timeout?

Pass `--timeout` with a value in milliseconds. The default is 30000 (30 seconds). For complex analytical queries or large table scans, increase it — for example, `--timeout 120000` for two minutes.

### Do I need to provide database credentials?

No. The command retrieves the connection string (including credentials) from the deployed resource's SSM parameter automatically. You need permissions to read SSM parameters in the stack's region, which your Stacktape AWS profile provides by default.

### Can I use debug:sql in CI or with AI agents?

Yes. Use the `--agent` flag to get structured JSON output instead of a formatted table. The JSON result object includes `ok`, `resource`, `engine`, `sql`, `rows`, `fields`, `rowCount`, and `truncated`, making it easy to parse with `jq` or consume programmatically.

### What is the difference between debug:sql and bastion:tunnel?

`debug:sql` is a one-shot command: it connects, runs a single read-only query, prints results, and exits. [`bastion:tunnel`](/cli/bastion-tunnel) opens a persistent port-forwarding tunnel that stays open so you can connect with any database client and run arbitrary queries, including writes. Use `debug:sql` for quick inspection; use `bastion:tunnel` for interactive sessions or write operations.

### Why does debug:sql reject my query?

The command checks that your SQL starts with one of the allowed prefixes (`SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`, `\d`). Common triggers: leading whitespace before a comment, CTEs starting with `WITH` (not currently in the allowed prefix list), or DDL/DML statements. For unsupported read patterns, use [`bastion:tunnel`](/cli/bastion-tunnel) with a full client instead.
