# Custom listeners

Listeners check for connection requests from clients, using the protocol and port that you configure. You can define rules for a listener that determine how the load balancer routes requests to its registered targets.

```yaml
resources:
  myLoadBalancer:
    type: 'application-load-balancer'
    properties:
      # {start-highlight}
      listeners:
        - port: 80
          protocol: HTTP
      # {stop-highlight}

  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: my-lambda.js
      events:
        - type: application-load-balancer
          properties:
            loadBalancerName: myLoadBalancer
            # {start-highlight}
            # you need to specify listener port when referencing load balancer with custom listeners
            listenerPort: 80
            # {stop-highlight}
            priority: 5
            paths:
              - '*'
```

> An ALB with a single listener and a function integration.