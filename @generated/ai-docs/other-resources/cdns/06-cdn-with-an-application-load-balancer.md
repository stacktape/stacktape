# CDN with an Application Load Balancer

Similarly, you can enable a _CDN_ for an Application Load Balancer. As with an API gateway, content is not cached by default.

```yaml
resources:
  myLoadBalancer:
    type: application-load-balancer
    properties:
      # {start-highlight}
      cdn:
        enabled: true
      # {stop-highlight}
```