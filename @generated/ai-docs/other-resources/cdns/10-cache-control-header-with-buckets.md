# Cache-Control header with buckets

You can set the `Cache-Control` header for objects in a bucket using metadata. When you use the [directory upload](../../other-resources/buckets//index.md) feature, Stacktape can automatically set the correct headers for you using presets.

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