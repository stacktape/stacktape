# CORS

[Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) is a security feature that controls how web browsers handle requests to a different domain than the one the user is currently on.

If your frontend and backend are on different domains (e.g., `mydomain.com` and `api.mydomain.com`), you'll need to configure CORS.

You can enable CORS with a single line:

```yaml
resources:
  myWebService:
    type: 'web-service'
    properties:
      resources:
        cpu: 2
        memory: 2048
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      # {start-highlight}
      cors:
        enabled: true
      # {stop-highlight}
```

> A web service with CORS enabled.

You can also customize the CORS headers: