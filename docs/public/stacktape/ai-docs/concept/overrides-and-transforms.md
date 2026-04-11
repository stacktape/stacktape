---
docType: concept
title: Overrides & Transforms
tags:
  - overrides
  - transforms
  - concept
source: docs/_curated-docs/concepts/overrides-and-transforms.mdx
priority: 1
---

# Overrides & Transforms

Stacktape generates CloudFormation templates from your configuration. Sometimes you need to customize the underlying AWS resources beyond what Stacktape exposes. Overrides and transforms give you this power.

## Understanding Child Resources

Each Stacktape resource creates one or more CloudFormation resources ("child resources"). For example, a `function` creates:

- AWS Lambda Function
- IAM Role
- CloudWatch Log Group
- (Optionally) Event Source Mappings, Permissions, etc.

You can view the child resources for any Stacktape resource:

```bash
stacktape stack-info --stage dev --region us-east-1 --detailed
```

Or use the Stacktape Console's resource inspector.

`[IMAGE PLACEHOLDER: console-child-resources-view]`

## Overrides

Overrides let you set specific properties on child CloudFormation resources.

### Basic Override

```yaml
resources:
  handler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/handler.ts
      overrides:
        # Override the Lambda function's description
        StpLambdaFunction:
          Description: 'My custom description'
```

### Finding Child Resource Names

To override a property, you need to know the logical name of the child resource. Use:

1. **CLI**: `stacktape stack-info --detailed`
2. **Console**: View resource details
3. **Compile template**: `stacktape compile-template` and inspect the output

Common child resource names:

| Stacktape Resource    | Child Resources                                                           |
| --------------------- | ------------------------------------------------------------------------- |
| `function`            | `StpLambdaFunction`, `StpLambdaFunctionRole`, `StpLambdaFunctionLogGroup` |
| `web-service`         | `StpEcsService`, `StpEcsTaskDefinition`, `StpEcsTaskRole`                 |
| `relational-database` | `StpRdsInstance`, `StpRdsSecurityGroup`, `StpRdsSubnetGroup`              |
| `bucket`              | `StpS3Bucket`                                                             |
| `http-api-gateway`    | `StpHttpApi`                                                              |

### Override Example: Lambda Reserved Concurrency

```yaml
resources:
  handler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/handler.ts
      overrides:
        StpLambdaFunction:
          ReservedConcurrentExecutions: 100
```

### Override Example: S3 Bucket Policy

```yaml
resources:
  uploads:
    type: bucket
    properties:
      overrides:
        StpS3Bucket:
          PublicAccessBlockConfiguration:
            BlockPublicAcls: true
            BlockPublicPolicy: true
            IgnorePublicAcls: true
            RestrictPublicBuckets: true
```

### Override Example: RDS Parameter Group

```yaml
resources:
  database:
    type: relational-database
    properties:
      engine:
        type: postgres
        properties:
          version: '16'
      overrides:
        StpRdsParameterGroup:
          Parameters:
            max_connections: '200'
            shared_buffers: '256MB'
```

## Transforms

Transforms are functions that modify the CloudFormation properties. They're more powerful than overrides because you can compute values based on existing properties.

### Basic Transform

```yaml
resources:
  handler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/handler.ts
      memory: 128
      transforms:
        StpLambdaFunction: |
          (props) => ({
            ...props,
            MemorySize: props.MemorySize * 2  // Double the memory
          })
```

### TypeScript Transforms

In TypeScript configuration, transforms are cleaner:

```typescript
import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const handler = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    memory: 128,
    transforms: {
      StpLambdaFunction: (props) => ({
        ...props,
        MemorySize: (props.MemorySize ?? 128) * 2,
        Description: `Handler with ${props.MemorySize}MB memory`
      })
    }
  });

  return { resources: { handler } };
});
```

### Transform Example: Add Lambda Layers

```typescript
const handler = new LambdaFunction({
  packaging: new StacktapeLambdaBuildpackPackaging({
    entryfilePath: './src/handler.ts'
  }),
  transforms: {
    StpLambdaFunction: (props) => ({
      ...props,
      Layers: [...(props.Layers || []), 'arn:aws:lambda:us-east-1:123456789:layer:my-layer:1']
    })
  }
});
```

### Transform Example: Custom ECS Task Definition

```typescript
const api = new WebService({
  packaging: new StacktapeImageBuildpackPackaging({
    entryfilePath: './src/server.ts'
  }),
  transforms: {
    StpEcsTaskDefinition: (props) => ({
      ...props,
      ContainerDefinitions: props.ContainerDefinitions.map((container) => ({
        ...container,
        Ulimits: [{ Name: 'nofile', SoftLimit: 65536, HardLimit: 65536 }]
      }))
    })
  }
});
```

## Overrides vs Transforms

| Feature        | Overrides               | Transforms               |
| -------------- | ----------------------- | ------------------------ |
| Syntax         | Static values           | JavaScript function      |
| Use case       | Set specific properties | Compute or modify values |
| Complexity     | Simple                  | More powerful            |
| Merge behavior | Shallow merge           | Full control             |

Use **overrides** when you know the exact value you want to set.
Use **transforms** when you need to compute values or modify existing properties.

## Viewing Generated CloudFormation

To see the final CloudFormation template after overrides and transforms:

```bash
stacktape compile-template --stage dev --region us-east-1
```

This outputs `compiled-template.yaml` which you can inspect.

## Adding Raw CloudFormation Resources

For resources Stacktape doesn't support, add raw CloudFormation:

```yaml
resources:
  handler:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/handler.ts

cloudformationResources:
  # Add a custom SNS topic
  MyCustomTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: my-custom-topic
      DisplayName: My Custom Topic

  # Subscribe the function to the topic
  MyTopicSubscription:
    Type: AWS::SNS::Subscription
    Properties:
      Protocol: lambda
      TopicArn: !Ref MyCustomTopic
      Endpoint: !GetAtt StpHandlerStpLambdaFunction.Arn
```

Reference CloudFormation resources in Stacktape:

```yaml
resources:
  handler:
    type: function
    properties:
      environment:
        - name: TOPIC_ARN
          value: $CfResourceParam('MyCustomTopic', 'Arn')
```

## AWS CDK Constructs

For complex extensions, use AWS CDK constructs:

```typescript
// cdk/monitoring.ts
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export class MonitoringDashboard extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: 'my-app-dashboard',
      widgets: [
        // Dashboard configuration
      ]
    });
  }
}
```

Reference in config:

```yaml
resources:
  handler:
    type: function

cdkConstructs:
  - constructPath: ./cdk/monitoring.ts
    constructName: MonitoringDashboard
```

See [Extending with CDK](/extending/cdk-constructs) for more details.

## Best Practices

1. **Try Stacktape properties first**: Many customizations are available through standard properties
2. **Use overrides for simple changes**: Static values that don't depend on other properties
3. **Use transforms for computed values**: When you need to modify or compute based on existing values
4. **Document your overrides**: Explain why you needed to override
5. **Test thoroughly**: Overrides bypass Stacktape's validation
6. **Keep it minimal**: The more you override, the more you need to maintain

## Common Override Scenarios

### Custom Lambda Runtime

```yaml
overrides:
  StpLambdaFunction:
    Runtime: provided.al2023
```

### ECS Health Check

```yaml
overrides:
  StpEcsTaskDefinition:
    ContainerDefinitions:
      - HealthCheck:
          Command: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1']
          Interval: 30
          Timeout: 5
          Retries: 3
```

### RDS Enhanced Monitoring

```yaml
overrides:
  StpRdsInstance:
    MonitoringInterval: 60
    MonitoringRoleArn: arn:aws:iam::123456789:role/rds-monitoring-role
```

## Next Steps
