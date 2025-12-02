# Encryption

If enabled, all objects uploaded to the bucket will be encrypted on the server side using the AES-256 algorithm.

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      # {start-highlight}
      encryption: true
      # {stop-highlight}
```