# Using a firewall

You can protect your ALB with a web application firewall (WAF).

To learn more, see the [Web Application Firewall](../../security-resources/web-app-firewalls//index.md) documentation.

```yaml
resources:
  # {start-highlight}
  myFirewall:
    type: web-app-firewall
    properties:
      scope: regional
  # {stop-highlight}
  myLoadBalancer:
    type: 'application-load-balancer'
    properties:
      # {start-highlight}
      useFirewall: myFirewall
      # {stop-highlight}
```