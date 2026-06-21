# AWS CDK Constructs

A Stacktape CDK construct resource (`AwsCdkConstruct`) lets you embed an AWS CDK construct directly inside your Stacktape stack. Write a CDK construct class in TypeScript or JavaScript, point to the file, and Stacktape synthesizes and deploys it as part of your stack. Use it as an escape hatch for AWS resources that Stacktape does not natively support.

## When to use

Use a CDK construct when you need an AWS resource that Stacktape does not have a built-in resource type for. Common scenarios:

- **AWS services without a native Stacktape resource** — Cognito identity pools, AppSync GraphQL APIs, IoT Core rules, MediaConvert pipelines, and other AWS services that CDK supports.
- **Complex multi-resource patterns** — CDK L2 and L3 constructs wire up multiple underlying CloudFormation resources with sensible defaults (e.g., an S3 bucket with a CloudFront distribution and origin access identity in one construct).
- **Reusing existing CDK constructs** — your team already has CDK constructs for internal infrastructure patterns, and you want to embed them in a Stacktape-managed stack instead of maintaining a separate CDK app.

CDK constructs are the right choice when the resource you need involves multiple related CloudFormation resources or when you want the higher-level abstractions that CDK L2/L3 constructs provide over raw CloudFormation.

## When NOT to use

Skip CDK constructs when a simpler alternative fits:

- **Stacktape has a native resource type.** Many native Stacktape resources integrate with features such as [`connectTo`](/configuration/connecting-resources), [referenceable parameters](/configuration/referenceable-parameters), or resource-specific [alarms](/observability/alarms). `AwsCdkConstructProps` only exposes `entryfilePath`, `exportName`, and `constructProperties`. Prefer the native resource when one exists.
- **You need a single CloudFormation resource.** Use [`cloudformationResources`](/resources/advanced/raw-cloudformation-resources) instead — it requires no extra dependencies and is simpler for one-off resources like a CloudWatch dashboard or an IAM role.
- **You only need to tweak a Stacktape-managed resource.** Use [overrides](/configuration/overrides-and-escape-hatches) to modify the underlying CloudFormation properties of an existing resource directly.

| Need | Best option |
|------|-------------|
| AWS service with a native Stacktape type | Use the native resource |
| Single CloudFormation resource (e.g., CloudWatch dashboard) | `cloudformationResources` |
| Modify an existing Stacktape resource's CF properties | `overrides` |
| Multi-resource AWS pattern or CDK L2/L3 construct | `AwsCdkConstruct` |

## Prerequisites

The Stacktape config type requires the entry file to export a class that extends `Construct` from `aws-cdk-lib`. In CDK v2, the `Construct` base class is provided by the `constructs` package. Both are standard CDK v2 dependencies — install them before deploying.

```bash
npm install aws-cdk-lib constructs
```

If you use a different package manager, replace `npm install` with `pnpm add`, `yarn add`, or `bun add` accordingly.

## Basic example

The minimal setup points `entryfilePath` to a file that exports a class extending `Construct`. Stacktape uses the default export by default.


Example (TypeScript):

```typescript
import { defineConfig, AwsCdkConstruct } from 'stacktape';
export default defineConfig(() => {
  const notifications = new AwsCdkConstruct({
    entryfilePath: './cdk/notification-topic.ts'
  });

  return {
    resources: { notifications }
  };
});
```


The construct file is a standard CDK construct class. The Stacktape config type requires the file to export a class that extends `Construct` from `aws-cdk-lib`. In CDK v2, `Construct` is typically imported from the `constructs` package, as shown below.

```typescript
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

export default class NotificationTopic extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const topic = new sns.Topic(this, 'AlertTopic', {
      displayName: 'Application alerts'
    });

    topic.addSubscription(
      new subscriptions.EmailSubscription('ops@example.com')
    );
  }
}
```

The example uses the `constructs` package import, which is the standard CDK v2 convention for the `Construct` base class.

## Construct entry file

The `entryfilePath` property points to a `.ts` or `.js` file containing your construct class. Two rules apply:

1. The file must export a class that extends `Construct` from `aws-cdk-lib`. In practice, CDK v2 projects import `Construct` from the `constructs` package.
2. If the entry file uses a named export instead of a default export, set `exportName` to the exact class name.

By default, Stacktape uses the default export (`exportName` defaults to `"default"`). If your file has multiple exports or only uses named exports, specify which class to use.


Example (TypeScript):

```typescript
import { defineConfig, AwsCdkConstruct } from 'stacktape';
export default defineConfig(() => {
  const search = new AwsCdkConstruct({
    entryfilePath: './cdk/infrastructure.ts',
    exportName: 'SearchConstruct'
  });

  return {
    resources: { search }
  };
});
```


The corresponding construct file with a named export:

```typescript
import { Construct } from 'constructs';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';

export class SearchConstruct extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new opensearch.Domain(this, 'SearchDomain', {
      version: opensearch.EngineVersion.OPENSEARCH_2_11,
      capacity: {
        dataNodeInstanceType: 't3.small.search',
        dataNodes: 1
      }
    });
  }
}
```


> **Tip:** If you have existing CDK code that extends `Stack`, wrap the resources inside a `Construct` subclass to use it with Stacktape. The `Construct` base class is the expected entry point.


## Passing props to constructs

Use `constructProperties` to pass configuration to your construct's constructor. The `constructProperties` object is forwarded as the third argument (`props`) to your construct class. You can use [`$ResourceParam()`](/configuration/directives) and [`$Secret()`](/configuration/directives) directives to pass dynamic values from other Stacktape resources.


Example (TypeScript):

```typescript
import { defineConfig, Bucket, AwsCdkConstruct } from 'stacktape';
export default defineConfig(() => {
  const dataBucket = new Bucket({});

  const pipeline = new AwsCdkConstruct({
    entryfilePath: './cdk/data-pipeline.ts',
    constructProperties: {
      sourceBucketArn: "$ResourceParam('dataBucket', 'arn')",
      processingApiKey: "$Secret('processing-api-key')"
    }
  });

  return {
    resources: { dataBucket, pipeline }
  };
});
```


The construct receives these values through the `props` parameter:

```typescript
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Duration } from 'aws-cdk-lib';

type DataPipelineProps = {
  sourceBucketArn: string;
  processingApiKey: string;
};

export default class DataPipeline extends Construct {
  constructor(scope: Construct, id: string, props: DataPipelineProps) {
    super(scope, id);

    const bucket = s3.Bucket.fromBucketArn(this, 'SourceBucket', props.sourceBucketArn);

    const processor = new lambda.Function(this, 'Processor', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => {}'),
      timeout: Duration.minutes(5),
      environment: {
        API_KEY: props.processingApiKey
      }
    });

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(processor)
    );
  }
}
```

## Limitations

`AwsCdkConstructProps` only exposes `entryfilePath`, `exportName`, and `constructProperties`, so CDK constructs do not get the same Stacktape-specific integration features as native resources:

- **No `connectTo` support.** `AwsCdkConstructProps` does not define a `connectTo` field. Use `constructProperties` to pass Stacktape-managed values into the CDK construct. For workloads that expose `environment` and `iamRoleStatements` (such as [Lambda functions](/resources/compute/lambda-function) and [container workloads](/resources/compute/multi-container-workload)), configure those fields manually to grant access to CDK-created resources.
- **No referenceable parameters.** The referenceable-parameter types do not define parameters for `aws-cdk-construct`, so [`$ResourceParam()`](/configuration/directives) cannot reference outputs from an `AwsCdkConstruct`. To wire values between resources, keep the consuming resources inside the same CDK construct where CDK can handle references natively.
- **No overrides.** `AwsCdkConstruct` does not expose an `overrides` property in the current config type. Modify the CDK construct code directly instead.
- **No dev mode.** `AwsCdkConstructProps` does not expose a `devMode` setting, and `aws-cdk-construct` is not listed among `DevModeCapableResourceType` values (which include `batch-job`, `multi-container-workload`, and `function`).

## Comparison with raw CloudFormation

Stacktape offers two escape hatches for deploying resources it does not natively support. Choose based on complexity.

| Feature | CDK construct | cloudformationResources |
|---------|--------------|------------------------|
| Best for | Multi-resource patterns, L2/L3 constructs | Single AWS resources |
| Dependencies | `aws-cdk-lib` + `constructs` | None |
| Abstraction level | High (CDK L2/L3 with defaults) | Low (raw CF properties) |
| Code reuse | Full CDK construct ecosystem | Copy-paste CF JSON |
| Setup effort | Separate file + dependency install | Inline in config |

For a CloudWatch dashboard or a single IAM role, [`cloudformationResources`](/resources/advanced/raw-cloudformation-resources) is simpler — no extra dependencies, no separate file. For an AppSync API with resolvers, DynamoDB tables, and IAM roles wired together, a CDK construct saves significant effort because CDK L2/L3 constructs handle the cross-resource wiring and sensible defaults.

## FAQ

### What is AWS CDK?

AWS CDK (Cloud Development Kit) is an open-source framework for defining cloud infrastructure in code. It lets you use TypeScript, JavaScript, Python, Java, or other languages to define AWS resources, and synthesizes your code into a CloudFormation template. CDK has three levels of constructs: L1 (raw CloudFormation), L2 (opinionated wrappers with defaults), and L3 (multi-resource patterns). In Stacktape, you embed CDK constructs for resources Stacktape doesn't natively support. Learn more about the two escape hatches in [overrides and escape hatches](/configuration/overrides-and-escape-hatches).

### Can I use existing CDK constructs from npm?

Yes. Install any published CDK construct library (e.g., `@aws-solutions-constructs/*`, community constructs, or your own internal packages) alongside `aws-cdk-lib`. Import and use them in your construct file the same way you would in a standalone CDK app. Stacktape synthesizes and deploys the CDK construct as part of your stack.

### Can my CDK construct reference Stacktape-managed resources?

Yes, through `constructProperties`. Pass ARNs, names, or connection strings from Stacktape resources using `$ResourceParam()` directives. The CDK construct can then use CDK's `fromXxxArn()` or `fromXxxName()` import methods to reference those resources. See [Passing props to constructs](#passing-props-to-constructs) above for a working example.

### Do CDK constructs support connectTo?

No. `AwsCdkConstructProps` does not define a `connectTo` field. For workloads that expose `environment` and `iamRoleStatements`, configure those fields manually to grant access to CDK-created resources. Conversely, to give a CDK-created resource access to a Stacktape resource, pass the Stacktape resource's ARN or connection details through `constructProperties`.

### When should I use a CDK construct instead of raw CloudFormation?

Use a CDK construct when you need multiple related AWS resources wired together — for example, an API Gateway backed by a Lambda function with IAM roles and log groups. CDK L2 constructs handle the cross-resource wiring and provide sensible defaults, saving you from writing verbose CloudFormation JSON. Use [`cloudformationResources`](/resources/advanced/raw-cloudformation-resources) when you need a single standalone resource like a CloudWatch dashboard, an IAM role, or an SSM parameter.

### Can I use CDK constructs with both TypeScript and JavaScript?

Yes. The `entryfilePath` property accepts both `.ts` and `.js` files. TypeScript constructs are commonly used in CDK projects because of type safety with `aws-cdk-lib` types.

### Can I use multiple CDK constructs in one stack?

Yes. Define multiple `AwsCdkConstruct` resources in the same `resources` map, each with its own `entryfilePath`, `exportName`, and `constructProperties`. You can point them to different entry files or to the same file with different `exportName` values.

### How do I pass values from a CDK construct to other Stacktape resources?

The referenceable-parameter types do not define parameters for `aws-cdk-construct`, so `$ResourceParam()` cannot reference outputs from an `AwsCdkConstruct`. If you need a value produced by a CDK construct available elsewhere in your stack, keep the consuming resources inside the same CDK construct where CDK can handle the cross-resource references natively.

### What is the difference between CDK constructs and custom resources?

CDK constructs provision standard AWS resources through CloudFormation — they define infrastructure. [Custom resources](/resources/advanced/custom-resources) run a Lambda function during deployment to perform arbitrary logic (API calls, data seeding, cleanup tasks). Use CDK constructs to create AWS infrastructure; use custom resources to execute code as part of the deployment lifecycle.

### When should I use a CDK construct vs a native Stacktape resource?

Always prefer a native Stacktape resource when one exists. Many native resources integrate with features such as [`connectTo`](/configuration/connecting-resources) (automatic IAM permissions and environment variables), [`$ResourceParam()`](/configuration/referenceable-parameters) (cross-resource references), and resource-specific [alarms](/observability/alarms). `AwsCdkConstructProps` only exposes `entryfilePath`, `exportName`, and `constructProperties`. Reserve CDK constructs for AWS services that Stacktape does not have a built-in resource type for.

## API Reference


## API Reference: `AwsCdkConstructProps`
```typescript
type AwsCdkConstructProps = {
  /** Path to the file containing your CDK construct class. */
  entryfilePath: string;
  /** Custom props passed to the construct's constructor. */
  constructProperties?: unknown;
  /** Name of the exported construct class from the entry file. */
  exportName?: string;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `entryfilePath` | yes | `string` | Path to the file containing your CDK construct class. Supports `.js` and `.ts` files. The file must export a class that extends `Construct` from `aws-cdk-lib`. | - |
| `constructProperties` | no | `unknown` | Custom props passed to the construct's constructor. This object is forwarded as the third argument (`props`) to your construct class. Use `$ResourceParam()` and `$Secret()`
directives here to pass dynamic values from other resources in your stack. | - |
| `exportName` | no | `string` | Name of the exported construct class from the entry file. Must match the exact export name. Use this when the file has multiple exports or uses named exports. | `default` |
