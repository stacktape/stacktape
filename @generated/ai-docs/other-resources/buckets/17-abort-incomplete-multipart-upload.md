# Abort incomplete multipart upload

You can abort multipart uploads that do not complete within a specified number of days to avoid storing incomplete object parts.

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      # {start-highlight}
      lifecycleRules:
        - type: abort-incomplete-multipart-upload
          properties:
            daysAfterInitiation: 5
      # {stop-highlight}
```