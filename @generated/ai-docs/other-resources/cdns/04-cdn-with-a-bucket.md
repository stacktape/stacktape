# CDN with a bucket

You can enable a _CDN_ for a bucket with just two lines of configuration. By default, content from the bucket is cached for six months. This is a common pattern for serving static websites.

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      # {start-highlight}
      cdn:
        enabled: true
      # {stop-highlight}
```