# Managed rule groups

Managed rule groups are sets of rules maintained by AWS or third-party vendors. They are regularly updated to protect against the latest threats.

While rule groups managed by AWS are typically free, some third-party vendors may charge for their rule groups.

```yaml
resources:
  regionalFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      # {start-highlight}
      rules:
        - type: managed-rule-group
          properties:
            name: AWSManagedRulesCommonRuleSet
            vendorName: AWS
            priority: 0
        # {stop-highlight}
```

> An example of a reference to a managed rule group.