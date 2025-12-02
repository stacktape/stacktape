# Tunnel example

```yaml
resources:
  myBastion:
    type: bastion

  myDatabase:
    type: relational-database
    properties:
      # database is only accessible from withing VPC
      accessibility:
        accessibilityMode: vpc
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t3.micro
      credentials:
        masterUserPassword: my_secret_pass
```

> A bastion server with a database that is only accessible within the _VPC_.

To create a tunnel to the database, you would run:

```bash
stacktape bastion:tunnel --stage <<stage>> --bastionResource myBastion --resourceName myDatabase
```