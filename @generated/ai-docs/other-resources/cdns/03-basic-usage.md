# Basic usage

In Stacktape, you configure a _CDN_ on a resource, which then becomes the default origin for the _CDN_. You can use a _CDN_ with a [bucket](./04-cdn-with-a-bucket.md), [HTTP API Gateway](./05-cdn-with-an-http-api-gateway.md), or [Application Load Balancer](./06-cdn-with-an-application-load-balancer.md).

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

You can also configure [route rewrites](./15-route-rewrites.md) to forward requests for specific paths to different origins. This allows you to create hybrid infrastructures where, for example, static content is served from a bucket and dynamic content is served from an API.