---
docType: concept
title: CloudFormation Resources
tags:
  - cloudformation
  - resources
  - concept
source: docs/_curated-docs/concepts/extending-cloudformation.mdx
priority: 1
---

# CloudFormation Resources

Use the `cloudformationResources` section to add native CloudFormation resources to your stack. This gives you access to any AWS resource that CloudFormation supports.

## When to Use

- AWS resource not natively supported by Stacktape
- Need low-level control over resource configuration
- Migrating existing CloudFormation templates

## Basic Example

Add an SNS topic using CloudFormation:

```ts
import { defineConfig } from 'stacktape';

export default defineConfig({
  resources: {
    processData: {
      type: 'function',
      properties: {
        packaging: {
          type: 'stacktape-lambda-buildpack',
          properties: {
            entryfilePath: 'src/process.ts'
          }
        },
        environment: [
          {
            name: 'SNS_TOPIC_ARN',
            value: '$CfResourceParam(\'AlertTopic\', \'TopicArn\')'
          }
        ]
      }
    }
  },

cloudformationResources: {
AlertTopic: {
Type: 'AWS::SNS::Topic',
Properties: {
TopicName: 'my-alert-topic',
DisplayName: 'Alert Notifications'
}
}
}
});

```

## Syntax

CloudFormation resources use the standard CloudFormation syntax:

```ts
cloudformationResources: {
  LogicalResourceName: {
    Type: 'AWS::Service::Resource',
    Properties: {
      // Resource-specific properties
    }
  }
}
```

## Referencing CloudFormation Resources

### Get Resource Attributes

Use `$CfResourceParam()` to get attributes from CloudFormation resources:

```ts
// Get the ARN of an SNS topic
'$CfResourceParam(\'AlertTopic\', \'TopicArn\')';

// Get the name of an S3 bucket
'$CfResourceParam(\'DataBucket\', \'BucketName\')';

// Get the physical ID (usually the resource name)
'$CfResourceParam(\'AlertTopic\', \'Ref\')';
```

### In Environment Variables

```ts
{
  myFunction: {
    type: 'function',
    properties: {
      packaging: {
        type: 'stacktape-lambda-buildpack',
        properties: { entryfilePath: 'src/handler.ts' }
      },
      environment: [
        {
          name: 'TOPIC_ARN',
          value: '$CfResourceParam(\'AlertTopic\', \'TopicArn\')'
        },
        {
          name: 'BUCKET_NAME',
          value: '$CfResourceParam(\'DataBucket\', \'BucketName\')'
        }
      ]
    }
  }
}
```

## Common CloudFormation Resources

### SNS Topic

```ts
cloudformationResources: {
  AlertTopic: {
    Type: 'AWS::SNS::Topic',
    Properties: {
      TopicName: 'alerts',
      DisplayName: 'Alert Notifications'
    }
  }
}
```

### SNS Subscription

```ts
cloudformationResources: {
  EmailSubscription: {
    Type: 'AWS::SNS::Subscription',
    Properties: {
      TopicArn: '$CfResourceParam(\'AlertTopic\', \'TopicArn\')',
      Protocol: 'email',
      Endpoint: 'alerts@example.com'
    }
  }
}
```

### IAM Role

```ts
cloudformationResources: {
  CustomRole: {
    Type: 'AWS::IAM::Role',
    Properties: {
      RoleName: 'custom-role',
      AssumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { Service: 'lambda.amazonaws.com' },
            Action: 'sts:AssumeRole'
          }
        ]
      },
      Policies: [
        {
          PolicyName: 'custom-policy',
          PolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: ['s3:GetObject'],
                Resource: '*'
              }
            ]
          }
        }
      ]
    }
  }
}
```

### CloudWatch Log Group

```ts
cloudformationResources: {
  CustomLogGroup: {
    Type: 'AWS::Logs::LogGroup',
    Properties: {
      LogGroupName: '/custom/logs',
      RetentionInDays: 30
    }
  }
}
```

### Secrets Manager Secret

```ts
cloudformationResources: {
  ApiSecret: {
    Type: 'AWS::SecretsManager::Secret',
    Properties: {
      Name: 'api-credentials',
      Description: 'API credentials for third-party service',
      GenerateSecretString: {
        SecretStringTemplate: '{"username": "admin"}',
        GenerateStringKey: 'password',
        PasswordLength: 32
      }
    }
  }
}
```

## Connecting Stacktape and CloudFormation Resources

### Lambda Triggered by SNS

```ts
import { defineConfig } from 'stacktape';

export default defineConfig({
  resources: {
    alertHandler: {
      type: 'function',
      properties: {
        packaging: {
          type: 'stacktape-lambda-buildpack',
          properties: { entryfilePath: 'src/alert-handler.ts' }
        },
        events: [
          {
            type: 'sns',
            properties: {
              topicArn: '$CfResourceParam(\'AlertTopic\', \'TopicArn\')'
            }
          }
        ]
      }
    }
  },

cloudformationResources: {
AlertTopic: {
Type: 'AWS::SNS::Topic',
Properties: {
TopicName: 'alerts'
}
}
}
});

```

### Referencing Stacktape Resources in CloudFormation

Use `$ResourceParam()` to reference Stacktape resources from CloudFormation:

```ts
cloudformationResources: {
  LambdaPermission: {
    Type: 'AWS::Lambda::Permission',
    Properties: {
      FunctionName: '$ResourceParam(\'myFunction\', \'arn\')',
      Action: 'lambda:InvokeFunction',
      Principal: 'sns.amazonaws.com',
      SourceArn: '$CfResourceParam(\'AlertTopic\', \'TopicArn\')'
    }
  }
}
```

## DependsOn

Control resource creation order:

```ts
cloudformationResources: {
  TopicSubscription: {
    Type: 'AWS::SNS::Subscription',
    DependsOn: ['AlertTopic'],
    Properties: {
      TopicArn: '$CfResourceParam(\'AlertTopic\', \'TopicArn\')',
      Protocol: 'email',
      Endpoint: 'admin@example.com'
    }
  }
}
```

## Finding Resource Types

See the [AWS CloudFormation Resource Reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html) for all available resource types and their properties.

## Best Practices

1. **Use Stacktape resources when available** - They provide better defaults and integration
2. **Name resources consistently** - Include stack/stage in names to avoid conflicts
3. **Document custom resources** - Explain why CloudFormation was needed
4. **Test thoroughly** - CloudFormation errors can be cryptic

## Limitations

- CloudFormation resources don't benefit from Stacktape's simplified configuration
- IAM permissions must be managed manually
- No automatic `connectTo` support
- Updates may require more careful planning (some properties can't be updated in-place)
