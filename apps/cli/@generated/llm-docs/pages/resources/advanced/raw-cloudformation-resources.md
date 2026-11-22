# Raw CloudFormation resources

`cloudformationResources` adds plain CloudFormation resources to your stack's template. Use it for an AWS service
that has no Stacktape resource, such as a CloudWatch dashboard, a Cognito identity pool or a Glue job. Stacktape
merges them into the template as written and deploys them with the rest of the stack.

Check the [resource catalog](/resources/) first: a Stacktape resource gives you `connectTo`, alarms, dev mode and the
Console views, which raw resources don't get. To change one property of a resource Stacktape already creates, use
[overrides](/configuration/overrides-and-escape-hatches). For several related resources with sensible defaults, an
[AWS CDK construct](/resources/advanced/aws-cdk-constructs) saves you writing every property.

## Basic example

`cloudformationResources` sits next to `resources`. Each key is the resource's logical ID in the template, and each
value is ordinary CloudFormation with a `Type` and usually `Properties`:


Example (TypeScript):

```typescript
import { defineConfig, LambdaFunction, JsBundleLambdaPackaging, $CfResourceParam } from 'stacktape';
export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/api.ts' }),
    environment: {
      FEATURE_FLAGS_PARAM: $CfResourceParam('FeatureFlags', 'Name')
    },
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['ssm:GetParameter'],
        Resource: ['arn:aws:ssm:*:*:parameter/my-app/feature-flags']
      }
    ]
  });

  return {
    resources: { api },
    cloudformationResources: {
      FeatureFlags: {
        Type: 'AWS::SSM::Parameter',
        Properties: {
          Name: '/my-app/feature-flags',
          Type: 'String',
          Value: '{"newCheckout":false}'
        }
      }
    }
  };
});
```


The function reads the parameter's name from `FEATURE_FLAGS_PARAM`. Raw resources don't work with `connectTo`, so the
function gets access through `iamRoleStatements`, which every compute resource accepts.

## Reference resources both ways

- From a Stacktape resource to a raw one: `$CfResourceParam('<logical ID>', '<attribute>')`, where the attribute is one
  that `Fn::GetAtt` returns, or `Ref`.
- From a raw resource to a Stacktape one: `$ResourceParam('<resource name>', '<parameter>')` with a
  [referenceable parameter](/configuration/referenceable-parameters) such as `arn` or `url`.
- Between raw resources: CloudFormation's own `{ Ref: 'LogicalId' }` and `{ 'Fn::GetAtt': ['LogicalId', 'Arn'] }`.

This subscribes an SQS queue from the stack to a raw SNS topic:

```typescript
cloudformationResources: {
  DeployAlerts: {
    Type: 'AWS::SNS::Topic'
  },
  DeployAlertsToQueue: {
    Type: 'AWS::SNS::Subscription',
    Properties: {
      TopicArn: { Ref: 'DeployAlerts' },
      Protocol: 'sqs',
      Endpoint: $ResourceParam('alertQueue', 'arn')
    }
  }
}
```

The queue also needs a policy that lets SNS send to it; the [SNS topic](/resources/messaging/sns-topic) page shows one.

In TypeScript, intrinsic functions are objects: `{ Ref: 'Id' }`, `{ 'Fn::GetAtt': ['Id', 'Arn'] }`,
`{ 'Fn::Sub': '…' }`, `{ 'Fn::Join': [',', […]] }`.

## Resource attributes

`DependsOn`, `DeletionPolicy`, `UpdateReplacePolicy`, `CreationPolicy`, `UpdatePolicy`, `Metadata` and `Condition`
pass through to the template. `DeletionPolicy: 'Retain'` keeps a resource, such as a log group with audit data, when
you delete the stack:

```typescript
cloudformationResources: {
  AuditLogGroup: {
    Type: 'AWS::Logs::LogGroup',
    DeletionPolicy: 'Retain',
    Properties: { LogGroupName: '/my-app/audit', RetentionInDays: 365 }
  }
}
```

Without it, deleting the stack deletes every raw resource with it.

## Check the template before you deploy

A logical ID that matches one Stacktape generates breaks the deploy. Give your keys a distinct prefix and look at the
final template:

```bash
stacktape synth --stage dev --region eu-west-1
```

`synth` writes the template to `compiled-template.yaml` without deploying. Search its `Resources` for your keys and for
the logical IDs of Stacktape's resources. Stacktape's own logical IDs are internal and can change between versions, so
reference Stacktape resources with `$ResourceParam` instead of their logical IDs.

## Limits

A CloudFormation template holds at most 500 resources, raw ones included, and AWS doesn't raise this limit. One
Stacktape resource creates several CloudFormation resources, so a large stack reaches it sooner than the number of
entries in your config suggests. Stacktape warns from 470 resources and stops the deploy above 500. Error tracking
adds one log subscription per function and container; `deploymentConfig.errorTracking.enabled: false` frees them.
Beyond that, split the stack into several stacks.

CloudFormation itself is free. You pay for the AWS resources you add.

## Next steps

- [Overrides and escape hatches](/configuration/overrides-and-escape-hatches): change resources Stacktape creates.
- [AWS CDK constructs](/resources/advanced/aws-cdk-constructs): higher-level building blocks for unsupported services.
- [Directives](/configuration/directives): `$ResourceParam`, `$CfResourceParam` and the others.
