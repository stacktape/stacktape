# Aurora engine

The Aurora engine is a fully managed, AWS-developed database engine that offers clustering, high availability, and increased performance. It replicates storage six ways across three _Availability Zones_ and automatically load-balances read operations between nodes. If a primary instance fails, a read replica is automatically promoted to take its place.

```yaml
resources:
  auroraSlsPostgres:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('dbSecret.password')
      # {start-highlight}
      engine:
        type: aurora-postgresql
        properties:
          version: '16.2'
          instances:
            - instanceSize: db.t3.medium
          port: 5432
      # {stop-highlight}
```