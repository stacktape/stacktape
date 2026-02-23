# Stacktape CLI Reference

All commands support `--agent` flag for non-interactive, machine-readable output.

## Essential Commands

### Deploy
```bash
npx stacktape deploy --stage <stage> --region <region>
```
Deploys your application to AWS.

### Local Development
```bash
npx stacktape dev --stage <stage> --region <region>
```
Runs your app locally with hot reload. Emulates databases locally.

### Preview Changes
```bash
npx stacktape preview-changes --stage <stage> --region <region>
```
Shows what would change without deploying.

### Delete
```bash
npx stacktape delete --stage <stage> --region <region>
```
Removes all deployed resources.

## Debugging Commands

### View Logs
```bash
npx stacktape debug:logs --stage <stage> --region <region> --resourceName <name>
```

### View Metrics
```bash
npx stacktape debug:metrics --stage <stage> --region <region> --resourceName <name>
```

### Database Query (PostgreSQL)
```bash
npx stacktape debug:sql --stage <stage> --region <region> --resourceName <dbName>
```

### DynamoDB Query
```bash
npx stacktape debug:dynamodb --stage <stage> --region <region> --resourceName <tableName>
```

### Container Shell
```bash
npx stacktape debug:container-exec --stage <stage> --region <region> --resourceName <name>
```

## Secret Management

### Create Secret
```bash
npx stacktape secret:create --secretName <name> --secretValue <value> --region <region>
```

### Get Secret
```bash
npx stacktape secret:get --secretName <name> --region <region>
```

## Common Options

| Option | Description |
|--------|-------------|
| `--stage` | Environment name (dev, staging, prod) |
| `--region` | AWS region (us-east-1, eu-west-1, etc.) |
| `--configPath` | Path to config file (default: stacktape.yml) |
| `--agent` | Machine-readable output, no prompts |
| `--profile` | AWS profile to use |

## All Commands


### `stacktape aws-profile:create`
Creates a new AWS profile on your system.

You will be prompted to enter a profile name, AWS Access Key ID, and AWS Secret Access Key. The credentials are stored in the default AWS location in your home directory and can be used by other AWS tools.

### `stacktape aws-profile:delete`
Deletes an AWS profile from your system.

You will be prompted to enter the name of the profile to delete.

### `stacktape aws-profile:list`
Lists all AWS profiles configured on your system.

### `stacktape aws-profile:update`
Updates an existing AWS profile on your system.

You will be prompted to enter the profile name and the new credentials.

### `stacktape bastion:session`
Starts an interactive session with a bastion host.

Your stack must include a `bastion` resource. If you have multiple bastions, you can specify which one to connect to with the `--bastionResource` argument. The session is established over a secure SSM connection.

For more information, refer to the [bastion documentation](https://docs.stacktape.com/bastion-servers/#connecting-to-bastion-interactive-session).

### `stacktape bastion:tunnel`
Creates a secure tunnel to a resource through a bastion host.

Your stack must include a `bastion` resource. This is useful for accessing resources in a private VPC. If you have multiple bastions, you can specify one with the `--bastionResource` argument. The command will print the tunneled endpoints to the terminal.

For more information, refer to the [bastion tunnel documentation](https://docs.stacktape.com/bastion-servers/#creating-bastion-tunnel).

### `stacktape bucket:sync`
Synchronizes the contents of a local directory with an S3 bucket.

You can specify the bucket in two ways:
- **Using Stacktape configuration:** Provide the `stage` and `resourceName`. Stacktape will identify the bucket from the deployed stack and sync the directory specified in the configuration file.
- **Using bucket ID:** Provide a valid `bucketId` (AWS physical resource ID or bucket name) and a `sourcePath`.

Files in the bucket that are not present in the source directory will be removed.

### `stacktape cf-module:update`
Updates AWS CloudFormation infrastructure module private types to the latest compatible version.

AWS CloudFormation infrastructure modules are used to integrate third-party services into your stack. If a third-party API changes, use this command to update the modules in your account to the latest version.

### `stacktape codebuild:deploy`
Deploys your stack to AWS using AWS CodeBuild.

This command offloads the deployment process to a dedicated environment within your AWS account, which is useful for resource-intensive projects.

Here's how it works:
1. Your project is zipped and uploaded to an S3 bucket in your account.
2. A CodeBuild environment (a dedicated VM) is provisioned.
3. The deployment begins, and logs are streamed to your terminal in real-time.

Like the `deploy` command, this requires a `stacktape.yml` file.

### `stacktape compile-template`
Compiles your Stacktape configuration into a CloudFormation template.

By default, the template is saved to `./compiled-template.yaml`. Use the `--outFile` option to specify a different path.

### `stacktape container:session`
Starts an interactive session inside a deployed container.

The session is established using ECS Exec and a secure SSM connection. If your service has multiple containers, you can choose which one to connect to. This is useful for debugging and inspecting running containers.

For more information, refer to the [container session documentation](https://docs.stacktape.com/bastion-servers/#connecting-to-bastion-interactive-session).

### `stacktape debug:alarms`
View CloudWatch alarm states for stack resources.

Shows all alarms configured for the stack with their current state (OK, ALARM, INSUFFICIENT_DATA).
Filter by resource name or alarm state.

### `stacktape debug:aws-sdk`
Execute read-only AWS SDK commands against deployed resources.

Provides direct access to AWS SDK v3 for inspecting deployed resources. Only read-only operations (List*, Get*, Describe*, Head*) are allowed.

Examples:
  stacktape debug:aws-sdk --stage prod --service lambda --command ListFunctions
  stacktape debug:aws-sdk --stage prod --service dynamodb --command Scan --input '{"TableName": "my-table", "Limit": 10}'
  stacktape debug:aws-sdk --stage prod --service logs --command FilterLogEvents --input '{"logGroupName": "/aws/lambda/my-func"}'

### `stacktape debug:container-exec`
Execute a command in a running container and return the output.

Runs a command inside a deployed container workload (web-service, private-service, worker-service, or multi-container-workload) using ECS Exec. The command output is captured and returned as JSON.

Use --taskArn to specify which task to connect to when multiple instances are running (defaults to first available). Use --container to specify which container for multi-container workloads.

Examples:
  stacktape debug:container-exec --stage prod --resourceName myService --command "ls -la"
  stacktape debug:container-exec --stage prod --resourceName myService --command "cat /app/config.json"
  stacktape debug:container-exec --stage prod --resourceName myService --taskArn abc123 --command "env"

### `stacktape debug:dynamodb`
Query a deployed DynamoDB table.

Supports operations: scan, query, get, schema, sample. All operations are read-only.

Examples:
  stacktape debug:dynamodb --stage prod --resourceName myTable --operation sample
  stacktape debug:dynamodb --stage prod --resourceName myTable --operation schema
  stacktape debug:dynamodb --stage prod --resourceName myTable --operation scan --limit 50
  stacktape debug:dynamodb --stage prod --resourceName myTable --operation query --pk '{"userId": "123"}'
  stacktape debug:dynamodb --stage prod --resourceName myTable --operation get --pk '{"userId": "123"}' --sk '{"timestamp": 1234}'

### `stacktape debug:logs`
Fetch and analyze logs from a deployed resource.

Supports two modes:
- **Standard**: Fetches recent log events with optional filtering
- **Insights**: Runs CloudWatch Logs Insights query with --query flag

Examples:
  stacktape debug:logs --stage prod --resourceName myLambda --startTime "1h"
  stacktape debug:logs --stage prod --resourceName myLambda --query "fields @timestamp, @message | filter @message like /ERROR/"

### `stacktape debug:metrics`
Fetch CloudWatch metrics for a deployed resource.

Supported metrics by resource type:
- Lambda: Invocations, Errors, Duration, Throttles
- ECS: CPUUtilization, MemoryUtilization
- RDS: CPUUtilization, DatabaseConnections, FreeStorageSpace
- API Gateway: Count, 4XXError, 5XXError, Latency

### `stacktape debug:opensearch`
Query a deployed OpenSearch domain.

Supports operations: search, get, indices, mapping, count. All operations are read-only.

Examples:
  stacktape debug:opensearch --stage prod --resourceName mySearch --operation indices
  stacktape debug:opensearch --stage prod --resourceName mySearch --operation mapping --index users
  stacktape debug:opensearch --stage prod --resourceName mySearch --operation count --index users
  stacktape debug:opensearch --stage prod --resourceName mySearch --operation get --index users --id doc123
  stacktape debug:opensearch --stage prod --resourceName mySearch --operation search --query '{"match_all": {}}'

### `stacktape debug:redis`
Query a deployed Redis cluster.

Supports operations: keys, get, ttl, info, type. All operations are read-only.

If the Redis cluster is VPC-only, use --bastionResource to tunnel through a bastion host.

Examples:
  stacktape debug:redis --stage prod --resourceName myRedis --operation info
  stacktape debug:redis --stage prod --resourceName myRedis --operation keys --pattern "user:*"
  stacktape debug:redis --stage prod --resourceName myRedis --operation get --key "session:abc123"
  stacktape debug:redis --stage prod --resourceName myRedis --bastionResource myBastion --operation info

### `stacktape debug:sql`
Execute read-only SQL queries against a deployed relational database.

Supports PostgreSQL and MySQL databases. Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN) are allowed.

If the database is VPC-only, use --bastionResource to tunnel through a bastion host.

Examples:
  stacktape debug:sql --stage prod --resourceName myDatabase --sql "SELECT * FROM users LIMIT 10"
  stacktape debug:sql --stage prod --resourceName myDatabase --bastionResource myBastion --sql "SHOW TABLES"

### `stacktape defaults:configure`
Sets system-wide default arguments for Stacktape commands.

You can set defaults for:
- `region`
- `stage`
- `awsProfile`
- `projectName`
- `awsAccount`

You can also configure default executables for resolving Node.js directives.

### `stacktape defaults:list`
Prints all configured system-wide Stacktape defaults.

### `stacktape delete`
Deletes your stack from AWS.

This action is irreversible and will permanently remove all resources in the stack. Be sure to back up any data you want to keep. If you don't provide a configuration file, `beforeDelete` hooks will not be executed.

### `stacktape deploy`
Deploys your stack to AWS.

If the stack doesn't exist, it creates a new one. If it already exists, it updates it. This command requires a valid Stacktape configuration file (`stacktape.yml`) in the current directory, or you can specify a path using the `--configPath` option.

### `stacktape deployment-script:run`
Runs a deployment script defined in your configuration.

This command only updates the script's source code. To update environment variables or other configurations, use the `deploy` command.

### `stacktape dev`
Runs your application locally for development and debugging.

Supports two modes (use `--devMode` to select):

#### Normal mode (default):
- Deploys a minimal "dev stack" to AWS with only essential infrastructure (IAM roles, secrets).
- Runs workloads (containers, functions) locally on your machine.
- Emulates databases (PostgreSQL, MySQL, DynamoDB) and Redis locally using Docker.
- Automatically sets up tunnels so AWS Lambda functions can reach your local databases.
- No need for a pre-deployed stack - creates one automatically if needed.

#### Legacy mode (`--devMode legacy`):
- Requires an already deployed stack.
- Runs selected workloads locally while connecting to deployed AWS resources.
- No local database emulation - uses deployed databases directly.
- Useful when you need to test against production-like data.

#### Common features:
- Interactive resource picker (or use `--resources` to specify).
- Hot-reload: type a number + enter to rebuild a workload, or `a` + enter to rebuild all.
- Automatic file watching with `--watch` flag.
- Injects environment variables, secrets, and AWS credentials into local workloads.
- Streams logs from all running workloads to the console.

### `stacktape dev:stop`
Stops a running dev agent.

Use this command to gracefully stop a dev agent that was started with `dev --agent`.

If multiple agents are running, you'll be prompted to specify which one to stop using `--agentPort`.

Use `--cleanupContainers` to remove orphaned Docker containers left behind by crashed dev sessions.

### `stacktape domain:add`
Adds a domain to your AWS account.

Once added, the domain and its subdomains can be used with various resources, such as Web Services, Hosting Buckets, and API Gateways. Before adding a domain, please review the [Domains and Certificates documentation](https://docs.stacktape.com/other-resources/domains-and-certificates/#adding-domain).

### `stacktape help`
Displays help information for commands and their options.

### `stacktape info:operations`
Lists recent deployment operations (deploy, delete) with their status.

Shows operation history including success/failure status, timestamps, and error descriptions for failed operations. Filter by project or stage to narrow results.

### `stacktape info:projects`
Lists all projects in your organization with their deployed stages, status, and costs.

Shows each project with its stages, deployment status (in-progress, errored, etc.), and current/previous month costs. Useful for getting an overview of your deployments.

### `stacktape info:stack`
Displays detailed information about a deployed stack including outputs and resources.

Returns stack outputs (URLs, endpoints, resource identifiers) and the list of AWS resources in the stack. Useful for discovering endpoints after deployment.

### `stacktape info:whoami`
Displays information about the current user, organization, connected AWS accounts, and accessible projects.

Use this command to verify your API key is configured correctly and to see what resources you have access to.

### `stacktape init`
Initializes a new Stacktape project in a specified directory.

You can initialize a project in several ways:
- **AI-powered (recommended):** Use `--useAi` to automatically analyze your project and generate a configuration.
- **Interactive Config Editor:** Create a config using the web-based editor.
- **Starter project:** Use `--starterId` to initialize from a pre-configured template.

### `stacktape login`
Configures your Stacktape API key for the current system.

All subsequent operations will be associated with the user and organization linked to this API key. You can get your API key from the [Stacktape console](https://console.stacktape.com/api-keys). You can provide the key with the `--apiKey` option or enter it interactively.

### `stacktape logout`
Removes the Stacktape API key from the current system.

### `stacktape package-workloads`
Packages your compute resources and prepares them for deployment.

This is useful for inspecting the packaged artifacts before deploying.

### `stacktape param:get`
Retrieves a specified parameter from a resource in a deployed stack.

### `stacktape preview-changes`
Shows a preview of the changes that will be made to your stack if you deploy the current configuration.

### `stacktape rollback`
Rolls back the stack to the last known good state.

This is useful if a stack update fails and leaves the stack in an `UPDATE_FAILED` state.

### `stacktape script:run`
Executes a script defined in your configuration.

You can pass environment variables to the script using the `--env` option (e.g., `--env MY_VAR=my_value`).

To learn more, refer to the [scripts documentation](https://docs.stacktape.com/configuration/scripts/).

### `stacktape secret:create`
Creates a secret that is securely stored in AWS Secrets Manager.

This secret can then be referenced in your configuration using the `$Secret('secret-name')` directive. This is useful for storing sensitive data like passwords, API keys, or other credentials.

In agent mode, use --secretName with either --secretValue or --secretFile. Use --forceUpdate to update existing secrets without prompting.

### `stacktape secret:delete`
Deletes a specified secret.

In agent mode, use --secretName to specify the secret to delete.

### `stacktape secret:get`
Prints details about a specified secret to the console.

In agent mode, use --secretName to specify the secret.

### `stacktape stack:info`
Prints information about a specified stack.

You can get information in two formats:
- **Simple (default):** Prints helpful links and parameters for the deployed stack to the terminal.
- **Detailed (`--detailed` flag):** Saves detailed information about the stack to a file (default: `stack-info.yaml`). You can customize the output file and format with the `--outFile` and `--outFormat` options.

In **detailed** mode:
- If the stack is deployed, you'll get an overview of the deployed resources.
- If you also provide a configuration file, the output will show a diff between the deployed resources and the configuration, indicating which resources will be created, updated, or deleted on the next deployment.
- If the stack is not deployed, it will show an overview of the resources that will be created.

By default, sensitive values are omitted. To include them, use the `--showSensitiveValues` flag.

### `stacktape stack:list`
Lists all stacks deployed in a specified region.

### `stacktape upgrade`
Upgrades Stacktape to the latest version.

You can also specify a version to install using the `--version` option.

### `stacktape version`
Prints the current version of Stacktape.
