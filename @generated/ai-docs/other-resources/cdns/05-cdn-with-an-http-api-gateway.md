# CDN with an HTTP API Gateway

You can also enable a _CDN_ for an HTTP API Gateway. By default, the _CDN_ does not cache any content from an API gateway, as it's assumed to be dynamic. You can control the caching behavior by setting the `Cache-Control` header in your API's responses.

```yaml
resources:
  myApiGateway:
    type: http-api-gateway
    properties:
      # {start-highlight}
      cdn:
        enabled: true
      # {stop-highlight}
```