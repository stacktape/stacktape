/**
 * #### Lambda-backed provisioning logic for resources not natively supported by Stacktape/CloudFormation.
 *
 * ---
 *
 * Your Lambda function runs on stack create, update, and delete events to manage external resources
 * (third-party APIs, SaaS services, custom infrastructure). Pair with `custom-resource-instance` to use.
 */
interface CustomResourceDefinition {
  type: 'custom-resource-definition';
  properties: CustomResourceDefinitionProps;
  overrides?: ResourceOverrides;
}

/**
 * #### An instance of a `custom-resource-definition`. Pass properties to the backing Lambda function.
 */
interface CustomResourceInstance {
  type: 'custom-resource-instance';
  properties: CustomResourceInstanceProps;
  overrides?: ResourceOverrides;
}

interface CustomResourceInstanceProps {
  /**
   * #### Name of the `custom-resource-definition` in your config that provides the backing Lambda.
   */
  definitionName: string;
  /**
   * #### Key-value pairs passed to the Lambda function during create/update/delete events.
   */
  resourceProperties: { [name: string]: any };
}
interface CustomResourceDefinitionProps extends ResourceAccessProps {
  /**
   * #### How the Lambda function code is packaged and deployed.
   */
  packaging: LambdaPackaging;
  /**
   * #### Environment variables injected into the Lambda function. Use `$ResourceParam()` for dynamic values.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Lambda runtime. Auto-detected from file extension if not specified.
   */
  runtime?: LambdaRuntime;
  /**
   * #### Max execution time in seconds. Max: 900.
   * @default 10
   */
  timeout?: number;
  /**
   * #### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.
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
