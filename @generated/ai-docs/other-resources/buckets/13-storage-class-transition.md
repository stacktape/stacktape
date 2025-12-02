# Storage class transition

You can transition objects to a different storage class to save costs. For example, you can move infrequently accessed data to a cheaper, long-term storage class like Glacier.

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      # {start-highlight}
      lifecycleRules:
        - type: class-transition
          properties:
            daysAfterUpload: 90
            storageClass: 'GLACIER'
      # {stop-highlight}
```

> This configuration transfers all objects to the Glacier storage class 90 days after they are uploaded.