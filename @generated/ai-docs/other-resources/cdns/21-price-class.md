# Price class

You can set a price class to reduce the cost of your _CDN_ by limiting the number of edge locations from which it serves traffic.

```yaml
resources:
  myApiGateway:
    type: http-api-gateway
    properties:
      cdn:
        enabled: true
        # {start-highlight}
        cloudfrontPriceClass: PriceClass_200
        # {stop-highlight}
```