# API Reference

TypeScript type definitions for this resource.

```typescript
// From stacktape-config/aws-cdk-construct.d.ts
/**
 * #### AWS CDK Construct
 *
 * ---
 *
 * Allows you to deploy a custom AWS CDK construct as part of your Stacktape stack. This is useful for integrating existing CDK code or for resources not yet supported by Stacktape.
 *
 * For more information on AWS CDK, refer to the [official AWS CDK documentation](https://docs.aws.amazon.com/cdk/v2/guide/home.html).
 */
interface AwsCdkConstruct {
  type: 'aws-cdk-construct';
  properties?: AwsCdkConstructProps;
  //   overrides?: ResourceOverrides;
}

type StpAwsCdkConstruct = AwsCdkConstruct['properties'] & {
  name: string;
  type: AwsCdkConstruct['type'];
  configParentResourceType: AwsCdkConstruct['type'];
  nameChain: string[];
};

interface AwsCdkConstructProps {
  /**
   * #### Entry File Path
   *
   * ---
   *
   * The path to the file containing the CDK construct.
   *
   * Supported file extensions are `.js` and `.ts`.
   */
  entryfilePath: string;
  /**
   * #### Export Name
   *
   * ---
   *
   * The name of the exported construct class from the `entryfilePath`.
   *
   * If not provided, Stacktape will use the `default` export.
   *
   * @default "default"
   */
  exportName?: string;
  /**
   * #### Construct Properties
   *
   * ---
   *
   * An object passed as props to the construct's constructor. This allows you to configure the construct with custom values.
   */
  constructProperties?: any;
}
```