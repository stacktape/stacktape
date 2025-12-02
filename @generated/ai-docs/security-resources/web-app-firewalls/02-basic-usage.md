# Basic usage

```yaml
resources:
  # {start-highlight}
  myFirewall:
    type: web-app-firewall
    properties:
      scope: regional
  # {stop-highlight}
  webService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: index.ts
      resources:
        cpu: 0.25
        memory: 512
      loadBalancing:
        type: application-load-balancer
      # {start-highlight}
      useFirewall: myFirewall
      # {stop-highlight}
```

> An example of a firewall configuration used with a web service.