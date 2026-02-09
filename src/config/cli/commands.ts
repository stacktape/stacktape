import {
  apiKey,
  agent,
  agentChild,
  agentPort,
  awsAccount,
  cleanupContainers,
  freshDb,
  assumeRoleOfResource,
  autoConfirmOperation,
  awsRegion,
  bastionResource,
  bucketId,
  command,
  configDependentArgs,
  configFormat,
  configPath,
  container,
  devMode,
  disableAutoRollback,
  disableDockerRemoteCache,
  disableDriftDetection,
  disableEmulation,
  disableLayerOptimization,
  dockerArgs,
  env,
  filter,
  headersPreset,
  hotSwap,
  infrastructureType,
  initializeProjectTo,
  invalidateCdnCache,
  limit,
  localTunnelingPort,
  logLevel,
  newVersion,
  noCache,
  noTunnel,
  outFile,
  paramName,
  preserveTempFiles,
  projectDirectory,
  organizationId,
  organizationName,
  projectName,
  raw,
  remoteResources,
  resourceName,
  resources,
  resourcesToSkip,
  scriptName,
  showSensitiveValues,
  skipResources,
  sourcePath,
  stackArgs,
  stackName,
  stage,
  starterId,
  starterProject,
  startTime,
  templateId,
  universalArgs,
  useAi,
  watch,
  secretName,
  secretValue,
  secretFile,
  forceUpdate,
  logsQuery,
  metric,
  period,
  stat,
  alarmState,
  taskArn,
  sqlQuery,
  queryTimeout,
  sdkService,
  sdkCommand,
  sdkInput,
  dbOperation,
  dynamoPk,
  dynamoSk,
  dbIndex,
  redisKey,
  redisPattern,
  redisSection,
  documentId
} from './options';

// ============ Command Definitions ============

export const commandDefinitions = {
  deploy: {
    description: `Deploys your stack to AWS.

If the stack doesn't exist, it creates a new one. If it already exists, it updates it. This command requires a valid Stacktape configuration file (\`stacktape.yml\`) in the current directory, or you can specify a path using the \`--configPath\` option.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      disableDriftDetection: disableDriftDetection.optional(),
      preserveTempFiles: preserveTempFiles.optional(),
      dockerArgs: dockerArgs.optional(),
      noCache: noCache.optional(),
      disableDockerRemoteCache: disableDockerRemoteCache.optional(),
      disableAutoRollback: disableAutoRollback.optional(),
      autoConfirmOperation: autoConfirmOperation.optional(),
      showSensitiveValues: showSensitiveValues.optional(),
      hotSwap: hotSwap.optional(),
      disableLayerOptimization: disableLayerOptimization.optional()
    },
    requiredArgs: ['stage', 'region'] as const
  },

  'codebuild:deploy': {
    description: `Deploys your stack to AWS using AWS CodeBuild.

This command offloads the deployment process to a dedicated environment within your AWS account, which is useful for resource-intensive projects.

Here's how it works:
1. Your project is zipped and uploaded to an S3 bucket in your account.
2. A CodeBuild environment (a dedicated VM) is provisioned.
3. The deployment begins, and logs are streamed to your terminal in real-time.

Like the \`deploy\` command, this requires a \`stacktape.yml\` file.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      disableDriftDetection: disableDriftDetection.optional(),
      preserveTempFiles: preserveTempFiles.optional(),
      dockerArgs: dockerArgs.optional(),
      noCache: noCache.optional(),
      disableDockerRemoteCache: disableDockerRemoteCache.optional(),
      disableAutoRollback: disableAutoRollback.optional(),
      autoConfirmOperation: autoConfirmOperation.optional(),
      showSensitiveValues: showSensitiveValues.optional(),
      hotSwap: hotSwap.optional(),
      disableLayerOptimization: disableLayerOptimization.optional()
    },
    requiredArgs: ['stage', 'region'] as const
  },

  dev: {
    description: `Runs your application locally for development and debugging.

Supports two modes (use \`--devMode\` to select):

#### Normal mode (default):
- Deploys a minimal "dev stack" to AWS with only essential infrastructure (IAM roles, secrets).
- Runs workloads (containers, functions) locally on your machine.
- Emulates databases (PostgreSQL, MySQL, DynamoDB) and Redis locally using Docker.
- Automatically sets up tunnels so AWS Lambda functions can reach your local databases.
- No need for a pre-deployed stack - creates one automatically if needed.

#### Legacy mode (\`--devMode legacy\`):
- Requires an already deployed stack.
- Runs selected workloads locally while connecting to deployed AWS resources.
- No local database emulation - uses deployed databases directly.
- Useful when you need to test against production-like data.

#### Common features:
- Interactive resource picker (or use \`--resources\` to specify).
- Hot-reload: type a number + enter to rebuild a workload, or \`a\` + enter to rebuild all.
- Automatic file watching with \`--watch\` flag.
- Injects environment variables, secrets, and AWS credentials into local workloads.
- Streams logs from all running workloads to the console.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      watch: watch.optional(),
      container: container.optional(),
      disableEmulation: disableEmulation.optional(),
      resourceName: resourceName.optional(),
      preserveTempFiles: preserveTempFiles.optional(),
      dockerArgs: dockerArgs.optional(),
      noTunnel: noTunnel.optional(),
      remoteResources: remoteResources.optional(),
      resources: resources.optional(),
      skipResources: skipResources.optional(),
      devMode: devMode.optional(),
      agent: agent.optional(),
      agentPort: agentPort.optional(),
      agentChild: agentChild.optional(),
      freshDb: freshDb.optional()
    },
    requiredArgs: ['region', 'stage'] as const
  },

  'dev:stop': {
    description: `Stops a running dev agent.

Use this command to gracefully stop a dev agent that was started with \`dev --agent\`.

If multiple agents are running, you'll be prompted to specify which one to stop using \`--agentPort\`.

Use \`--cleanupContainers\` to remove orphaned Docker containers left behind by crashed dev sessions.`,
    args: {
      ...universalArgs,
      agentPort: agentPort.optional(),
      cleanupContainers: cleanupContainers.optional()
    },
    requiredArgs: [] as const
  },

  'deployment-script:run': {
    description: `Runs a deployment script defined in your configuration.

This command only updates the script's source code. To update environment variables or other configurations, use the \`deploy\` command.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      resourceName: resourceName.optional()
    },
    requiredArgs: ['stage', 'region', 'resourceName'] as const
  },

  delete: {
    description: `Deletes your stack from AWS.

This action is irreversible and will permanently remove all resources in the stack. Be sure to back up any data you want to keep. If you don't provide a configuration file, \`beforeDelete\` hooks will not be executed.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      autoConfirmOperation: autoConfirmOperation.optional()
    },
    requiredArgs: ['region'] as const
  },

  help: {
    description: `Displays help information for commands and their options.`,
    args: {
      command: command.optional()
    },
    requiredArgs: [] as const
  },

  version: {
    description: `Prints the current version of Stacktape.`,
    args: {},
    requiredArgs: [] as const
  },

  'compile-template': {
    description: `Compiles your Stacktape configuration into a CloudFormation template.

By default, the template is saved to \`./compiled-template.yaml\`. Use the \`--outFile\` option to specify a different path.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      outFile: outFile.optional(),
      preserveTempFiles: preserveTempFiles.optional()
    },
    requiredArgs: ['stage', 'region'] as const
  },

  'aws-profile:create': {
    description: `Creates a new AWS profile on your system.

You will be prompted to enter a profile name, AWS Access Key ID, and AWS Secret Access Key. The credentials are stored in the default AWS location in your home directory and can be used by other AWS tools.`,
    args: {
      logLevel: logLevel.optional()
    },
    requiredArgs: [] as const
  },

  'aws-profile:update': {
    description: `Updates an existing AWS profile on your system.

You will be prompted to enter the profile name and the new credentials.`,
    args: {
      logLevel: logLevel.optional()
    },
    requiredArgs: [] as const
  },

  'aws-profile:delete': {
    description: `Deletes an AWS profile from your system.

You will be prompted to enter the name of the profile to delete.`,
    args: {
      logLevel: logLevel.optional()
    },
    requiredArgs: [] as const
  },

  'aws-profile:list': {
    description: `Lists all AWS profiles configured on your system.`,
    args: {
      logLevel: logLevel.optional()
    },
    requiredArgs: [] as const
  },

  'domain:add': {
    description: `Adds a domain to your AWS account.

Once added, the domain and its subdomains can be used with various resources, such as Web Services, Hosting Buckets, and API Gateways. Before adding a domain, please review the [Domains and Certificates documentation](https://docs.stacktape.com/other-resources/domains-and-certificates/#adding-domain).`,
    args: {
      ...universalArgs,
      region: awsRegion.optional()
    },
    requiredArgs: ['region'] as const
  },

  'cf-module:update': {
    description: `Updates AWS CloudFormation infrastructure module private types to the latest compatible version.

AWS CloudFormation infrastructure modules are used to integrate third-party services into your stack. If a third-party API changes, use this command to update the modules in your account to the latest version.`,
    args: {
      ...universalArgs,
      region: awsRegion.optional()
    },
    requiredArgs: ['region'] as const
  },

  'secret:create': {
    description: `Creates a secret that is securely stored in AWS Secrets Manager.

This secret can then be referenced in your configuration using the \`$Secret('secret-name')\` directive. This is useful for storing sensitive data like passwords, API keys, or other credentials.

In agent mode, use --secretName with either --secretValue or --secretFile. Use --forceUpdate to update existing secrets without prompting.`,
    args: {
      ...universalArgs,
      region: awsRegion.optional(),
      secretName: secretName.optional(),
      secretValue: secretValue.optional(),
      secretFile: secretFile.optional(),
      forceUpdate: forceUpdate.optional()
    },
    requiredArgs: ['region'] as const
  },

  'secret:get': {
    description: `Prints details about a specified secret to the console.

In agent mode, use --secretName to specify the secret.`,
    args: {
      ...universalArgs,
      region: awsRegion.optional(),
      secretName: secretName.optional()
    },
    requiredArgs: ['region'] as const
  },

  'secret:delete': {
    description: `Deletes a specified secret.

In agent mode, use --secretName to specify the secret to delete.`,
    args: {
      ...universalArgs,
      region: awsRegion.optional(),
      secretName: secretName.optional()
    },
    requiredArgs: ['region'] as const
  },

  rollback: {
    description: `Rolls back the stack to the last known good state.

This is useful if a stack update fails and leaves the stack in an \`UPDATE_FAILED\` state.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      resourcesToSkip: resourcesToSkip.optional()
    },
    requiredArgs: ['region'] as const
  },

  'package-workloads': {
    description: `Packages your compute resources and prepares them for deployment.

This is useful for inspecting the packaged artifacts before deploying.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs
    },
    requiredArgs: ['stage', 'region'] as const
  },

  'preview-changes': {
    description: `Shows a preview of the changes that will be made to your stack if you deploy the current configuration.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      preserveTempFiles: preserveTempFiles.optional()
    },
    requiredArgs: ['stage', 'region'] as const
  },

  'debug:logs': {
    description: `Fetch and analyze logs from a deployed resource.

Supports two modes:
- **Standard**: Fetches recent log events with optional filtering
- **Insights**: Runs CloudWatch Logs Insights query with --query flag

Examples:
  stacktape debug:logs --stage prod --resourceName myLambda --startTime "1h"
  stacktape debug:logs --stage prod --resourceName myLambda --query "fields @timestamp, @message | filter @message like /ERROR/"`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      resourceName: resourceName.optional(),
      startTime: startTime.optional(),
      filter: filter.optional(),
      raw: raw.optional(),
      query: logsQuery.optional(),
      limit: limit.optional()
    },
    requiredArgs: ['stage', 'region', 'resourceName'] as const
  },

  'debug:alarms': {
    description: `View CloudWatch alarm states for stack resources.

Shows all alarms configured for the stack with their current state (OK, ALARM, INSUFFICIENT_DATA).
Filter by resource name or alarm state.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      resourceName: resourceName.optional(),
      state: alarmState.optional()
    },
    requiredArgs: ['stage', 'region'] as const
  },

  'debug:metrics': {
    description: `Fetch CloudWatch metrics for a deployed resource.

Supported metrics by resource type:
- Lambda: Invocations, Errors, Duration, Throttles
- ECS: CPUUtilization, MemoryUtilization
- RDS: CPUUtilization, DatabaseConnections, FreeStorageSpace
- API Gateway: Count, 4XXError, 5XXError, Latency`,
    args: {
      ...universalArgs,
      ...stackArgs,
      resourceName: resourceName.optional(),
      metric: metric.optional(),
      period: period.optional(),
      stat: stat.optional(),
      startTime: startTime.optional()
    },
    requiredArgs: ['stage', 'region', 'resourceName', 'metric'] as const
  },

  init: {
    description: `Initializes a new Stacktape project and guides you through deployment.

By default, runs an interactive wizard that:
1. Analyzes your project with AI and generates a configuration
2. Helps you sign up or log in to Stacktape
3. Connects your AWS account
4. Creates a project and optionally sets up CI/CD
5. Offers to deploy immediately

Alternative modes:
- **Starter project:** Use \`--starterProject\` or \`--starterId\` to initialize from a pre-configured template.
- **Legacy AI-only:** Use \`--useAi\` for just the AI config generation without the full wizard.
- **Template:** Use \`--templateId\` to fetch a template from the Stacktape console.`,
    args: {
      logLevel: logLevel.optional(),
      starterId: starterId.optional(),
      starterProject: starterProject.optional(),
      projectDirectory: projectDirectory.optional(),
      templateId: templateId.optional(),
      initializeProjectTo: initializeProjectTo.optional(),
      configFormat: configFormat.optional(),
      useAi: useAi.optional(),
      infrastructureType: infrastructureType.optional()
    },
    requiredArgs: [] as const
  },

  'bucket:sync': {
    description: `Synchronizes the contents of a local directory with an S3 bucket.

You can specify the bucket in two ways:
- **Using Stacktape configuration:** Provide the \`stage\` and \`resourceName\`. Stacktape will identify the bucket from the deployed stack and sync the directory specified in the configuration file.
- **Using bucket ID:** Provide a valid \`bucketId\` (AWS physical resource ID or bucket name) and a \`sourcePath\`.

Files in the bucket that are not present in the source directory will be removed.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      bucketId: bucketId.optional(),
      sourcePath: sourcePath.optional(),
      invalidateCdnCache: invalidateCdnCache.optional(),
      headersPreset: headersPreset.optional(),
      resourceName: resourceName.optional()
    },
    requiredArgs: ['region'] as const
  },

  'bastion:session': {
    description: `Starts an interactive session with a bastion host.

Your stack must include a \`bastion\` resource. If you have multiple bastions, you can specify which one to connect to with the \`--bastionResource\` argument. The session is established over a secure SSM connection.

For more information, refer to the [bastion documentation](https://docs.stacktape.com/bastion-servers/#connecting-to-bastion-interactive-session).`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      bastionResource: bastionResource.optional()
    },
    requiredArgs: ['region', 'stage'] as const
  },

  'bastion:tunnel': {
    description: `Creates a secure tunnel to a resource through a bastion host.

Your stack must include a \`bastion\` resource. This is useful for accessing resources in a private VPC. If you have multiple bastions, you can specify one with the \`--bastionResource\` argument. The command will print the tunneled endpoints to the terminal.

For more information, refer to the [bastion tunnel documentation](https://docs.stacktape.com/bastion-servers/#creating-bastion-tunnel).`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      bastionResource: bastionResource.optional(),
      resourceName: resourceName.optional(),
      localTunnelingPort: localTunnelingPort.optional()
    },
    requiredArgs: ['region', 'stage', 'resourceName'] as const
  },

  'container:session': {
    description: `Starts an interactive session inside a deployed container.

The session is established using ECS Exec and a secure SSM connection. If your service has multiple containers, you can choose which one to connect to. This is useful for debugging and inspecting running containers.

For more information, refer to the [container session documentation](https://docs.stacktape.com/bastion-servers/#connecting-to-bastion-interactive-session).`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      resourceName: resourceName.optional(),
      container: container.optional(),
      command: command.optional()
    },
    requiredArgs: ['region', 'stage', 'resourceName'] as const
  },

  'debug:container-exec': {
    description: `Execute a command in a running container and return the output.

Runs a command inside a deployed container workload (web-service, private-service, worker-service, or multi-container-workload) using ECS Exec. The command output is captured and returned as JSON.

Use --taskArn to specify which task to connect to when multiple instances are running (defaults to first available). Use --container to specify which container for multi-container workloads.

Examples:
  stacktape debug:container-exec --stage prod --resourceName myService --command "ls -la"
  stacktape debug:container-exec --stage prod --resourceName myService --command "cat /app/config.json"
  stacktape debug:container-exec --stage prod --resourceName myService --taskArn abc123 --command "env"`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      resourceName: resourceName.optional(),
      container: container.optional(),
      command: command.optional(),
      taskArn: taskArn.optional()
    },
    requiredArgs: ['region', 'stage', 'resourceName', 'command'] as const
  },

  'debug:sql': {
    description: `Execute read-only SQL queries against a deployed relational database.

Supports PostgreSQL and MySQL databases. Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN) are allowed.

If the database is VPC-only, use --bastionResource to tunnel through a bastion host.

Examples:
  stacktape debug:sql --stage prod --resourceName myDatabase --sql "SELECT * FROM users LIMIT 10"
  stacktape debug:sql --stage prod --resourceName myDatabase --bastionResource myBastion --sql "SHOW TABLES"`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      resourceName: resourceName.optional(),
      bastionResource: bastionResource.optional(),
      sql: sqlQuery.optional(),
      limit: limit.optional(),
      timeout: queryTimeout.optional()
    },
    requiredArgs: ['region', 'stage', 'resourceName', 'sql'] as const
  },

  'debug:aws-sdk': {
    description: `Execute read-only AWS SDK commands against deployed resources.

Provides direct access to AWS SDK v3 for inspecting deployed resources. Only read-only operations (List*, Get*, Describe*, Head*) are allowed.

Examples:
  stacktape debug:aws-sdk --stage prod --service lambda --command ListFunctions
  stacktape debug:aws-sdk --stage prod --service dynamodb --command Scan --input '{"TableName": "my-table", "Limit": 10}'
  stacktape debug:aws-sdk --stage prod --service logs --command FilterLogEvents --input '{"logGroupName": "/aws/lambda/my-func"}'`,
    args: {
      ...universalArgs,
      ...stackArgs,
      service: sdkService.optional(),
      command: sdkCommand.optional(),
      input: sdkInput.optional()
    },
    requiredArgs: ['region', 'service', 'command'] as const
  },

  'debug:dynamodb': {
    description: `Query a deployed DynamoDB table.

Supports operations: scan, query, get, schema, sample. All operations are read-only.

Examples:
  stacktape debug:dynamodb --stage prod --resourceName myTable --operation sample
  stacktape debug:dynamodb --stage prod --resourceName myTable --operation schema
  stacktape debug:dynamodb --stage prod --resourceName myTable --operation scan --limit 50
  stacktape debug:dynamodb --stage prod --resourceName myTable --operation query --pk '{"userId": "123"}'
  stacktape debug:dynamodb --stage prod --resourceName myTable --operation get --pk '{"userId": "123"}' --sk '{"timestamp": 1234}'`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      resourceName: resourceName.optional(),
      operation: dbOperation.optional(),
      pk: dynamoPk.optional(),
      sk: dynamoSk.optional(),
      index: dbIndex.optional(),
      limit: limit.optional()
    },
    requiredArgs: ['region', 'stage', 'resourceName'] as const
  },

  'debug:redis': {
    description: `Query a deployed Redis cluster.

Supports operations: keys, get, ttl, info, type. All operations are read-only.

If the Redis cluster is VPC-only, use --bastionResource to tunnel through a bastion host.

Examples:
  stacktape debug:redis --stage prod --resourceName myRedis --operation info
  stacktape debug:redis --stage prod --resourceName myRedis --operation keys --pattern "user:*"
  stacktape debug:redis --stage prod --resourceName myRedis --operation get --key "session:abc123"
  stacktape debug:redis --stage prod --resourceName myRedis --bastionResource myBastion --operation info`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      resourceName: resourceName.optional(),
      bastionResource: bastionResource.optional(),
      operation: dbOperation.optional(),
      key: redisKey.optional(),
      pattern: redisPattern.optional(),
      section: redisSection.optional(),
      limit: limit.optional()
    },
    requiredArgs: ['region', 'stage', 'resourceName'] as const
  },

  'debug:opensearch': {
    description: `Query a deployed OpenSearch domain.

Supports operations: search, get, indices, mapping, count. All operations are read-only.

Examples:
  stacktape debug:opensearch --stage prod --resourceName mySearch --operation indices
  stacktape debug:opensearch --stage prod --resourceName mySearch --operation mapping --index users
  stacktape debug:opensearch --stage prod --resourceName mySearch --operation count --index users
  stacktape debug:opensearch --stage prod --resourceName mySearch --operation get --index users --id doc123
  stacktape debug:opensearch --stage prod --resourceName mySearch --operation search --query '{"match_all": {}}'`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      resourceName: resourceName.optional(),
      operation: dbOperation.optional(),
      index: dbIndex.optional(),
      id: documentId.optional(),
      query: logsQuery.optional(),
      limit: limit.optional()
    },
    requiredArgs: ['region', 'stage', 'resourceName'] as const
  },

  'defaults:configure': {
    description: `Sets system-wide default arguments for Stacktape commands.

You can set defaults for:
- \`region\`
- \`stage\`
- \`awsProfile\`
- \`projectName\`
- \`awsAccount\`

You can also configure default executables for resolving Node.js directives.`,
    args: {},
    requiredArgs: [] as const
  },

  'defaults:list': {
    description: `Prints all configured system-wide Stacktape defaults.`,
    args: {},
    requiredArgs: [] as const
  },

  'script:run': {
    description: `Executes a script defined in your configuration.

You can pass environment variables to the script using the \`--env\` option (e.g., \`--env MY_VAR=my_value\`).

To learn more, refer to the [scripts documentation](https://docs.stacktape.com/configuration/scripts/).`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      env: env.optional(),
      scriptName: scriptName.optional(),
      assumeRoleOfResource: assumeRoleOfResource.optional()
    },
    requiredArgs: ['scriptName', 'stage'] as const
  },

  'param:get': {
    description: `Retrieves a specified parameter from a resource in a deployed stack.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      configPath: configPath.optional(),
      resourceName: resourceName.optional(),
      paramName: paramName.optional()
    },
    requiredArgs: ['region', 'resourceName', 'paramName'] as const
  },

  'info:stacks': {
    description: `Lists all stacks deployed in a specified region.

Shows stack name, status, last update time, creation time, and estimated spend. Useful for discovering what's deployed in your AWS account.`,
    args: {
      ...universalArgs,
      ...stackArgs
    },
    requiredArgs: ['region'] as const
  },

  upgrade: {
    description: `Upgrades Stacktape to the latest version.

You can also specify a version to install using the \`--version\` option.`,
    args: {
      newVersion: newVersion.optional()
    },
    requiredArgs: [] as const
  },

  login: {
    description: `Configures your Stacktape API key for the current system.

All subsequent operations will be associated with the user and organization linked to this API key. You can get your API key from the [Stacktape console](https://console.stacktape.com/api-keys). You can provide the key with the \`--apiKey\` option or enter it interactively.`,
    args: {
      ...universalArgs,
      apiKey: apiKey.optional()
    },
    requiredArgs: [] as const
  },

  logout: {
    description: `Removes the Stacktape API key from the current system.`,
    args: {
      ...universalArgs,
      apiKey: apiKey.optional()
    },
    requiredArgs: [] as const
  },

  'org:create': {
    description: `Creates a new organization in your Stacktape account.

In interactive mode, you'll be prompted for the organization name. In agent mode, provide --organizationName.

The command returns a new API key scoped to the newly created organization.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      organizationName: organizationName.optional()
    },
    requiredArgs: [] as const
  },

  'org:list': {
    description: `Lists organizations accessible with your current Stacktape user.

Shows organization name, role, number of connected AWS accounts, and whether it's the current organization for your API key.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional()
    },
    requiredArgs: [] as const
  },

  'org:delete': {
    description: `Deletes organization access for your user.

In interactive mode, you'll pick an organization. In agent mode, provide --organizationId.

This operation is allowed only for organization OWNER and only when there are no other non-service users and no active connected AWS accounts.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      organizationId: organizationId.optional()
    },
    requiredArgs: [] as const
  },

  'project:create': {
    description: `Creates a new project in the current organization.

If you omit --projectName in interactive mode, you'll be prompted for it. In agent mode, provide --projectName.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      projectName: projectName.optional(),
      region: awsRegion.optional()
    },
    requiredArgs: [] as const
  },

  'projects:list': {
    description: `Lists all projects in your organization with their deployed stages, status, and costs.

Shows each project with its stages, deployment status (in-progress, errored, etc.), and current/previous month costs. Useful for getting an overview of your deployments.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional()
    },
    requiredArgs: [] as const
  },

  'info:whoami': {
    description: `Displays information about the current user, organization, connected AWS accounts, and accessible projects.

Use this command to verify your API key is configured correctly and to see what resources you have access to.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional()
    },
    requiredArgs: [] as const
  },

  'info:operations': {
    description: `Lists recent deployment operations (deploy, delete) with their status.

Shows operation history including success/failure status, timestamps, and error descriptions for failed operations. Filter by project or stage to narrow results.`,
    args: {
      logLevel: logLevel.optional(),
      projectName: projectName.optional(),
      stage: stage.optional(),
      limit: limit.optional(),
      agent: agent.optional()
    },
    requiredArgs: [] as const
  },

  'info:stack': {
    description: `Displays detailed information about a deployed stack including outputs and resources.

Returns stack outputs (URLs, endpoints, resource identifiers) and the list of AWS resources in the stack. Useful for discovering endpoints after deployment.

You can identify the stack in two ways:
- Using --stackName directly (e.g., --stackName my-project-prod)
- Using --projectName and --stage (e.g., --projectName my-project --stage prod)`,
    args: {
      logLevel: logLevel.optional(),
      stackName: stackName.optional(),
      projectName: projectName.optional(),
      stage: stage.optional(),
      region: awsRegion.optional(),
      awsAccount: awsAccount.optional(),
      agent: agent.optional()
    },
    requiredArgs: ['region'] as const
  }
} as const;

// ============ Derived Types ============

export type CommandDefinitions = typeof commandDefinitions;
export type StacktapeCommand = keyof CommandDefinitions;

// ============ Command Arrays ============

export const cliCommands = Object.keys(commandDefinitions) as StacktapeCommand[];

// Commands that don't show announcements
export const commandsWithDisabledAnnouncements: StacktapeCommand[] = [
  'dev',
  'version',
  'upgrade',
  'info:whoami',
  'info:operations',
  'info:stacks',
  'info:stack'
];

// Commands that don't require API key
export const commandsNotRequiringApiKey: StacktapeCommand[] = [
  'login',
  'logout',
  'version',
  'help',
  'defaults:list',
  'defaults:configure',
  'upgrade',
  'init'
];
