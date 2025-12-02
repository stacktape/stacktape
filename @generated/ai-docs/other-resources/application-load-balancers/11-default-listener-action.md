# Default listener action

The default action for a listener determines what to do with a request that doesn't match any of the listener's rules.

### Redirect

You can configure a listener to redirect incoming requests to a different URL. For example, you can redirect all HTTP requests on port 80 to an HTTPS listener on port 443.

```yaml
resources:
  myLoadBalancer:
    type: 'application-load-balancer'
    properties:
      customDomains:
        - my-app.mydomain.com
      listeners:
        - port: 443
          protocol: HTTPS
        - port: 80
          protocol: HTTP
          # {start-highlight}
          defaultAction:
            type: redirect
            properties:
              statusCode: HTTP_301
              protocol: HTTPS
              port: 443
          # {stop-highlight}
```