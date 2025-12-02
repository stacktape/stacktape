# Referencing secrets

You can reference secrets in your configuration using the [`$Secret()` directive](../../configuration/directives/.md).

```yaml
resources:
  myDatabase:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql-serverless
      credentials:
        # {start-highlight}
        # using a simple string as a secret value, e.g. "my-password"
        masterUserName: $Secret('masterUserName')
        # using an object as a secret value, e.g. "{ password: "my-password" }"
        masterUserPassword: $Secret('databaseCredentials.password')
        # {stop-highlight}
```