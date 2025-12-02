# Aurora Serverless V1 engine

The Aurora Serverless V1 engine is the previous generation of the serverless Aurora engine. It also provides automatic, usage-based scaling and can scale to zero, but it is less responsive than the V2 engine.

```yaml
resources:
  myDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('dbSecret.password')
      # {start-highlight}
      engine:
        type: aurora-postgresql-serverless
        properties:
          version: '13.12'
          minCapacity: 4
          maxCapacity: 8
          pauseAfterSeconds: 600
      # {stop-highlight}
```