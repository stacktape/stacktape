---
docType: config-ref
title: Aws Cdk Construct
resourceType: aws-cdk-construct
tags:
  - aws-cdk-construct
  - cdk
  - construct
source: types/stacktape-config/aws-cdk-construct.d.ts
priority: 1
---

# Aws Cdk Construct

Embed an AWS CDK construct directly in your Stacktape stack.

Escape hatch for resources not natively supported by Stacktape. Write a CDK construct class
in TypeScript/JavaScript and Stacktape will synthesize and deploy it as part of your stack.

Resource type: `aws-cdk-construct`

## TypeScript Definition

```typescript
/**
 * #### Embed an AWS CDK construct directly in your Stacktape stack.
 *
 * ---
 *
 * Escape hatch for resources not natively supported by Stacktape. Write a CDK construct class
 * in TypeScript/JavaScript and Stacktape will synthesize and deploy it as part of your stack.
 */
interface AwsCdkConstruct {
  type: 'aws-cdk-construct';
  properties?: AwsCdkConstructProps;
  //   overrides?: ResourceOverrides;
}

interface AwsCdkConstructProps {
  /**
   * #### Path to the file containing your CDK construct class.
   *
   * ---
   *
   * Supports `.js` and `.ts` files. The file must export a class that extends `Construct` from `aws-cdk-lib`.
   */
  entryfilePath: string;
  /**
   * #### Name of the exported construct class from the entry file.
   *
   * ---
   *
   * Must match the exact export name. Use this when the file has multiple exports or uses named exports.
   *
   * @default "default"
   */
  exportName?: string;
  /**
   * #### Custom props passed to the construct's constructor.
   *
   * ---
   *
   * This object is forwarded as the third argument (`props`) to your construct class. Use `$ResourceParam()` and `$Secret()`
   * directives here to pass dynamic values from other resources in your stack.
   */
  constructProperties?: any;
}
```
