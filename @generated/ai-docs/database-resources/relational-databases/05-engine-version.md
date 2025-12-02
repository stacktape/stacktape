# Engine version

You must choose a version that is compatible with your chosen engine.

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
          # {start-highlight}
          version: '16.2'
          # {stop-highlight}
          port: 5432
          primaryInstance:
            instanceSize: db.t3.micro
```

### Available versions