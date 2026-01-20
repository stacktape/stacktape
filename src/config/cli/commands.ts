import {
  apiKey,
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
  detailed,
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
  initializeProjectTo,
  invalidateCdnCache,
  localTunnelingPort,
  logFormat,
  logLevel,
  newVersion,
  noCache,
  noTunnel,
  outFile,
  outFormat,
  paramName,
  preserveTempFiles,
  projectDirectory,
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
  starterId,
  startTime,
  templateId,
  universalArgs,
  watch
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
- Hot-reload: press number keys to rebuild individual workloads, or \`a\` to rebuild all.
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
      devMode: devMode.optional()
    },
    requiredArgs: ['region', 'stage'] as const
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
      logLevel: logLevel.optional(),
      logFormat: logFormat.optional()
    },
    requiredArgs: [] as const
  },

  'aws-profile:update': {
    description: `Updates an existing AWS profile on your system.

You will be prompted to enter the profile name and the new credentials.`,
    args: {
      logLevel: logLevel.optional(),
      logFormat: logFormat.optional()
    },
    requiredArgs: [] as const
  },

  'aws-profile:delete': {
    description: `Deletes an AWS profile from your system.

You will be prompted to enter the name of the profile to delete.`,
    args: {
      logLevel: logLevel.optional(),
      logFormat: logFormat.optional()
    },
    requiredArgs: [] as const
  },

  'aws-profile:list': {
    description: `Lists all AWS profiles configured on your system.`,
    args: {
      logLevel: logLevel.optional(),
      logFormat: logFormat.optional()
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

This secret can then be referenced in your configuration using the \`$Secret('secret-name')\` directive. This is useful for storing sensitive data like passwords, API keys, or other credentials.`,
    args: {
      ...universalArgs,
      region: awsRegion.optional()
    },
    requiredArgs: ['region'] as const
  },

  'secret:get': {
    description: `Prints details about a specified secret to the console.`,
    args: {
      ...universalArgs,
      region: awsRegion.optional()
    },
    requiredArgs: ['region'] as const
  },

  'secret:delete': {
    description: `Deletes a specified secret.`,
    args: {
      ...universalArgs,
      region: awsRegion.optional()
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

  logs: {
    description: `Prints logs from a specified resource to the console.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      ...configDependentArgs,
      resourceName: resourceName.optional(),
      startTime: startTime.optional(),
      filter: filter.optional(),
      raw: raw.optional()
    },
    requiredArgs: ['stage', 'region', 'resourceName'] as const
  },

  init: {
    description: `Initializes a new Stacktape project in a specified directory.`,
    args: {
      logLevel: logLevel.optional(),
      logFormat: logFormat.optional(),
      starterId: starterId.optional(),
      projectDirectory: projectDirectory.optional(),
      templateId: templateId.optional(),
      initializeProjectTo: initializeProjectTo.optional(),
      configFormat: configFormat.optional()
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

  'stack:info': {
    description: `Prints information about a specified stack.

You can get information in two formats:
- **Simple (default):** Prints helpful links and parameters for the deployed stack to the terminal.
- **Detailed (\`--detailed\` flag):** Saves detailed information about the stack to a file (default: \`stack-info.yaml\`). You can customize the output file and format with the \`--outFile\` and \`--outFormat\` options.

In **detailed** mode:
- If the stack is deployed, you'll get an overview of the deployed resources.
- If you also provide a configuration file, the output will show a diff between the deployed resources and the configuration, indicating which resources will be created, updated, or deleted on the next deployment.
- If the stack is not deployed, it will show an overview of the resources that will be created.

By default, sensitive values are omitted. To include them, use the \`--showSensitiveValues\` flag.`,
    args: {
      ...universalArgs,
      ...stackArgs,
      configPath: configPath.optional(),
      detailed: detailed.optional(),
      outFile: outFile.optional(),
      outFormat: outFormat.optional(),
      showSensitiveValues: showSensitiveValues.optional()
    },
    requiredArgs: ['region'] as const
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

  'stack:list': {
    description: `Lists all stacks deployed in a specified region.`,
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
  }
} as const;

// ============ Derived Types ============

export type CommandDefinitions = typeof commandDefinitions;
export type StacktapeCommand = keyof CommandDefinitions;

// ============ Command Arrays ============

export const cliCommands = Object.keys(commandDefinitions) as StacktapeCommand[];

// Commands that don't show announcements
export const commandsWithDisabledAnnouncements: StacktapeCommand[] = ['dev', 'version', 'upgrade'];

// Commands that don't require API key
export const commandsNotRequiringApiKey: StacktapeCommand[] = [
  'login',
  'logout',
  'version',
  'help',
  'defaults:list',
  'defaults:configure',
  'upgrade'
];
