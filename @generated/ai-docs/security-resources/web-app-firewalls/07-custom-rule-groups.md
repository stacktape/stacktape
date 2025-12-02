# Custom rule groups

You can create your own custom rule groups to use across multiple applications. To use an existing custom rule group, you just need to provide its _ARN_.

```yaml
resources:
  regionalFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      # {start-highlight}
      rules:
        - type: custom-rule-group
          properties:
            name: CustomRuleGroup
            arn: <<ARN of existing rule group>>
            priority: 0
        # {stop-highlight}
```

> An example of a reference to a custom rule group.