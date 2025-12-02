# CDN

You can place an AWS CloudFront _CDN_ in front of your web service to cache content and reduce latency.

For more information, see the [_CDN_ documentation](../../other-resources/cdns/index.md).

```yaml
resources:
  webService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 2
        memory: 2048
      # {start-highlight}
      cdn:
        enabled: true
      # {stop-highlight}
```