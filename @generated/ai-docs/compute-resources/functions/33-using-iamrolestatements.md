# Using iamRoleStatements

For fine-grained control, you can provide raw _IAM_ role statements.

```yaml
resources:
  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      # {start-highlight}
      environment:
        - name: TOPIC_ARN
          value: $CfResourceParam('NotificationTopic', 'Arn')
      # {stop-highlight}
      # {start-highlight}
      iamRoleStatements:
        - Resource:
            - $CfResourceParam('NotificationTopic', 'Arn')
          Effect: 'Allow'
          Action:
            - 'sns:Publish'
      # {stop-highlight}

cloudformationResources:
  NotificationTopic:
    Type: AWS::SNS::Topic
```