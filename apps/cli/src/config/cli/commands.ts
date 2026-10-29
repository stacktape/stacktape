import {
  apiKey,
  agent,
  aiProvider,
  codingAgents,
  agentChild,
  devAgent,
  devAgentPort,
  devStopAgentPort,
  awsAccount,
  allDevContainers,
  cleanupContainers,
  freshDb,
  takeOver,
  forceDevNetworkDelete,
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
  currentUserOnly,
  autoRollback,
  disableDockerRemoteCache,
  disableEmulation,
  disableLayerOptimization,
  dockerArgs,
  env,
  filter,
  follow,
  headersPreset,
  fullDeploy,
  recoverOperation,
  headless,
  noBrowser,
  codingAgent,
  infrastructureType,
  initializeProjectTo,
  invalidateCdnCache,
  limit,
  listVersions,
  localTunnelingPort,
  localConfigDependentArgs,
  localUniversalArgs,
  logLevel,
  newVersion,
  noCache,
  noTunnel,
  outFile,
  outputFormat,
  paramName,
  preserveTempFiles,
  projectDirectory,
  incidentId,
  incidentStatus,
  incidentWatchStabilitySeconds,
  incidentWatchTimeoutSeconds,
  issueId,
  issueStatus,
  organizationId,
  organizationName,
  projectName,
  raw,
  remoteResources,
  resourceName,
  resources,
  resourcesToSkip,
  rollbackSteps,
  rollbackVersion,
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
  endTime,
  universalArgs,
  watch,
  withPackage,
  thorough,
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
  documentId,
  deployRunner,
  onlyWorkloads
} from './options';

// ============ Command Definitions ============

export const commandDefinitions = {
  deploy: {
    description: `Deploys your stack to AWS.

If the stack doesn't exist, it creates a new one. If it already exists, it updates it. This command requires a valid Stacktape configuration file (usually \`stacktape.ts\`, with \`stacktape.yml\` still supported) in the current directory, or you can specify a path using the \`--config\` option.`,
    args: {
      recoverOperation: recoverOperation.optional(),
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      preserveTempFiles: preserveTempFiles.optional(),
      dockerArgs: dockerArgs.optional(),
      noCache: noCache.optional(),
      disableDockerRemoteCache: disableDockerRemoteCache.optional(),
      autoRollback: autoRollback.optional(),
      autoConfirmOperation: autoConfirmOperation.optional(),
      showSensitiveValues: showSensitiveValues.optional(),
      fullDeploy: fullDeploy.optional(),
      runner: deployRunner.optional(),
      disableLayerOptimization: disableLayerOptimization.optional()
    },
    requiredArgs: ['stage', 'region'] as const
  },

  dev: {
    description: `Runs your application locally for development and debugging.

- Deploys a minimal "dev stack" to AWS with only essential infrastructure (IAM roles, secrets).
- Runs workloads (containers, functions) locally on your machine.
- Emulates databases (PostgreSQL, MySQL, DynamoDB) and Redis locally using Docker.
- Connects deployed Lambda functions to your local databases through the dev box, a small EC2 instance shared by the account and region (see \`dev network\`).
- No need for a pre-deployed stack - creates one automatically if needed.
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
      disableEmulation: disableEmulation.optional(),
      preserveTempFiles: preserveTempFiles.optional(),
      dockerArgs: dockerArgs.optional(),
      noTunnel: noTunnel.optional(),
      remoteResources: remoteResources.optional(),
      resources: resources.optional(),
      skipResources: skipResources.optional(),
      agent: devAgent.optional(),
      agentPort: devAgentPort.optional(),
      agentChild: agentChild.optional(),
      freshDb: freshDb.optional(),
      takeOver: takeOver.optional()
    },
    requiredArgs: ['region', 'stage'] as const
  },

  'dev:stop': {
    description: `Stops a running dev agent.

Use this command to gracefully stop a dev agent that was started with \`dev --agent\`.

It stops the agent of the project in the current directory, or in \`--cwd\`. When several stages of the project run, choose one with \`--stage\`; the command stops none and fails with the list instead of guessing. \`--agent-port\` stops the agent on that port, wherever it was started. Agents of other directories are never stopped by a guess.

Use \`--cleanup-containers\` to remove the Docker containers that crashed dev sessions of this project left behind; add \`--all\` for every project on this machine.`,
    args: {
      ...universalArgs,
      ...configDependentArgs,
      stage: stage.optional(),
      agentPort: devStopAgentPort.optional(),
      cleanupContainers: cleanupContainers.optional(),
      all: allDevContainers.optional()
    },
    requiredArgs: [] as const
  },

  'dev:network': {
    description: `Shows the dev network of an AWS account and region.

The first \`stacktape dev\` that needs it creates one dev network per account and region: a VPC with a small EC2 instance, the dev box. Deployed dev functions reach the databases on your machine through the box, and VPC functions get internet access through it. The command shows whether the box runs, which \`stacktape dev\` session runs each stage (its user, host and project directory, and since when), which dev functions use the network, and which stages hold relay ports.`,
    args: {
      ...universalArgs,
      ...stackArgs
    },
    requiredArgs: ['region'] as const
  },

  'dev:network:delete': {
    description: `Deletes the dev network of an AWS account and region.

Delete the dev stages that use it first (\`stacktape delete --stage <stage>\`); the command refuses while dev functions still run in the network. It also refuses while a \`stacktape dev\` session uses the network, or while a session creates or updates it; \`--force\` deletes it despite live sessions. The next \`stacktape dev\` that needs a dev network creates it again.

The command asks for confirmation. With \`--json\` or outside a terminal it cannot ask, so pass \`--yes\`.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      autoConfirmOperation: autoConfirmOperation.optional(),
      force: forceDevNetworkDelete.optional()
    },
    requiredArgs: ['region'] as const
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
      recoverOperation: recoverOperation.optional(),
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

  synth: {
    description: `Compiles your Stacktape configuration into a CloudFormation template.

By default, the template is saved to \`./compiled-template.yaml\`. Use the \`--out\` option to specify a different path.`,
    args: {
      ...localUniversalArgs,
      ...stackArgs,
      ...localConfigDependentArgs,
      outFile: outFile.optional(),
      preserveTempFiles: preserveTempFiles.optional()
    },
    requiredArgs: ['stage', 'region'] as const
  },

  validate: {
    description: `Validates your Stacktape project without writing deployment artifacts.

By default, this command loads and validates the configuration, resolves resources, and synthesizes the CloudFormation template in memory. Use \`--with-package\` to also validate workload packaging, and \`--thorough\` to also validate workload packaging and ask AWS CloudFormation to validate the synthesized template. A template over 51,200 bytes is validated from a temporary object in the stack's deployment bucket. Before the first deploy there is no such bucket: the result then reports checked.cloudformation false with a warning. Use \`--out\` to write the successfully validated template. It also prints security findings, rated for a production or non-production stage (\`stackConfig.stageType\`, or the stage name when it is not set), and lists what to fix before production. Like \`deploy\` and \`dev\`, it accepts \`--aws-account\` to use the credentials of an AWS account connected in the Stacktape Console.`,
    args: {
      ...localUniversalArgs,
      ...stackArgs,
      ...localConfigDependentArgs,
      awsAccount: awsAccount.optional(),
      withPackage: withPackage.optional(),
      thorough: thorough.optional(),
      outFile: outFile.optional()
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

  'secret:set': {
    description: `Creates a secret that is securely stored in AWS Secrets Manager.

This secret can then be referenced in your configuration using the \`$Secret('secret-name')\` directive. This is useful for storing sensitive data like passwords, API keys, or other credentials.

In agent mode, use --secret-name with either --value or --file. Use --force-update to update existing secrets without prompting.`,
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

In agent mode, use --secret-name to specify the secret.`,
    args: {
      ...universalArgs,
      region: awsRegion.optional(),
      secretName: secretName.optional()
    },
    requiredArgs: ['region'] as const
  },

  'secret:delete': {
    description: `Deletes a specified secret.

In agent mode, use --secret-name to specify the secret to delete.`,
    args: {
      ...universalArgs,
      region: awsRegion.optional(),
      secretName: secretName.optional()
    },
    requiredArgs: ['region'] as const
  },

  rollback: {
    description: `Rolls back the stack to a previous deployment version.

Downloads the CloudFormation template from a previous version and deploys it. Artifacts (Lambda zips, container images) from that version are reused — no rebuild is required.

Use \`--list-versions\` to see available versions. Specify a target with \`--target-version v000003\` or \`--rollback-steps N\` (default: 1).

For recovering from \`UPDATE_FAILED\` state, use \`stack recover\` instead.`,
    args: {
      recoverOperation: recoverOperation.optional(),
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      targetVersion: rollbackVersion.optional(),
      rollbackSteps: rollbackSteps.optional(),
      listVersions: listVersions.optional()
    },
    requiredArgs: ['region'] as const
  },

  'cf:rollback': {
    description: `Rolls back the CloudFormation stack to the last known good state.

This is useful if a stack update fails and leaves the stack in an \`UPDATE_FAILED\` or \`UPDATE_ROLLBACK_FAILED\` state. This uses CloudFormation's native rollback mechanism.

For rolling back to a specific previous deployment version, use \`rollback\` instead.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      resourcesToSkip: resourcesToSkip.optional()
    },
    requiredArgs: ['region'] as const
  },

  package: {
    description: `Packages your compute resources and prepares them for deployment.

This is useful for inspecting the packaged artifacts before deploying.`,
    args: {
      ...localUniversalArgs,
      ...stackArgs,
      ...localConfigDependentArgs,
      onlyWorkloads: onlyWorkloads.optional()
    },
    requiredArgs: ['stage', 'region'] as const
  },

  diff: {
    description: `Shows a preview of the changes that will be made to your stack if you deploy the current configuration.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      preserveTempFiles: preserveTempFiles.optional()
    },
    requiredArgs: ['stage', 'region'] as const
  },

  logs: {
    description: `Fetch and analyze logs from a deployed resource.

Supports two modes:
- **Standard**: Fetches recent log events with optional filtering
- **Insights**: Runs CloudWatch Logs Insights query with --query flag

Examples:
  stacktape logs --stage prod --resource-name myLambda --since "1h"
  stacktape logs --stage prod --resource-name myLambda --query "fields @timestamp, @message | filter @message like /ERROR/"`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      resourceName: resourceName.optional(),
      container: container.optional(),
      startTime: startTime.optional(),
      endTime: endTime.optional(),
      filter: filter.optional(),
      raw: raw.optional(),
      follow: follow.optional(),
      query: logsQuery.optional(),
      limit: limit.optional()
    },
    requiredArgs: ['stage', 'region', 'resourceName'] as const
  },

  alarms: {
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

  metrics: {
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
      startTime: startTime.optional(),
      endTime: endTime.optional()
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
- **Starter project:** Use \`--starter-project\` or \`--starter-id\` to initialize from a pre-configured template.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional(),
      starterId: starterId.optional(),
      starterProject: starterProject.optional(),
      projectDirectory: projectDirectory.optional(),
      initializeProjectTo: initializeProjectTo.optional(),
      configFormat: configFormat.optional(),
      headless: headless.optional(),
      noBrowser: noBrowser.optional(),
      codingAgent: codingAgent.optional(),
      infrastructureType: infrastructureType.optional(),
      awsAccount: awsAccount.optional()
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

Your stack must include a \`bastion\` resource. If you have multiple bastions, you can specify which one to connect to with the \`--bastion-resource\` argument. The session is established over a secure SSM connection.

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

Your stack must include a \`bastion\` resource. This is useful for accessing resources in a private VPC. If you have multiple bastions, you can specify one with the \`--bastion-resource\` argument. The command will print the tunneled endpoints to the terminal.

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

  'container:exec': {
    description: `Execute a command in a running container and return the output.

Runs a command inside a deployed container workload (web-service, private-service, worker-service, or multi-container-workload) using ECS Exec. The command output is captured and returned as JSON.

Use --task-arn to specify which task to connect to when multiple instances are running (defaults to first available). Use --container to specify which container for multi-container workloads.

Examples:
  stacktape container exec --stage prod --resource-name myService --command "ls -la"
  stacktape container exec --stage prod --resource-name myService --command "cat /app/config.json"
  stacktape container exec --stage prod --resource-name myService --task-arn abc123 --command "env"`,
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

  'query:sql': {
    description: `Execute read-only SQL queries against a deployed relational database.

Use this first when you need to check a row, run a SELECT, or inspect a production PostgreSQL/MySQL database from the command line. Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN) are allowed.

If the database is VPC-only, use --bastion-resource to tunnel through a bastion host for the duration of the query. Use bastion tunnel only when you need a persistent tunnel for a local database client.

Examples:
  stacktape query sql --stage prod --resource-name myDatabase --sql "SELECT * FROM users LIMIT 10"
  stacktape query sql --stage prod --resource-name myDatabase --bastion-resource myBastion --sql "SHOW TABLES"`,
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

  'aws:call': {
    description: `Execute read-only AWS SDK commands against deployed resources.

Provides direct access to AWS SDK v3 for inspecting deployed resources. Each supported service has an explicit list of operations reviewed as read-only for that service, and everything outside it is rejected — including operations that only look like reads, such as Step Functions \`GetActivityTask\` (it claims a task and starts its timeout) and SQS \`ReceiveMessage\` (it hides messages from the real consumer). The Secrets Manager and SSM value reads (\`GetSecretValue\`, \`GetParameter*\`) are rejected too; their metadata operations are accepted. Lambda and ECS environment variable values come back redacted, while other reads, such as log events and S3 objects, return application data as it is. Logs Insights \`StartQuery\` starts a query that AWS charges for. A rejection names the operations the service does accept. Coverage is deliberately partial: a genuinely read-only operation that is missing has not been reviewed yet.

The call runs with the deployed stack's read-only debug role; when the stack has no such role or it cannot be assumed, the command fails instead of using your own AWS credentials. A stack whose first deploy failed before it had outputs accepts only CloudFormation reads of that stack.

Examples:
  stacktape aws call --stage prod --service lambda --command ListFunctions
  stacktape aws call --stage prod --service dynamodb --command Scan --input '{"TableName": "my-table", "Limit": 10}'
  stacktape aws call --stage prod --service logs --command FilterLogEvents --input '{"logGroupName": "/aws/lambda/my-func"}'`,
    args: {
      ...universalArgs,
      ...stackArgs,
      service: sdkService.optional(),
      command: sdkCommand.optional(),
      input: sdkInput.optional()
    },
    requiredArgs: ['region', 'service', 'command'] as const
  },

  'query:dynamodb': {
    description: `Query a deployed DynamoDB table.

Supports operations: scan, query, get, schema, sample. All operations are read-only.

Examples:
  stacktape query dynamodb --stage prod --resource-name myTable --operation sample
  stacktape query dynamodb --stage prod --resource-name myTable --operation schema
  stacktape query dynamodb --stage prod --resource-name myTable --operation scan --limit 50
  stacktape query dynamodb --stage prod --resource-name myTable --operation query --pk '{"userId": "123"}'
  stacktape query dynamodb --stage prod --resource-name myTable --operation get --pk '{"userId": "123"}' --sk '{"timestamp": 1234}'`,
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

  'query:redis': {
    description: `Query a deployed Redis cluster.

Supports operations: keys, get, ttl, info, type. All operations are read-only.

If the Redis cluster is VPC-only, use --bastion-resource to tunnel through a bastion host.

Examples:
  stacktape query redis --stage prod --resource-name myRedis --operation info
  stacktape query redis --stage prod --resource-name myRedis --operation keys --pattern "user:*"
  stacktape query redis --stage prod --resource-name myRedis --operation get --key "session:abc123"
  stacktape query redis --stage prod --resource-name myRedis --bastion-resource myBastion --operation info`,
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

  'query:opensearch': {
    description: `Query a deployed OpenSearch domain.

Supports operations: search, get, indices, mapping, count. All operations are read-only.

Examples:
  stacktape query opensearch --stage prod --resource-name mySearch --operation indices
  stacktape query opensearch --stage prod --resource-name mySearch --operation mapping --index users
  stacktape query opensearch --stage prod --resource-name mySearch --operation count --index users
  stacktape query opensearch --stage prod --resource-name mySearch --operation get --index users --id doc123
  stacktape query opensearch --stage prod --resource-name mySearch --operation search --query '{"match_all": {}}'`,
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
    args: {
      agent: agent.optional(),
      key: command
        .optional()
        .describe(
          'Default setting to update: region, stage, profile, project, aws-account, api-key, executable-python or executable-javascript.'
        ),
      value: command.optional().describe('New value for the selected default setting.')
    },
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
      showSensitiveValues: showSensitiveValues.optional(),
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

To install a specific version instead, pass it as an argument, for example \`stacktape upgrade 4.0.1\`.`,
    args: {
      newVersion: newVersion.optional()
    },
    requiredArgs: [] as const
  },

  login: {
    description: `Authenticates this system with Stacktape.

In a local terminal, this prints a sign-in address and a code, and opens the address in your browser. Sign in to the Stacktape Console there with any sign-in method, check that it shows the same code, and approve. Over SSH or without a browser, open the address on any device. The CLI then stores the CLI login session for subsequent commands in the operating system's credential store, or in a file only you can read where no credential store is available. In CI, configure a dedicated Stacktape API key as a masked secret such as \`STACKTAPE_API_KEY\`; do not paste API keys into chat transcripts or command logs. Manual API keys are bearer secrets and are shown only once when created.`,
    args: {
      ...universalArgs,
      apiKey: apiKey.optional(),
      noBrowser: noBrowser.optional()
    },
    requiredArgs: [] as const
  },

  logout: {
    description: `Signs this system out of Stacktape.

Revokes the CLI login session on the Stacktape API and removes it from this system. When the API cannot be reached, the session is still removed from this system but stays valid until it expires or is revoked in the Stacktape Console. An API key created in the Console is only removed from this system.`,
    args: {
      ...universalArgs,
      apiKey: apiKey.optional()
    },
    requiredArgs: [] as const
  },

  'org:create': {
    description: `Creates a new organization in your Stacktape account.

In interactive mode, you'll be prompted for the organization name. In agent mode, provide --organization-name.

The command returns new organization credentials scoped to the created organization. Treat any returned key material as sensitive and store it outside chat transcripts or logs.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional(),
      organizationName: organizationName.optional()
    },
    requiredArgs: [] as const
  },

  'org:list': {
    description: `Lists organizations accessible with your current Stacktape user.

Shows organization name, role, number of connected AWS accounts, and whether it's the current organization for your authenticated CLI context.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional()
    },
    requiredArgs: [] as const
  },

  'org:delete': {
    description: `Deletes the organization of your API key.

In interactive mode, you'll confirm the deletion. In agent mode, provide --organization-id with the ID of that organization.

This operation is allowed only for organization OWNER and only when there are no other non-service users and no active connected AWS accounts. To delete another organization, log in with an API key of that organization first.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional(),
      organizationId: organizationId.optional()
    },
    requiredArgs: [] as const
  },

  'project:create': {
    description: `Creates a new project in the current organization.

If you omit --project in interactive mode, you'll be prompted for it. In agent mode, provide --project.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional(),
      projectName: projectName.optional(),
      region: awsRegion.optional()
    },
    requiredArgs: [] as const
  },

  'project:list': {
    description: `Lists all projects in your organization with their deployed stages, status, and costs.

Shows each project with its stages, deployment status (in-progress, errored, etc.), and current/previous month costs. Useful for getting an overview of your deployments.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional()
    },
    requiredArgs: [] as const
  },

  'alarms:export': {
    description: `Exports Console-defined alarm rules as stack-config alarm entries.

Console alarm creation is retired in favor of config-defined alarms. This prints every alarm rule
still defined in your organization's Console as a ready-to-paste config fragment, with a note on
which projects and stages it currently applies to.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional()
    },
    requiredArgs: [] as const
  },

  'ai:connect': {
    description: `Connects your own AI subscription to Stacktape for the hosted AI incident runs (Investigate with AI, Fix with AI) you request.

Asks which provider to connect (or takes \`--ai-provider\`) and explains what will happen before anything runs. Each provider comes with its coding agent, whose CLI must be installed:

- **Claude** (Claude Code): runs \`claude setup-token\`, signs you in through your browser and stores the long-lived token it prints.
- **Codex** (ChatGPT plan): uses the ChatGPT sign-in of your Codex CLI, running \`codex login\` first when needed, and stores the tokens Codex keeps in \`~/.codex/auth.json\`. An OpenAI API key is not a subscription and is never read.
- **Grok** (Grok sign-in): uses the sign-in of your Grok CLI, running \`grok login\` first when needed (with a device code where no browser can open), and stores the sign-in Grok keeps in \`~/.grok/auth.json\`, without your name, email or picture.
- **OpenCode**: uses what your OpenCode CLI is signed in to, running \`opencode auth login\` first when it has nothing, and stores \`~/.local/share/opencode/auth.json\`.

Only runs you request use it; remove it with \`stacktape ai disconnect\`. A run may refresh a sign-in; if the provider then replaces its refresh token, connect it again. Outside a terminal, pass \`--ai-provider\`; only a sign-in that is already there can be connected then. Alternatively, an Admin or Owner can connect the organization's Anthropic, OpenAI or xAI API key in the Console.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional(),
      aiProvider: aiProvider.optional()
    },
    requiredArgs: [] as const
  },
  'ai:disconnect': {
    description: `Removes your own AI subscription with one provider from Stacktape. Asks which provider to disconnect (or takes \`--ai-provider\`). Hosted AI incident runs you request can no longer be funded by that subscription until you connect it again with \`stacktape ai connect\`. The sign-in on your own machine stays as it is.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional(),
      aiProvider: aiProvider.optional()
    },
    requiredArgs: [] as const
  },
  'info:whoami': {
    description: `Displays information about the current user, organization, connected AWS accounts, and accessible projects.

Use this command to verify your local Stacktape CLI authentication state and see what resources you have access to.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional()
    },
    requiredArgs: [] as const
  },

  'info:operations': {
    description: `Lists recent recorded Stacktape operations with their status.

Shows operation history including success/failure status, timestamps, and error descriptions for failed operations. Filter by project, stage, or the current authenticated user to narrow results.`,
    args: {
      logLevel: logLevel.optional(),
      projectName: projectName.optional(),
      stage: stage.optional(),
      currentUserOnly: currentUserOnly.optional(),
      limit: limit.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional()
    },
    requiredArgs: [] as const
  },

  'info:stack': {
    description: `Displays detailed information about a deployed stack including outputs and resources.

Returns stack outputs (URLs, endpoints, resource identifiers) and the list of AWS resources in the stack. Useful for discovering endpoints after deployment.

You can identify the stack in two ways:
- Using --stack-name directly (e.g., --stack-name my-project-prod)
- Using --project and --stage (e.g., --project my-project --stage prod)`,
    args: {
      logLevel: logLevel.optional(),
      stackName: stackName.optional(),
      projectName: projectName.optional(),
      stage: stage.optional(),
      region: awsRegion.optional(),
      awsAccount: awsAccount.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional()
    },
    requiredArgs: ['region'] as const
  },

  mcp: {
    description: `Starts the local Stacktape MCP (Model Context Protocol) server for coding agents.

Coding agents start it themselves over stdio after \`stacktape mcp add\` set them up; you do not run it by hand. It serves both the 2026-07-28 protocol and the earlier 2025 revisions, and exposes five tools: \`stacktape_incident\` to start an incident investigation, \`stacktape_docs\` for documentation search, \`stacktape_project\` for project scanning, \`stacktape_cli\` to plan and run CLI commands, and \`stacktape_dev\` for dev mode.`,
    args: {
      logLevel: logLevel.optional()
    },
    requiredArgs: [] as const
  },

  'mcp:add': {
    description: `Connects your coding agents to Stacktape: Claude Code, Codex, Cursor, VS Code (GitHub Copilot), GitHub Copilot CLI, Windsurf and OpenCode.

For each agent you pick, it adds the Stacktape MCP server at user level (Claude Code and Codex through their own \`mcp add\` commands, the others by editing their config file in place, with a backup), then starts the server once to check that it works. In a terminal it asks which agents to set up, with the ones found on this machine preselected; \`--coding-agents\` skips the question. Safe to run again, for example after moving the CLI.`,
    args: {
      logLevel: logLevel.optional(),
      autoConfirmOperation: autoConfirmOperation.optional(),
      codingAgents: codingAgents.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional()
    },
    requiredArgs: [] as const
  },

  'mcp:remove': {
    description: `Removes the user-level Stacktape MCP server entry that \`stacktape mcp add\` added to your coding agents.

Project-level entries (such as a committed \`.mcp.json\`) are shared with your team, so they are listed but not changed.`,
    args: {
      logLevel: logLevel.optional(),
      autoConfirmOperation: autoConfirmOperation.optional(),
      codingAgents: codingAgents.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional()
    },
    requiredArgs: [] as const
  },
  incidents: {
    description: `Lists incidents — everything that needs (or needed) a reaction: downtime, failing synthetics, firing alarms, production errors, unhealthy stacks, expiring certificates.

Shows status, severity, title, stack, and each incident's signals. Filter by status, project, or stage. The default view is ACTIVE (open + acknowledged).`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional(),
      projectName: projectName.optional(),
      stage: stage.optional(),
      incidentStatus: incidentStatus.optional(),
      limit: limit.optional()
    },
    requiredArgs: [] as const
  },
  'incidents:show': {
    description: `Prints an incident's handoff: a self-contained markdown document with the incident's state, signals, evidence, release context, timeline, related earlier incidents and AI assessment, and guidance for diagnosing it and watching its recovery read-only.

Pipe it to a coding agent (or read it yourself) to find the likely cause and a recommended next action. The handoff asks for a diagnosis; it never instructs anyone to deploy or resolve.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional(),
      incidentId
    },
    requiredArgs: ['incidentId'] as const
  },
  'incidents:watch': {
    description: `Waits for an incident to recover and stay recovered.

The command succeeds only after the incident remains RESOLVED for the stability window. If the incident reopens, the window resets. This is intended for deployment verification and coding-agent workflows.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional(),
      incidentId,
      incidentWatchTimeoutSeconds: incidentWatchTimeoutSeconds.optional(),
      incidentWatchStabilitySeconds: incidentWatchStabilitySeconds.optional()
    },
    requiredArgs: ['incidentId'] as const
  },
  'incidents:ack': {
    description: `Acknowledges an incident: "someone is on it". The same signal getting worse stops re-paging; a NEW signal joining still notifies.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional(),
      incidentId
    },
    requiredArgs: ['incidentId'] as const
  },
  'incidents:resolve': {
    description: `Resolves an incident manually. Use after you deployed and verified a fix for signals that cannot observe recovery on their own (production error groups). A recurring signal reopens the incident automatically.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional(),
      incidentId
    },
    requiredArgs: ['incidentId'] as const
  },
  'errors:list': {
    description: `Lists detected runtime errors across your deployed functions and containers.

Shows error message, type, function name, project/stage, occurrence count, and status. Filter by status, project, or stage.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional(),
      projectName: projectName.optional(),
      stage: stage.optional(),
      issueStatus: issueStatus.optional(),
      limit: limit.optional()
    },
    requiredArgs: [] as const
  },
  'errors:resolve': {
    description: `Marks an issue as resolved. The issue will reopen automatically if the same error occurs again.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional(),
      issueId
    },
    requiredArgs: ['issueId'] as const
  },
  'errors:ignore': {
    description: `Marks an issue as ignored. Ignored issues will not reopen on new occurrences and won't generate alerts.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional(),
      issueId
    },
    requiredArgs: ['issueId'] as const
  },
  'errors:reopen': {
    description: `Reopens a resolved or ignored issue, setting its status back to OPEN.`,
    args: {
      logLevel: logLevel.optional(),
      agent: agent.optional(),
      outputFormat: outputFormat.optional(),
      issueId
    },
    requiredArgs: ['issueId'] as const
  }
} as const;

// ============ Derived Types ============

type CommandDefinitions = typeof commandDefinitions;
export type StacktapeCommand = keyof CommandDefinitions;

// ============ Command Arrays ============

export const cliCommands = Object.keys(commandDefinitions) as StacktapeCommand[];

// Commands that don't show announcements
export const commandsWithDisabledAnnouncements: StacktapeCommand[] = [
  'dev',
  'mcp',
  'mcp:add',
  'mcp:remove',
  'version',
  'help',
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
  'mcp',
  'mcp:add',
  'mcp:remove',
  'version',
  'help',
  'defaults:list',
  'defaults:configure',
  'aws-profile:list',
  'aws-profile:create',
  'aws-profile:update',
  'aws-profile:delete',
  // Stops a local dev agent and removes local containers; it never calls the Stacktape API.
  'dev:stop',
  'upgrade',
  'init',
  'package',
  'synth',
  'validate'
];
