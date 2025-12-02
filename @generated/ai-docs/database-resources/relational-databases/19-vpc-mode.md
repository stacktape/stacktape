# VPC mode

The database can only be accessed from resources within the default _VPC_, such as functions, batch jobs, and container workloads. You can also whitelist specific IP addresses to allow access from the internet.

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
        accessibilityMode: vpc
      # {stop-highlight}

  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my/function.ts
      joinDefaultVpc: true
```