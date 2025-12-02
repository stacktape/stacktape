# CORS

[Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) is a security feature that controls how web browsers handle requests to a different domain than the one the user is currently on. If your frontend and backend are on different domains (e.g., `mydomain.com` and `api.mydomain.com`), you'll need to configure CORS.

You can enable CORS with a single line:

```yaml
resources:
  myHttpApi:
    type: 'http-api-gateway'
    properties:
      # {start-highlight}
      cors:
        enabled: true
      # {stop-highlight}
```

You can also customize the CORS headers: