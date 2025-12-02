# Using iamRoleStatements

For more granular control, you can provide a list of raw _IAM_ role statements. These statements are added to the script's _IAM_ role, allowing you to define precise permissions for any AWS resource.

```yaml
resources:
  myScript:
    type: deployment-script
    properties:
      trigger: after:deploy
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-script.ts
      environment:
        - name: TOPIC_ARN
          value: $CfResourceParam('NotificationTopic', 'Arn')
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