# CORS

You can configure Cross-Origin Resource Sharing (CORS) to allow web applications from other domains to access the resources in your bucket.

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      # {start-highlight}
      cors:
        enabled: true
      # {stop-highlight}
```