# Application Load Balancer event

Triggers the job when an Application Load Balancer receives an HTTP request matching specified conditions (e.g., path, headers, method).

```yaml
resources:
  # load balancer which routes traffic to the function
  myLoadBalancer:
    type: application-load-balancer

  myBatchJob:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: path/to/my/batch-job.ts
      resources:
        cpu: 2
        memory: 1800
      # {start-highlight}
      events:
        - type: application-load-balancer
          properties:
            # referencing load balancer defined above
            loadBalancerName: myLoadBalancer
            priority: 1
            paths:
              - /invoke-my-job
              - /another-path
      # {stop-highlight}
```