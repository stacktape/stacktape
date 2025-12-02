/**
 * #### Custom resource definition
 *
 * ---
 *
 * Defines the provisioning logic for a custom resource.
 * This allows you to create resources that are not natively supported by AWS CloudFormation or to provision services from other cloud providers.
 * The logic is implemented in an AWS Lambda function that is executed during `create`, `update`, and `delete` events.
 */
interface CustomResourceDefinition {
  type: 'custom-resource-definition';
  properties: CustomResourceDefinitionProps;
  overrides?: ResourceOverrides;
}

/**
 * #### Custom resource instance
 *
 * ---
 *
 * Creates an instance of a `custom-resource-definition`.
 * This is useful for creating resources that are not natively supported by AWS CloudFormation or for provisioning services from other providers.
 */
interface CustomResourceInstance {
  type: 'custom-resource-instance';
  properties: CustomResourceInstanceProps;
  overrides?: ResourceOverrides;
}

interface CustomResourceInstanceProps {
  /**
   * #### The name of the `custom-resource-definition` to use.
   */
  definitionName: string;
  /**
   * #### Properties passed to the custom resource instance.
   *
   * ---
   *
   * These properties will be accessible to the custom resource Lambda function during execution.
   */
  resourceProperties: { [name: string]: any };
}
interface CustomResourceDefinitionProps extends ResourceAccessProps {
  /**
   * #### The deployment package for the custom resource's Lambda function.
   *
   * ---
   *
   * Custom resources are managed by a Lambda function that is executed during `create`, `update`, and `delete` events.
   * This property configures the code and dependencies for that function.
   */
  packaging: LambdaPackaging;
  /**
   * #### Environment variables for the custom resource's Lambda function.
   *
   * ---
   *
   * These variables are injected into the function's runtime environment.
   * They are often used to provide information about other parts of your infrastructure, such as database connection strings or API keys.
   */
  environment?: EnvironmentVar[];
  /**
   * #### The runtime environment for the custom resource's Lambda function.
   *
   * ---
   *
   * Stacktape automatically detects the function's language and uses the latest corresponding runtime.
   * For example, it will use `nodejs22.x` for `.js` and `.ts` files.
   * For a list of available runtimes, see the [AWS Lambda runtimes documentation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html).
   */
  runtime?: LambdaRuntime;
  /**
   * #### The maximum execution time for the custom resource's Lambda function, in seconds.
   *
   * ---
   *
   * The maximum allowed time is 900 seconds.
   *
   * @default 10
   */
  timeout?: number;
  /**
   * #### The amount of memory available to the custom resource's Lambda function, in MB.
   *
   * ---
   *
   * - Must be between 128 MB and 10,240 MB, in 1-MB increments.
   * - The amount of available CPU power is proportional to the memory.
   * - A function with 1,797 MB of memory has the equivalent of 1 vCPU.
   * - The maximum number of vCPUs is 6 (at 10,240 MB of memory).
   */
  memory?: number;
}

type StpCustomResourceDefinition = CustomResourceDefinition['properties'] & {
  name: string;
  type: CustomResourceDefinition['type'];
  configParentResourceType: CustomResourceDefinition['type'];
  nameChain: string[];
  _nestedResources: {
    backingFunction: StpLambdaFunction;
  };
};

type StpCustomResource = CustomResourceInstance['properties'] & {
  name: string;
  type: CustomResourceInstance['type'];
  configParentResourceType: CustomResourceInstance['type'];
  nameChain: string[];
};
