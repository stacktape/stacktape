# Rate-based rules

Rate-based rules track the number of requests from each originating IP address and trigger an action if the rate exceeds a specified limit within a five-minute period. This is useful for temporarily blocking IP addresses that are sending excessive requests.

You can aggregate requests based on the client's IP address or a forwarded IP address from a proxy or load balancer.

```yaml
resources:
  regionalFirewall:
    type: web-app-firewall
    properties:
      scope: regional
      # {start-highlight}
      rules:
        - type: rate-based-rule
          properties:
            name: RateRule
            limit: 100
            aggregateBasedOn: IP
            priority: 0
        # {stop-highlight}
```

> An example of a rate-based rule.