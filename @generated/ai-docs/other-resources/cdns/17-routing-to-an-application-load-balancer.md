# Routing to an Application Load Balancer

```yaml
resources:
  myHttpApi:
    type: 'http-api-gateway'
    properties:
      cdn:
        enabled: true
        # {start-highlight}
        routeRewrites:
          - path: /app2/*
            routeTo:
              type: 'application-load-balancer'
              properties:
                loadBalancerName: myLoadBalancer
        # {stop-highlight}

  myLoadBalancer:
    type: 'application-load-balancer'
```