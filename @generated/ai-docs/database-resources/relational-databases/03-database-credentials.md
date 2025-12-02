# Database credentials

You can configure the credentials for the database's master user. It's recommended to use a [secret](../../security-resources/secrets/index.md) to manage these credentials securely.

```yaml
resources:
  myRelationalDatabase:
    type: relational-database
    properties:
      # {start-highlight}
      credentials:
        masterUserName: $File('.env').DB_USER_NAME # OPTIONAL
        masterUserPassword: $Secret('dbCredentials.password')
      # {stop-highlight}
      engine:
        type: postgres
        properties:
          version: '16.2'
          port: 5432
          primaryInstance:
            instanceSize: db.t2.micro
```