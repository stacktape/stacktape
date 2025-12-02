# Network Load Balancer

A Network Load Balancer (NLB) is ideal for applications that require extreme performance, need to expose multiple ports, or use protocols other than HTTP/S.

```yaml
resources:
  webService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 2
        memory: 2048
      # {start-highlight}
      loadBalancing:
        type: network-load-balancer
        properties:
          ports:
            - port: 443
              containerPort: 80 # OPTIONAL: specify if target container port is different from `port`
              protocol: TLS # OPTIONAL: Supports protocols are TLS and TCP. Default is TLS.
      # {stop-highlight}
```