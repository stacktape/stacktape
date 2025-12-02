# Integrating with compute resources

You can forward requests from an ALB to your compute resources by creating an event integration on a **multi-container workload**, **function**, or **batch job**.

Each integration must specify:

- **`loadBalancerName`**: The name of the ALB that will forward requests.
- **`priority`**: A number that determines the order in which the integration rules are evaluated (from lowest to highest).
- **`condition`**: A set of rules that determine which requests are forwarded to the resource. Conditions can be based on the URL path, query string, headers, and other request properties.

The following example shows two integrations:

- The first integration forwards all requests (`*`) to a multi-container workload.
- The second integration, which has a lower priority and is evaluated first, forwards any requests with a URL path prefixed with `/lambda-service/` to a Lambda function.

```yaml
resources:
  myLoadBalancer:
    type: 'application-load-balancer'

  mySingleContainer:
    type: 'multi-container-workload'
    properties:
      containers:
        - name: myCont
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: containers/ts-container.ts
          environment:
            - name: PORT
              value: '80'
          # {start-highlight}
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: myLoadBalancer
                containerPort: 80
                priority: 3
                paths:
                  - '*'
          # {stop-highlight}
      resources:
        cpu: 0.25
        memory: 512

  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: my-lambda.js
      # {start-highlight}
      events:
        - type: application-load-balancer
          properties:
            loadBalancerName: myLoadBalancer
            priority: 2
            paths:
              - '/lambda-service/*'
      # {stop-highlight}
```

> An ALB with integrations for both a function and a multi-container workload.

For more information, see the documentation on integrating ALBs with [functions](../../compute-resources/functions/26-application-load-balancer-event.md), [multi-container workloads](../../compute-resources/multi-container-workloads/index.md), and [batch jobs](../../compute-resources/batch-jobs/26-application-load-balancer-event.md).