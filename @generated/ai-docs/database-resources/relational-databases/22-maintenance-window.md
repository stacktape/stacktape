# Maintenance window

```yaml
resources:
  myDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: my_secret_password
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t3.micro
      # {start-highlight}
      preferredMaintenanceWindow: Sun:04:00-Sun:05:00
      # {stop-highlight}
```