# Controlling the cache key

The cache key is a unique identifier for each object in the cache. It determines whether a request results in a cache hit. By default, the cache key is based on the URL path, but you can configure it to include headers, cookies, or query parameters.

If you don't specify a cache key, Stacktape uses the following defaults:

| Origin type               | Parts of request included in cache key                 |
| ------------------------- | ------------------------------------------------------ |
| Bucket                    | URL path                                               |
| HTTP API Gateway          | URL path, all query params, and the `Authorization` header |
| Application Load Balancer | URL path, all query params, and the `Authorization` header |

For example, if your origin uses the `Accept-Language` header to return different content based on the client's language, you should include that header in the cache key.

```yaml
resources:
  myApiGateway:
    type: http-api-gateway
    properties:
      cdn:
        enabled: true
        cachingOptions:
          # {start-highlight}
          cacheKeyParameters:
            headers:
              whitelist:
                - Accept-Language
          # {stop-highlight}
```