# CDN caching options

You can specify default caching behavior for your _CDN_. Different caching options can be set for each [route rewrite](./15-route-rewrites.md).

If you don't specify any caching options, Stacktape uses the following defaults:

| Origin type               | minTTL | maxTTL   | defaultTTL |
| ------------------------- | ------ | -------- | ---------- |
| Bucket                    | 0      | 31536000 | 15768000   |
| HTTP API Gateway          | 0      | 31536000 | 0          |
| Application Load Balancer | 0      | 31536000 | 0          |

```yaml
resources:
  myHttpApi:
    type: 'http-api-gateway'
    properties:
      cdn:
        enabled: true
        # {start-highlight}
        cachingOptions:
          defaultTTL: 60
        # {stop-highlight}
        routeRewrites:
          - path: /static/*
            # {start-highlight}
            cachingOptions:
              defaultTTL: 604800
            # {stop-highlight}
```