# Using iamRoleStatements

For fine-grained control, you can provide raw _IAM_ role statements. This allows you to define custom permissions to any AWS resource.

```yaml
resources:
  myBatchJob:
    type: batch-job
    properties:
      resources:
        cpu: 2
        memory: 1800
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: path/to/my/batch-job.ts
      # {start-highlight}
      iamRoleStatements:
        - Resource:
            - $CfResourceParam('NotificationTopic', 'Arn')
          Effect: Allow
          Action:
            - 'sns:Publish'
      # {stop-highlight}

cloudformationResources:
  NotificationTopic:
    Type: AWS::SNS::Topic
```