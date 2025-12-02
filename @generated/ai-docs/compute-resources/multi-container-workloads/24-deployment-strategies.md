# Deployment strategies

By default, Stacktape uses a rolling update strategy. You can choose a different strategy using the `deployment` property.

```yaml
resources:
  myLoadBalancer:
    type: application-load-balancer

  myApp:
    type: multi-container-workload
    properties:
      containers:
        - name: api-container
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: myLoadBalancer
                containerPort: 80
                priority: 1
                paths: ['*']
      resources:
        cpu: 2
        memory: 2048
      # {start-highlight}
      deployment:
        strategy: Canary10Percent5Minutes
      # {stop-highlight}
```