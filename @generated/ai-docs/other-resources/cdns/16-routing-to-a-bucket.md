# Routing to a bucket

In this example, requests with a URL path starting with `/static` are routed to a bucket, while all other requests are routed to an HTTP API Gateway.

```yaml
resources:
  myHttpApi:
    type: 'http-api-gateway'
    properties:
      cdn:
        enabled: true
        # {start-highlight}
        routeRewrites:
          - path: /static/*
            routeTo:
              type: bucket
              properties:
                bucketName: myBucket
                disableUrlNormalization: true
        # {stop-highlight}

  myBucket:
    type: 'bucket'
```