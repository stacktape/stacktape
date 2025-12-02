# Firewall

You can protect your user pool with a web application firewall.

To learn more, see the [Web Application Firewall](../../security-resources/web-app-firewalls//index.md) documentation.

```yaml
resources:
  # {start-highlight}
  myFirewall:
    type: web-app-firewall
    properties:
      scope: regional
  # {stop-highlight}
  myUserPool:
    type: user-auth-pool
    properties:
      userVerificationType: email-code
      passwordPolicy:
        minimumLength: 8
      # {start-highlight}
      useFirewall: myFirewall
      # {stop-highlight}
```