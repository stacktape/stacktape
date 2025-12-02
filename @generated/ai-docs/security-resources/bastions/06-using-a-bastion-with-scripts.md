# Using a bastion with scripts

You can also use bastion servers with scripts. For more information, see the documentation on [bastion scripts](../../configuration/scripts/.md) and [local scripts with bastion tunneling](../../configuration/scripts/.md).

```yaml
scripts:
  # {start-highlight}
  migrateDb:
    type: local-script-with-bastion-tunneling
    properties:
      executeScript: migrate.ts
      connectTo:
        - myDatabase
  # {stop-highlight}

hooks:
  afterDeploy:
    - scriptName: migrateDb

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

> A Stacktape configuration that uses a bastion tunnel for a migration script.