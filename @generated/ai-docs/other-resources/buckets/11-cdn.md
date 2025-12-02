# CDN

You can place an AWS CloudFront _CDN_ in front of your bucket to cache its content in edge locations around the world, reducing latency for your users. This is a common pattern for serving static websites.

For more information, see the [_CDN_ documentation](../../other-resources/cdns/index.md).

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      directoryUpload:
        directoryPath: my-web/build
        headersPreset: static-website
      cdn:
        enabled: true
```

> A bucket with a _CDN_ and directory upload enabled.