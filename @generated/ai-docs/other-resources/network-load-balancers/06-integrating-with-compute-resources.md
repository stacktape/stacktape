# Integrating with compute resources

You can forward traffic from an NLB to a [multi-container workload](../../compute-resources/multi-container-workloads/index.md). Each integration must specify the load balancer, the listener port, and the container port.

```yaml
resources:
  myLoadBalancer:
    type: 'network-load-balancer'
    properties:
      listeners:
        - port: 8080
          protocol: TLS

  myWorkload:
    type: 'multi-container-workload'
    properties:
      containers:
        - name: container1
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: containers/ts-container.ts
          # {start-highlight}
          events:
            - type: network-load-balancer
              properties:
                loadBalancerName: myLoadBalancer
                listenerPort: 8080
                containerPort: 8080
          # {stop-highlight}
      resources:
        cpu: 0.25
        memory: 512
```

For more information, see the documentation on integrating NLBs with [multi-container workloads](../../compute-resources/multi-container-workloads/index.md).