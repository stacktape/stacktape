# Using connectTo

The `connectTo` property is a simplified way to grant access to other Stacktape-managed resources.

```yaml
resources:
  photosBucket:
    type: bucket

  myContainerWorkload:
    type: multi-container-workload
    properties:
      containers:
        - name: apiContainer
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: sr/index.ts
      # {start-highlight}
      connectTo:
        # access to the bucket
        - photosBucket
        # access to AWS SES
        - aws:ses
      # {stop-highlight}
      resources:
        cpu: 0.25
        memory: 512
```