# Routing to a custom origin

```yaml
resources:
  myLoadBalancer:
    type: 'application-load-balancer'
    properties:
      cdn:
        enabled: true
        # {start-highlight}
        routeRewrites:
          - path: /external/*
            routeTo:
              type: custom-origin
              properties:
                domainName: my-custom-origin.example.com
        # {stop-highlight}
```