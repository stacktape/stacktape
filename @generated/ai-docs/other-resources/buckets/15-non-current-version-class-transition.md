# Non-current version class transition

You can transition previous versions of an object to a different storage class.

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      versioning: true
      # {start-highlight}
      lifecycleRules:
        - type: non-current-version-class-transition
          properties:
            daysAfterVersioned: 10
            storageClass: 'DEEP_ARCHIVE'
      # {stop-highlight}
```