interface StacktapeConfig {
  /**
   * #### AWS region where the stack will be deployed.
   *
   * ---
   *
   * If not specified, the region is resolved from (in order of precedence):
   * 1. `--region` CLI option
   * 2. `AWS_DEFAULT_REGION` environment variable
   * 3. Global defaults (configured via `defaults:configure` command)
   * 4. AWS config file for the current profile
   *
   * The `--region` CLI option always takes precedence over this config value.
   */
  region?: AWSRegion;
  /**
   * #### The name of this service.
   *
   * ---
   *
   * > **Deprecated:** Use the `--projectName` option in the CLI instead.
   *
   * The CloudFormation stack name will be in the format: `{serviceName}-{stage}`.
   *
   * Must be alphanumeric and can contain dashes. Must match the regex `[a-zA-Z][-a-zA-Z0-9]*`.
   *
   * @deprecated
   */
  serviceName?: string;
  /**
   * #### Configuration for 3rd-party service providers.
   */
  providerConfig?: {
    mongoDbAtlas?: MongoDbAtlasProvider;
    upstash?: UpstashProvider;
  };
  /**
   * #### Defines variables that can be used throughout the configuration.
   *
   * ---
   *
   * Variables can be accessed using the `$Var().{variable-name}` directive.
   * They are useful when you want to reuse the same value for multiple properties.
   *
   * Example: `dbAddress: $ResourceParam('myDatabase', 'host')`
   */
  variables?: { [variableName: string]: any };
  /**
   * #### Configures a monthly budget and notifications for the stack.
   *
   * ---
   *
   * Budget control allows you to monitor your spending and configure email notifications when cost thresholds are met.
   * The budget is reset at the beginning of each calendar month.
   */
  budgetControl?: BudgetControl;
  /**
   * #### Configures hooks to be executed before or after specified commands.
   *
   * ---
   *
   * Hooks are used to automatically execute scripts from the `scripts` section.
   */
  hooks?: Hooks;
  /**
   * #### A list of script definitions.
   *
   * ---
   *
   * Scripts allow you to specify and execute custom logic. Defining scripts in your Stacktape configuration offers several benefits:
   * - They are easily reusable by all members of your team.
   * - They can be executed automatically as part of lifecycle [hooks](https://docs.stacktape.com/configuration/hooks/) (e.g., before/after `deploy`/`delete`) or manually using the [`script:run` command](https://docs.stacktape.com/cli/commands/script-run/).
   * - You can use the `connectTo` property to easily inject environment variables for connecting to your stack's resources.
   * - You can leverage bastion scripts and tunneling to access resources that are only available within a VPC.
   *
   * There are three types of scripts:
   * 1.  **`local-script`**: Executed locally on the same machine where the Stacktape command is run.
   * 2.  **`local-script-with-bastion-tunneling`**: Same as `local-script`, but connections to resources in the `connectTo` list are tunneled through a bastion host, allowing you to access VPC-only resources.
   * 3.  **`bastion-script`**: Executed on the bastion host itself.
   *
   * Scripts can be either shell commands or files written in JavaScript, TypeScript, or Python.
   */
  scripts?: { [scriptName: string]: LocalScript | BastionScript | LocalScriptWithBastionTunneling };
  /**
   * #### Configures custom, user-defined directives for use in this configuration.
   *
   * ---
   *
   * Directives can be used to dynamically configure certain aspects of your stack.
   */
  directives?: DirectiveDefinition[];
  /**
   * #### Configures deployment-related aspects for this stack.
   */
  deploymentConfig?: DeploymentConfig;
  /**
   * #### Configures other, uncategorized aspects of this stack.
   */
  stackConfig?: StackConfig;
  /**
   * #### The infrastructure resources that make up your stack.
   *
   * ---
   *
   * Each resource consists of multiple underlying AWS resources.
   * To see all resources in this stack, including their underlying CloudFormation resources, use the `stacktape stack-info --detailed` command.
   * Each resource specified here counts towards your resource limit.
   */
  resources: { [resourceName: string]: StacktapeResourceDefinition };
  /**
   * #### Raw CloudFormation resources that will be deployed in this stack.
   *
   * ---
   *
   * These resources will be merged with the resources managed by Stacktape.
   * Each CloudFormation resource consists of a logical name and its definition.
   *
   * To avoid logical name conflicts, you can see all logical names for resources deployed by Stacktape using the `stacktape stack-info --detailed` command.
   * Resources specified here do not count towards your resource limit.
   *
   * For a list of all supported AWS CloudFormation resources, see the [AWS documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html).
   */
  cloudformationResources?: { [resourceName: string]: CloudformationResource };
}
