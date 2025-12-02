# Application Load Balancer event

Triggers the function when an Application Load Balancer receives a request matching specified rules.

```yaml
resources:
  # load balancer which routes traffic to the function
  myLoadBalancer:
    type: application-load-balancer

  myLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      # {start-highlight}
      events:
        - type: application-load-balancer
          properties:
            # referencing load balancer defined above
            loadBalancerName: myLoadBalancer
            priority: 1
            paths:
              - /invoke-my-lambda
              - /another-path
      # {stop-highlight}
```