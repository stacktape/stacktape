# RDS engine

The RDS engine is the default, single-node, and most cost-effective option. While it's not highly available by default, you can configure a standby instance in a different _Availability Zone_ or add read replicas to improve performance and resilience.

### Instance size

You can configure the instance size for both the primary instance and its read replicas.

```yaml
resources:
  myDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('dbPassword')
      engine:
        type: postgres
        properties:
          version: '16.2'
          port: 5432
          primaryInstance:
            # {start-highlight}
            instanceSize: db.t3.micro
          # {stop-highlight}
```

### Multi-AZ mode

You can enable Multi-AZ mode for both primary instances and read replicas.

```yaml
resources:
  myDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('dbPassword')
      engine:
        type: postgres
        properties:
          version: '16.2'
          port: 5432
          primaryInstance:
            instanceSize: db.t2.micro
            # {start-highlight}
            multiAz: true
            # {stop-highlight}
```

### Read replicas

```yaml
resources:
  myDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('dbPassword')
      engine:
        type: postgres
        properties:
          version: '16.2'
          port: 5432
          primaryInstance:
            instanceSize: db.t3.micro
          # {start-highlight}
          readReplicas:
            - instanceSize: db.t3.micro
            - instanceSize: db.t3.micro
          # {stop-highlight}
```

### Storage

```yaml
resources:
  myDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('dbPassword')
      engine:
        type: postgres
        properties:
          version: '16.2'
          port: 5432
          primaryInstance:
            instanceSize: db.t3.micro
          # {start-highlight}
          storage:
            initialSize: 40
            maxSize: 400
          # {stop-highlight}
```