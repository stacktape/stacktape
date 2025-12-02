# Using iamRoleStatements

For more granular control, you can provide a list of raw _IAM_ role statements. These statements are added to the service's _IAM_ role, allowing you to define precise permissions for any AWS resource.

```yaml
resources:
  myWorkerService:
    type: worker-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: server/index.ts
      # {start-highlight}
      iamRoleStatements:
        - Resource:
            - $CfResourceParam('NotificationTopic', 'Arn')
          Effect: 'Allow'
          Action:
            - 'sns:Publish'
      # {stop-highlight}
      resources:
        cpu: 2
        memory: 2048

cloudformationResources:
  NotificationTopic:
    Type: 'AWS::SNS::Topic'
```