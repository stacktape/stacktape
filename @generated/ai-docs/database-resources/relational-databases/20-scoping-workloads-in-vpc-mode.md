# Scoping workloads in VPC mode

This mode is similar to VPC mode but more restrictive. In addition to being in the same _VPC_, a resource must explicitly list the database in its `connectTo` property to gain access.

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
        accessibilityMode: scoping-workloads-in-vpc
      # {stop-highlight}
  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my/function.ts
      joinDefaultVpc: true
      # {start-highlight}
      connectTo:
        - myDatabase
      # {stop-highlight}
```