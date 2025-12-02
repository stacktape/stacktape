# API Reference

TypeScript type definitions for this resource.

```typescript
// From stacktape-config/deployment-script.d.ts
/**
 * #### A resource that executes a script as part of your deployment process.
 *
 * ---
 *
 * The script is executed in a Lambda function during a `deploy` or `delete` operation.
 * This is useful for tasks like database migrations, seeding data, or other setup or teardown operations.
 */
interface DeploymentScript {
  type: 'deployment-script';
  properties: DeploymentScriptProps;
  overrides?: ResourceOverrides;
}

type StpDeploymentScript = DeploymentScript['properties'] & {
  name: string;
  type: DeploymentScript['type'];
  configParentResourceType: DeploymentScript['type'];
  nameChain: string[];
  _nestedResources: {
    scriptFunction: StpLambdaFunction;
  };
};

interface DeploymentScriptProps extends ResourceAccessProps {
  /**
   * #### Configures when the script is triggered.
   *
   * ---
   *
   * - `after:deploy`: Executes after all resources in the stack have been successfully deployed. If the script fails, the entire deployment will be rolled back.
   * - `before:delete`: Executes before the stack's resources begin to be deleted. If the script fails, the deletion process will still proceed.
   *
   * You can also trigger the script manually using the `stacktape deployment-script:run` command.
   */
  trigger: 'after:deploy' | 'before:delete';
  /**
   * #### Configures how your script is packaged and deployed.
   *
   * ---
   *
   * Stacktape supports two packaging methods:
   * - `stacktape-lambda-buildpack`: Stacktape automatically builds and packages your code from a specified source file. This is the recommended and simplest approach.
   * - `custom-artifact`: You provide a path to a pre-built deployment package (e.g., a zip file). Stacktape will handle the upload.
   *
   * Your deployment packages are stored in an S3 bucket managed by Stacktape.
   */
  packaging: LambdaPackaging;
  /**
   * #### The runtime environment for the script's Lambda function.
   *
   * ---
   *
   * Stacktape automatically detects the programming language and selects the latest appropriate runtime. For example, `.ts` and `.js` files will use a recent Node.js runtime.
   * For a full list of available runtimes, see the [AWS Lambda runtimes documentation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html).
   */
  runtime?: LambdaRuntime;
  /**
   * #### A list of environment variables to inject into the script's execution environment.
   *
   * ---
   *
   * This is useful for providing configuration details, such as database connection strings or secrets.
   */
  environment?: EnvironmentVar[];
  /**
   * #### A map of parameters to pass to the script's handler function.
   *
   * ---
   *
   * This allows you to pass structured data to your script.
   *
   * > **Note:** You cannot pass secrets using this property. Use `environment` variables for secrets.
   */
  parameters?: { [name: string]: any };
  /**
   * #### The amount of memory (in MB) to allocate to the script's Lambda function.
   *
   * ---
   *
   * This setting also influences the amount of CPU power the function receives.
   * The value must be between 128 MB and 10,240 MB.
   */
  memory?: number;
  /**
   * #### The maximum execution time for the script, in seconds.
   *
   * ---
   *
   * If the script runs longer than this, it will be terminated. The maximum allowed timeout is 900 seconds (15 minutes).
   *
   * @default 10
   */
  timeout?: number;
  /**
   * #### Connects the script's Lambda function to your stack's default Virtual Private Cloud (VPC).
   *
   * ---
   *
   * This is necessary to access resources within the VPC, such as relational databases.
   *
   * > **Important:** When a function joins a VPC, it loses direct internet access.
   *
   * For more details, see the [Stacktape VPCs documentation](https://docs.stacktape.com/user-guides/vpcs/).
   */
  joinDefaultVpc?: boolean;
  /**
   * #### The size (in MB) of the function's `/tmp` directory.
   *
   * ---
   *
   * This provides ephemeral storage for your function. The size can be between 512 MB and 10,240 MB.
   *
   * @default 512
   */
  storage?: number;
}
```