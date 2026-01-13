type StacktapeCommand = (typeof import('../src/config/cli'))['allCommands'][number];
type StacktapeCliCommand = (typeof import('../src/config/cli'))['cliCommands'][number];
type StacktapeSdkCommand = (typeof import('../src/config/cli'))['sdkCommands'][number];

type StacktapeCliArg = keyof StacktapeCliArgs;
type StacktapeSdkArg = keyof StacktapeSdkArgs;
type StacktapeArgs = StacktapeCliArgs | StacktapeSdkArgs;
type StacktapeArg = keyof StacktapeArgs;

type LogFormat = 'fancy' | 'normal' | 'basic' | 'json';
type LogLevel = 'info' | 'debug' | 'error';
type TokenType = 'idToken' | 'refreshToken' | 'accessToken';
type ResourceLogsType = 'access' | 'process';

type AllStacktapeCommands = {
  /**
   * Deploys your stack to AWS.
   *
   * If the stack doesn't exist, it creates a new one. If it already exists, it updates it. This command requires a valid Stacktape configuration file (`stacktape.yml`) in the current directory, or you can specify a path using the `--configPath` option.
   */
  deploy;
  /**
   * Deploys your stack to AWS using AWS CodeBuild.
   *
   * This command offloads the deployment process to a dedicated environment within your AWS account, which is useful for resource-intensive projects.
   *
   * Here's how it works:
   * 1. Your project is zipped and uploaded to an S3 bucket in your account.
   * 2. A CodeBuild environment (a dedicated VM) is provisioned.
   * 3. The deployment begins, and logs are streamed to your terminal in real-time.
   *
   * Like the `deploy` command, this requires a `stacktape.yml` file.
   */
  'codebuild:deploy';
  /**
   * Runs a deployment script defined in your configuration.
   *
   * This command only updates the script's source code. To update environment variables or other configurations, use the `deploy` command.
   */
  'deployment-script:run';
  /**
   * Deletes your stack from AWS.
   *
   * This action is irreversible and will permanently remove all resources in the stack. Be sure to back up any data you want to keep. If you don't provide a configuration file, `beforeDelete` hooks will not be executed.
   */
  delete;
  /**
   * Displays help information for commands and their options.
   */
  help;
  /**
   * Runs a resource in development mode, enabling local development and debugging.
   *
   * #### For container workloads:
   * - Maps all container ports specified in the `events` section to your local machine.
   * - Injects environment variables from `$ResourceParam` and `$Secret` directives into the container.
   * - Injects temporary AWS credentials, giving your local container the same IAM permissions as the deployed version.
   * - Requires a deployed stack for emulation. Use `--disableEmulation` to run a workload that has not yet been deployed.
   * - Streams container logs to the console.
   * - You must specify which container to run using the `--container` option.
   *
   * #### For Lambda functions:
   * - Quickly redeploys the function without using CloudFormation.
   * - Streams logs from CloudWatch to your console.
   * - The function runs in the same AWS environment as in production.
   *
   * In development mode, the resource will automatically restart or redeploy when you type `rs` and press Enter in the terminal. If you use the `--watch` flag, it will also trigger on any source file change.
   */
  dev;
  /**
   * Prints the current version of Stacktape.
   */
  version;
  /**
   * Compiles your Stacktape configuration into a CloudFormation template.
   *
   * By default, the template is saved to `./compiled-template.yaml`. Use the `--outFile` option to specify a different path.
   */
  'compile-template';
  /**
   * Creates a new AWS profile on your system.
   *
   * You will be prompted to enter a profile name, AWS Access Key ID, and AWS Secret Access Key. The credentials are stored in the default AWS location in your home directory and can be used by other AWS tools.
   */
  'aws-profile:create';
  /**
   * Updates an existing AWS profile on your system.
   *
   * You will be prompted to enter the profile name and the new credentials.
   */
  'aws-profile:update';
  /**
   * Deletes an AWS profile from your system.
   *
   * You will be prompted to enter the name of the profile to delete.
   */
  'aws-profile:delete';
  /**
   * Lists all AWS profiles configured on your system.
   */
  'aws-profile:list';
  /**
   * Adds a domain to your AWS account.
   *
   * Once added, the domain and its subdomains can be used with various resources, such as Web Services, Hosting Buckets, and API Gateways. Before adding a domain, please review the [Domains and Certificates documentation](https://docs.stacktape.com/other-resources/domains-and-certificates/#adding-domain).
   */
  'domain:add';
  /**
   * Updates AWS CloudFormation infrastructure module private types to the latest compatible version.
   *
   * AWS CloudFormation infrastructure modules are used to integrate third-party services into your stack. If a third-party API changes, use this command to update the modules in your account to the latest version.
   */
  'cf-module:update';
  /**
   * Creates a secret that is securely stored in AWS Secrets Manager.
   *
   * This secret can then be referenced in your configuration using the `$Secret('secret-name')` directive. This is useful for storing sensitive data like passwords, API keys, or other credentials.
   */
  'secret:create';
  /**
   * Prints details about a specified secret to the console.
   */
  'secret:get';
  /**
   * Deletes a specified secret.
   */
  'secret:delete';
  /**
   * Rolls back the stack to the last known good state.
   *
   * This is useful if a stack update fails and leaves the stack in an `UPDATE_FAILED` state.
   */
  rollback;
  /**
   * Packages your compute resources and prepares them for deployment.
   *
   * This is useful for inspecting the packaged artifacts before deploying.
   */
  'package-workloads';
  /**
   * Shows a preview of the changes that will be made to your stack if you deploy the current configuration.
   */
  'preview-changes';
  /**
   * Prints logs from a specified resource to the console.
   */
  logs;
  /**
   * Initializes a new Stacktape project in a specified directory.
   */
  init;
  /**
   * Synchronizes the contents of a local directory with an S3 bucket.
   *
   * You can specify the bucket in two ways:
   * - **Using Stacktape configuration:** Provide the `stage` and `resourceName`. Stacktape will identify the bucket from the deployed stack and sync the directory specified in the configuration file.
   * - **Using bucket ID:** Provide a valid `bucketId` (AWS physical resource ID or bucket name) and a `sourcePath`.
   *
   * Files in the bucket that are not present in the source directory will be removed.
   */
  'bucket:sync';
  /**
   * Starts an interactive session with a bastion host.
   *
   * Your stack must include a `bastion` resource. If you have multiple bastions, you can specify which one to connect to with the `--bastionResource` argument. The session is established over a secure SSM connection.
   *
   * For more information, refer to the [bastion documentation](https://docs.stacktape.com/bastion-servers/#connecting-to-bastion-interactive-session).
   */
  'bastion:session';
  /**
   * Starts an interactive session inside a deployed container.
   *
   * The session is established using ECS Exec and a secure SSM connection. If your service has multiple containers, you can choose which one to connect to. This is useful for debugging and inspecting running containers.
   *
   * For more information, refer to the [container session documentation](https://docs.stacktape.com/bastion-servers/#connecting-to-bastion-interactive-session).
   */
  'container:session';
  /**
   * Creates a secure tunnel to a resource through a bastion host.
   *
   * Your stack must include a `bastion` resource. This is useful for accessing resources in a private VPC. If you have multiple bastions, you can specify one with the `--bastionResource` argument. The command will print the tunneled endpoints to the terminal.
   *
   * For more information, refer to the [bastion tunnel documentation](https://docs.stacktape.com/bastion-servers/#creating-bastion-tunnel).
   */
  'bastion:tunnel';
  /**
   * Sets system-wide default arguments for Stacktape commands.
   *
   * You can set defaults for:
   * - `region`
   * - `stage`
   * - `awsProfile`
   * - `projectName`
   * - `awsAccount`
   *
   * You can also configure default executables for resolving Node.js directives.
   */
  'defaults:configure';
  /**
   * Prints all configured system-wide Stacktape defaults.
   */
  'defaults:list';
  /**
   * Executes a script defined in your configuration.
   *
   * You can pass environment variables to the script using the `--env` option (e.g., `--env MY_VAR=my_value`).
   *
   * To learn more, refer to the [scripts documentation](https://docs.stacktape.com/configuration/scripts/).
   */
  'script:run';
  /**
   * Prints information about a specified stack.
   *
   * You can get information in two formats:
   * - **Simple (default):** Prints helpful links and parameters for the deployed stack to the terminal.
   * - **Detailed (`--detailed` flag):** Saves detailed information about the stack to a file (default: `stack-info.yaml`). You can customize the output file and format with the `--outFile` and `--outFormat` options.
   *
   * In **detailed** mode:
   * - If the stack is deployed, you'll get an overview of the deployed resources.
   * - If you also provide a configuration file, the output will show a diff between the deployed resources and the configuration, indicating which resources will be created, updated, or deleted on the next deployment.
   * - If the stack is not deployed, it will show an overview of the resources that will be created.
   *
   * By default, sensitive values are omitted. To include them, use the `--showSensitiveValues` flag.
   */
  'stack:info';
  /**
   * Retrieves a specified parameter from a resource in a deployed stack.
   */
  'param:get';
  /**
   * Lists all stacks deployed in a specified region.
   */
  'stack:list';
  /**
   * Upgrades Stacktape to the latest version.
   *
   * You can also specify a version to install using the `--version` option.
   */
  upgrade;
  /**
   * Configures your Stacktape API key for the current system.
   *
   * All subsequent operations will be associated with the user and organization linked to this API key. You can get your API key from the [Stacktape console](https://console.stacktape.com/api-keys). You can provide the key with the `--apiKey` option or enter it interactively.
   */
  login;
  /**
   * Removes the Stacktape API key from the current system.
   */
  logout;
};

interface StacktapeCliArgs {
  /**
   * #### Show Help
   *
   * ---
   *
   * If provided, the command will not execute and will instead print help information.
   */
  help?: string;
  /**
   * #### Stage
   *
   * ---
   *
   * The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters.
   */
  stage?: string;
  /**
   * #### Config File Path
   *
   * ---
   *
   * The path to your Stacktape configuration file, relative to the current working directory.
   *
   * @default "stacktape.yml"
   */
  configPath?: string;
  /**
   * #### Disable Emulation
   *
   * ---
   *
   * Disables the automatic injection of parameters and credentials during local emulation. Use this flag if you want to run a compute resource locally that has not yet been deployed.
   *
   * @default false
   */
  disableEmulation?: boolean;
  /**
   * #### AWS Profile
   *
   * ---
   *
   * The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`.
   *
   * @default "default"
   */
  profile?: string;
  /**
   * #### Disable Drift Detection
   *
   * ---
   *
   * Disables detection of manual changes (drift) made to the stack outside of CloudFormation (e.g., via the AWS console or CLI). By default, Stacktape blocks updates to a stack that has drifted.
   *
   * @default false
   */
  disableDriftDetection?: boolean;
  /**
   * #### Preserve Temporary Files
   *
   * ---
   *
   * If `true`, preserves the temporary files generated by the operation, such as the CloudFormation template and packaged resources. These files are saved to `.stacktape/[invocation-id]`.
   *
   * @default false
   */
  preserveTempFiles?: boolean;
  /**
   * #### AWS Region
   *
   * ---
   *
   * The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html).
   */
  region?: AWSRegion;
  /*
   * #### Resource Name
   *
   * ---
   *
   * The name of the resource as defined in your Stacktape configuration.
   */
  resourceName?: string;
  /*
   * #### Bastion Resource Name
   *
   * ---
   *
   * The name of the bastion resource as defined in your Stacktape configuration.
   */
  bastionResource?: string;
  /*
   * #### Parameter Name
   *
   * ---
   *
   * The name of the resource parameter.
   */
  paramName?: string;
  /**
   * #### Container Name
   *
   * ---
   *
   * The name of the container as defined in your container compute resource configuration.
   */
  container?: string;
  /**
   * #### Watch
   *
   * ---
   *
   * If `true`, watches for changes to your source files and automatically re-executes the compute resource when a change is detected.
   *
   * @default false
   */
  watch?: boolean;
  /**
   * #### Command
   *
   * ---
   *
   * This argument has different meanings depending on the command:
   * - With `stacktape help`, it specifies a command to show detailed help for.
   * - With `stacktape container:session`, it specifies a command to run inside the container to start the interactive session.
   */
  command?: string;
  /**
   * #### Port Mapping
   *
   * ---
   *
   * Configures how container ports are mapped to your local machine, in the format `<container-port>:<host-port>`.
   *
   * By default, all ports defined in the `events` section are mapped to the same port on the host. For example, a container with `containerPort: 3000` will be accessible at `http://localhost:3000`.
   *
   * You can override this with `--portMapping 3000:4000`, which would make the container accessible at `http://localhost:4000`. You can specify multiple port mappings.
   */
  portMapping?: string[];
  /**
   * #### Event
   *
   * ---
   *
   * The event to use for the invocation, specified as `{file-path}:{event-name}`.
   */
  event?: string;
  /**
   * #### JSON Event
   *
   * ---
   *
   * The event to use for the invocation, provided as a raw JSON string.
   */
  jsonEvent?: string;
  /**
   * #### Log Format
   *
   * ---
   *
   * The format of logs printed to the console.
   *
   * - `fancy`: Colorized and dynamically re-rendered logs.
   * - `normal`: Colorized but not dynamically re-rendered logs.
   * - `basic`: Simple text only.
   * - `json`: Logs printed as JSON objects.
   *
   * @default "fancy"
   */
  logFormat?: LogFormat;
  /**
   * #### Log Level
   *
   * ---
   *
   * The level of logs to print to the console.
   *
   * - `info`: Basic information about the operation.
   * - `error`: Only errors.
   * - `debug`: Detailed information for debugging.
   *
   * @default "info"
   */
  logLevel?: LogLevel;
  /**
   * #### Start Time
   *
   * ---
   *
   * The start time from which to print logs. This can be any format accepted by the JavaScript `Date` constructor.
   */
  startTime?: number | string;
  /**
   * #### Filter
   *
   * ---
   *
   * A pattern to filter the logs. Only logs matching the pattern will be printed. For more information on filter patterns, see the [AWS documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html).
   */
  filter?: string;
  /**
   * #### Raw
   *
   * ---
   *
   * If `true`, prints logs in raw JSON format instead of pretty-printing them.
   *
   * @default false
   */
  raw?: boolean;
  /**
   * #### Docker Arguments
   *
   * ---
   *
   * Additional arguments to pass to the `docker run` or `docker build` commands.
   */
  dockerArgs?: string[];
  /**
   * #### Source Path
   *
   * ---
   *
   * The path to the directory to synchronize with the bucket. This can be an absolute path or relative to the current working directory.
   */
  sourcePath?: string;
  /**
   * #### Bucket ID
   *
   * ---
   *
   * The identifier of the destination bucket (either the AWS physical resource ID or the bucket name).
   */
  bucketId?: string;
  /**
   * #### Current Working Directory
   *
   * ---
   *
   * The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file.
   */
  currentWorkingDirectory?: string;
  /**
   * #### No Cache
   *
   * ---
   *
   * If `true`, disables the use of cached artifacts and forces a fresh build of compute resources.
   *
   * @default false
   */
  noCache?: boolean;
  /**
   * #### Disable Docker Remote Cache
   *
   * ---
   *
   * Disables Docker layer caching using ECR as remote cache storage.
   * By default, remote caching is enabled to speed up Docker builds by reusing layers.
   * Set to `true` to disable remote caching.
   *
   * @default false
   */
  disableDockerRemoteCache?: boolean;
  /**
   * #### Starter ID
   *
   * ---
   *
   * The identifier of the starter project to initialize.
   */
  starterId?: string;
  /**
   * #### Environment Variables
   *
   * ---
   *
   * A list of environment variables for the script, in the format `name=value`. To add multiple variables, use this option multiple times (e.g., `--env VAR1=val1 --env VAR2=val2`).
   */
  env?: string[];
  /**
   * #### Script Name
   *
   * ---
   *
   * The name of the script to run, which must be defined in the `scripts` section of your configuration.
   */
  scriptName?: string;
  /**
   * #### Detailed
   *
   * ---
   *
   * If `true`, creates a file with detailed stack information. You can specify the output file path with `--outFile` and the format with `--outFormat`.
   *
   * @default false
   */
  detailed?: boolean;
  /**
   * #### Output File
   *
   * ---
   *
   * The path to the file where the operation output will be saved.
   */
  outFile?: string;
  /**
   * #### Output Format
   *
   * ---
   *
   * The format of the output file for stack information.
   *
   * @default "yml"
   */
  outFormat?: 'json' | 'yml';
  /**
   * #### Disable Auto-Rollback
   *
   * ---
   *
   * If `true`, disables automatic rollback on deployment failure.
   *
   * - **With auto-rollback (default):** If a deployment fails, the stack is automatically rolled back to the last known good state.
   * - **Without auto-rollback:** If a deployment fails, the stack remains in the `UPDATE_FAILED` state. You can then either fix the issues and redeploy or manually roll back using the `stacktape rollback` command.
   *
   * @default false
   */
  disableAutoRollback?: boolean;
  /**
   * #### Auto-Confirm Operation
   *
   * ---
   *
   * If `true`, automatically confirms prompts during `deploy` or `delete` operations, skipping the manual confirmation step.
   *
   * @default false
   */
  autoConfirmOperation?: boolean;
  /**
   * #### Show Sensitive Values
   *
   * ---
   *
   * If `true`, includes sensitive values in the output of the `stack:info` and `deploy` commands. Be cautious when using this flag, as mishandling sensitive data can create security risks.
   *
   * @default false
   */
  showSensitiveValues?: boolean;
  /**
   * #### Full History
   *
   * ---
   *
   * If `true`, shows the full history of the stack, including previous versions if it has been deleted. By default, only the history of the current stack is shown.
   *
   * @default false
   */
  fullHistory?: boolean;
  /**
   * #### Invalidate CDN Cache
   *
   * ---
   *
   * If `true`, invalidates the cache of the CDN connected to the bucket.
   *
   * @default false
   */
  invalidateCdnCache?: boolean;
  /**
   * #### Headers Preset
   *
   * ---
   *
   * Configures HTTP headers of uploaded files based on a selected preset.
   *
   * - `static-website`: Caches all content on the CDN but never in the browser. Sets `cache-control` to `public, max-age=0, s-maxage=31536000, must-revalidate`.
   * - `gatsby-static-website`: Optimized for static websites built with [Gatsby](https://www.gatsbyjs.com/), following [Gatsby caching recommendations](https://www.gatsbyjs.com/docs/caching/).
   * - `single-page-app`: Optimized for Single-Page Applications. `index.html` is never cached, while all other assets (JS, CSS, etc.) are cached indefinitely. You should always add a content hash to asset filenames to ensure users get the latest version after a deployment.
   */
  headersPreset?: SupportedHeaderPreset;
  /**
   * #### New Version
   *
   * ---
   *
   * The version of Stacktape to install.
   */
  newVersion?: string;
  /**
   * #### Project Directory
   *
   * ---
   *
   * The root directory where the project configuration should be generated.
   *
   * @default "current-working-directory"
   */
  projectDirectory?: string;
  /**
   * #### Initialize Project To
   *
   * ---
   *
   * The directory where the starter project should be initialized. If the directory is not empty, its contents will be deleted. If not specified, you will be prompted to provide a path.
   *
   * @default "current-working-directory"
   */
  initializeProjectTo?: string;
  /**
   * #### Hotswap
   *
   * ---
   *
   * If `true`, attempts a faster deployment for code-only changes by updating `functions` and `multi-container-workloads` directly, without using CloudFormation. This is recommended only for development stacks. Hotswap will only be used if all stack changes are hot-swappable.
   *
   * @default false
   */
  hotSwap?: boolean;
  /**
   * #### Disable Layer Caching
   *
   * ---
   *
   * If `true`, disables caching of shared Lambda layers. By default, Stacktape checks if a layer with the same dependencies already exists in AWS and reuses it. Use this flag to force rebuilding and republishing the layer.
   *
   * @default false
   */
  disableLayerCaching?: boolean;
  /**
   * #### API Key
   *
   * ---
   *
   * Your Stacktape API key. You can get your key from the [Stacktape console](https://console.stacktape.com/api-keys). If you don't provide a key, you will be prompted to enter it. Note that providing the key directly in the command line is insecure, as it will be saved in your terminal history.
   */
  apiKey?: string;
  /**
   * #### AWS Account
   *
   * ---
   *
   * The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts).
   */
  awsAccount?: string;
  /**
   * #### Template ID
   *
   * ---
   *
   * The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates).
   */
  templateId?: string;
  /**
   * #### Project Name
   *
   * ---
   *
   * The name of the Stacktape project for this operation.
   */
  projectName?: string;
  /**
   * #### Assume Role of Resource
   *
   * ---
   *
   * The name of the deployed resource whose IAM role should be assumed during script execution.
   */
  assumeRoleOfResource?: string;
  /**
   * #### Format (language) used for the generated config
   * ---
   * Options are typescript or yaml.
   * @default "yaml"
   */
  configFormat?: 'yaml' | 'typescript';
  /**
   * #### Local port used for tunneling when using `bastion:tunnel` command.
   * ---
   * - Specifies the local port for tunneling when using the `bastion:tunnel` command.
   * - If not specified, Stacktape automatically selects an available port.
   * - For resources requiring multiple ports (e.g., databases with replicas), ports increment sequentially.
   */
  localTunnelingPort?: number;
  /**
   * #### Resources to Skip
   *
   * ---
   *
   * A list of logical resource IDs to skip during rollback. Use this when a rollback fails because certain resources
   * cannot be restored to their previous state (e.g., a Lambda alias pointing to a deleted version).
   *
   * **Warning:** Skipping resources means CloudFormation won't restore them to their previous state, which may leave
   * your stack in an inconsistent state. Use with caution.
   *
   * @example ["LambdaMcpServerStpAlias", "MyOtherResource"]
   */
  resourcesToSkip?: string[];
}

interface StacktapeSdkArgs
  extends Omit<
    StacktapeCliArgs,
    'event' | 'jsonEvent' | 'logOutput' | 'logFormat' | 'logLevel' | 'tokenType' | 'autoConfirmOperation'
  > {
  /**
   * #### Directly supplied stacktape configuration object
   */
  config?: StacktapeConfig;
  /**
   * #### The event that should be used to invoke the function
   */
  event?: Record<string, any>;
  /**
   * #### Username of the user in the userpool
   */
  username?: string;
  /**
   * #### Password of the user in the userpool
   */
  password?: string;
}

type HookableCommand =
  | 'compile-template'
  | 'deploy'
  | 'package-workloads'
  | 'preview-changes'
  | 'logs'
  | 'userpool-create-user'
  | 'userpool-get-token'
  | 'fn:deploy-fast'
  | 'fn:develop'
  | 'cw:run-local'
  | 'cw:deploy-fast'
  | 'bucket:sync'
  | 'stack-info'
  | 'delete'
  | 'rollback';

type HookableEvent = keyof Hooks;
