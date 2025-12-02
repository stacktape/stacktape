# Aurora Serverless V2 engine

The Aurora Serverless V2 engine is similar to the standard Aurora engine but adds automatic, usage-based scaling. It's more responsive and less disruptive when scaling than the V1 engine. The database can scale down to zero, so you don't pay for compute capacity when it's not in use.

Scaling is measured in Aurora Capacity Units (ACUs), where each ACU provides approximately 2GB of RAM and one virtual CPU.

```yaml
resources:
  myDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('dbSecret.password')
      # {start-highlight}
      engine:
        type: aurora-postgresql-serverless-v2
        properties:
          version: '16.4'
          maxCapacity: 8
      # {stop-highlight}
```