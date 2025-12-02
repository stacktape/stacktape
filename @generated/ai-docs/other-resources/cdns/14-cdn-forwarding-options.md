# CDN forwarding options

Forwarding options specify which parts of a request are forwarded to the origin. You can also filter which request methods are forwarded.

If you don't specify any forwarding options, Stacktape uses the following defaults:

| Origin type               | Parts of request forwarded to origin                    |
| ------------------------- | ------------------------------------------------------- |
| Bucket                    | URL path                                                |
| HTTP API Gateway          | URL path, all query params, all headers, and all cookies |
| Application Load Balancer | URL path, all query params, all headers, and all cookies |

```yaml
resources:
  myHttpApi:
    type: 'http-api-gateway'
    properties:
      cdn:
        enabled: true
        # {start-highlight}
        forwardingOptions:
          allowedMethods:
            - 'GET'
            - 'POST'
        # {stop-highlight}
```