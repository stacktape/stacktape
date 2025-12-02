# Non-current version expiration

You can automatically delete previous versions of an object after a specified number of days.

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      versioning: true
      # {start-highlight}
      lifecycleRules:
        - type: non-current-version-expiration
          properties:
            daysAfterVersioned: 10
      # {stop-highlight}
```