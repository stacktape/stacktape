# Whitelisted IPs only mode

The database can only be accessed from the IP addresses and CIDR blocks in the `whitelistedIps` list.

```yaml
resources:
  myDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('dbPassword')
      engine:
        type: aurora-postgresql
        properties:
          version: '16.2'
          instances:
            - instanceSize: db.t3.medium
          port: 5432
      # {start-highlight}
      accessibility:
        accessibilityMode: whitelisted-ips-only
        whitelistedIps:
          - '147.25.33.12'
      # {stop-highlight}
```