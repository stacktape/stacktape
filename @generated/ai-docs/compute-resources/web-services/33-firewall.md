# Firewall

You can protect your web service with a web application firewall (WAF).

To learn more, see the [Web Application Firewall](../../security-resources/web-app-firewalls//index.md) documentation.

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
          entryfilePath: src/main.ts
      resources:
        cpu: 2
        memory: 2048
      # {start-highlight}
      useFirewall: myFirewall
      # {stop-highlight}
```