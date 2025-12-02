# Versioning

You can enable versioning to keep a complete history of all object versions. This is useful for protecting against accidental deletions or overwrites.

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      # {start-highlight}
      versioning: true
      # {stop-highlight}
```