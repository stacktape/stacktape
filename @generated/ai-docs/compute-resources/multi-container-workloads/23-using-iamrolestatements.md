# Using iamRoleStatements

For fine-grained control, you can provide raw _IAM_ role statements.

```yaml
resources:
  myContainerWorkload:
    type: multi-container-workload
    properties:
      containers:
        - name: apiContainer
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