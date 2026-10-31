# query sql

Run read-only SQL queries against a deployed [relational database](/resources/databases/relational-database) directly from the command line. Use `query sql` when you need to check a row, verify a migration, or inspect table structure in a deployed PostgreSQL or MySQL database without setting up a local database client.

## Usage

Query a table in a deployed database:

```bash
stacktape query sql myDatabase "SELECT * FROM users LIMIT 10" --stage prod --region eu-west-1
```

Query a database through a [bastion host](/resources/security/bastion-host):

```bash
stacktape query sql myDatabase "SHOW TABLES" --stage prod --region eu-west-1 --bastion-resource myBastion
```

## What it does

The `query sql` command connects to a deployed Stacktape `relational-database` resource, executes a read-only SQL query, and prints the results. Stacktape resolves the database connection string — including host, port, username, and password — from your deployed stack's SSM parameters automatically. You don't need to look up credentials or endpoints.

The command validates that the SQL string starts with an allowed read-only prefix before sending it to the database. Accepted prefixes are `SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`, and `\d` (PostgreSQL meta-commands). Any SQL that does not start with one of these prefixes is rejected.

When the deployed database exposes a `readerConnectionString` SSM parameter, `query sql` uses it. Otherwise it uses the primary `connectionString` parameter. This means read queries are automatically routed away from the writer instance when a reader endpoint is available.

The command passes SSL connection options to the database client automatically.


> **Warning:** This command is for ad-hoc inspection, not bulk data export. Results are capped by the `--limit` flag (default: 1000 rows). For persistent database access with a local client like `psql` or DataGrip, use [`bastion tunnel`](/cli/bastion-tunnel) instead.


## Important flags

### `<sql>` (required)

The SQL query to execute, passed as the second positional argument. Wrap it in double quotes on the command line. The command accepts queries starting with `SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`, or `\d`.

Select specific columns:

```bash
stacktape query sql myDatabase "SELECT id, email, created_at FROM users WHERE active = true LIMIT 20" --stage prod --region eu-west-1
```

Inspect table structure in PostgreSQL:

```bash
stacktape query sql myDatabase "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'" --stage prod --region eu-west-1
```

List tables in MySQL:

```bash
stacktape query sql myDatabase "SHOW TABLES" --stage prod --region eu-west-1
```

### `<resource-name>` (required)

The first positional argument: the name of the relational database resource as defined in your Stacktape configuration. The resource must be a `relational-database` — other resource types are not supported by this command.

### `--bastion-resource`

Name of a [bastion host](/resources/security/bastion-host) resource to tunnel through. Use `--bastion-resource` when you want `query sql` to tunnel through a Stacktape bastion host to reach a VPC-only database. Stacktape opens an SSM port-forwarding session for the duration of the query and tears it down automatically afterward.

```bash
stacktape query sql myDatabase "SELECT count(*) FROM orders" --stage prod --region eu-west-1 --bastion-resource myBastion
```

If you need a persistent tunnel (for example, to connect a local GUI client), use [`bastion tunnel`](/cli/bastion-tunnel) instead.

### `--limit`

Maximum number of rows to return. Default: **1000**. The output indicates whether results were truncated.

```bash
stacktape query sql myDatabase "SELECT * FROM events" --stage prod --region eu-west-1 --limit 50
```

### `--timeout`

Maximum time to wait for the query to finish, in milliseconds. Default: **30000** (30 seconds). Increase this for queries against large tables or complex joins.

```bash
stacktape query sql myDatabase "SELECT * FROM large_table" --stage prod --region eu-west-1 --timeout 60000
```

### `--agent`

Switches output to structured JSON for programmatic consumption. In agent mode, `query sql` writes a JSON object containing `ok`, `resource`, `engine`, `sql`, `rows`, `fields`, `rowCount`, and `truncated`. Use this when calling `query sql` from scripts or AI coding assistants.

```bash
stacktape query sql myDatabase "SELECT * FROM users LIMIT 5" --stage prod --region eu-west-1 --agent
```

## Examples

### Check if a migration ran

```bash
stacktape query sql mainDb "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5" --stage staging --region eu-west-1
```

### Count rows in a table

```bash
stacktape query sql mainDb "SELECT count(*) FROM orders WHERE created_at > '2025-01-01'" --stage prod --region eu-west-1
```

### Describe a PostgreSQL table

```bash
stacktape query sql mainDb "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users'" --stage prod --region eu-west-1
```

### Explain a slow query

```bash
stacktape query sql mainDb "EXPLAIN ANALYZE SELECT * FROM orders JOIN users ON orders.user_id = users.id WHERE users.email LIKE '%@example.com'" --stage prod --region eu-west-1
```

### Query through a bastion host

```bash
stacktape query sql mainDb "SELECT * FROM products WHERE stock = 0" --stage prod --region eu-west-1 --bastion-resource bastion
```

## Output

In interactive mode, `query sql` prints results as a formatted ASCII table with column headers. When no rows match, it prints "No rows returned."

In agent mode (`--agent`), the output is a structured JSON object containing:

- `ok` — `true` on success
- `resource` — the resource name argument
- `engine` — `postgres` or `mysql`
- `sql` — the executed query string
- `rows` — array of row objects
- `fields` — array of column name strings
- `rowCount` — number of rows returned
- `truncated` — `true` if `rowCount` hit the `--limit` cap

## Flags reference


## CLI Options: `stacktape query sql`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resource-name (positional 1)` | yes | `string` | Resource Name — The name of the resource as defined in your Stacktape configuration. | - |
| `--sql (positional 2)` | yes | `string` | SQL Query — SQL query to execute. Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN) are allowed. | - |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters and no fixed maximum. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `--bastion-resource` | no | `string` | Bastion Resource Name — The name of the bastion resource as defined in your Stacktape configuration. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--limit` | no | `number` | Limit — Maximum number of items to return. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--timeout` | no | `number` | Query Timeout — Maximum time to wait for query execution in milliseconds (default: 30000). | - |


## Related commands

- [`bastion tunnel`](/cli/bastion-tunnel) — open a persistent tunnel to a VPC resource for use with a local database client like `psql`, `mysql`, or DataGrip.
- [`logs`](/cli/logs) — fetch and analyze logs from deployed resources.
- [`query dynamodb`](/cli/query-dynamodb) — run read-only queries against a deployed DynamoDB table.
- [`query redis`](/cli/query-redis) — inspect keys and values in a deployed Redis cache.
- [`query opensearch`](/cli/query-opensearch) — search and inspect a deployed OpenSearch domain.

## FAQ

### What SQL statements does `query sql` accept?

The command accepts SQL whose trimmed text starts with `SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`, or `\d` (PostgreSQL meta-commands). Any SQL that does not start with one of these prefixes is rejected before it reaches the database. This is intended for read-only inspection of deployed databases from the CLI.

### What database types does it work with?

The `query sql` command works with deployed Stacktape `relational-database` resources whose connection string uses the `postgresql://` or `mysql://` protocol. The engine is detected automatically from the connection string, and the appropriate database client driver is used.

### Do I need to know the database password?

No. Stacktape resolves the full connection string — including host, port, username, and password — from the deployed stack's SSM parameters at query time. You only need the resource name and stage. The connection uses SSL automatically.

### When should I use `query sql` vs `bastion tunnel`?

Use `query sql` for quick, one-off inspections: checking a row, verifying a migration, counting records. Use [`bastion tunnel`](/cli/bastion-tunnel) when you need a persistent connection for a local database client (psql, DataGrip, TablePlus) or need to run write operations. The `query sql` command is read-only by design.

### Can I query a database that is only reachable inside a VPC?

Yes, if your stack includes a [bastion host](/resources/security/bastion-host). Pass `--bastion-resource` and Stacktape opens an SSM port-forwarding session for the duration of the query, then tears it down automatically afterward. Without a bastion resource in the stack, `query sql` cannot reach a VPC-only database.

### What happens if my query returns too many rows?

Results are capped by the `--limit` flag, which defaults to 1000 rows. The output includes a `truncated` indicator when the limit is reached. Increase `--limit` if you need more rows, but keep in mind that large result sets are printed to the terminal. For bulk data exports, use [`bastion tunnel`](/cli/bastion-tunnel) with a dedicated database client.

### Does `query sql` use the reader or writer endpoint?

When the deployed database exposes a `readerConnectionString` SSM parameter, `query sql` uses it. Otherwise it uses the primary `connectionString` parameter. This routes read queries away from the writer instance when a reader endpoint is available.

### How do I get machine-readable output for scripts or AI agents?

Pass `--agent` to switch from the formatted ASCII table to a structured JSON object containing `ok`, `resource`, `engine`, `sql`, `rows`, `fields`, `rowCount`, and `truncated`. This is the format to parse when calling `query sql` from scripts or AI coding assistants.
