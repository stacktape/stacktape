# Firewall

You can protect your _CDN_ with a web application firewall.

To learn more, see the [Web Application Firewall](../../security-resources/web-app-firewalls//index.md) documentation.

```yaml
resources:
  # {start-highlight}
  myFirewall:
    type: web-app-firewall
    properties:
      scope: cdn
  # {stop-highlight}
  myApiGateway:
    type: http-api-gateway
    properties:
      cdn:
        enabled: true
        # {start-highlight}
        useFirewall: myFirewall
        # {stop-highlight}
```