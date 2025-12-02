# Using Stacktape to manage domains and certs

```yaml
resources:
  myLoadBalancer:
    type: 'application-load-balancer'
    properties:
      # {start-highlight}
      customDomains:
        - my-app.mydomain.com
      # {stop-highlight}
```