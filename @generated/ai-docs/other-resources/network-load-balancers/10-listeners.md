# Listeners

Listeners check for connection requests from clients, using the protocol and port that you configure.

```yaml
resources:
  myLoadBalancer:
    type: 'network-load-balancer'
    properties:
      customDomains:
        - my-app.mydomain.com
      # {start-highlight}
      listeners:
        - port: 8080
          protocol: TLS
        - port: 8081
          protocol: TCP
        - port: 8082
          protocol: TLS
      # {stop-highlight}
```

> A Network Load Balancer with three listeners.