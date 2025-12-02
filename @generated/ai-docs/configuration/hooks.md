# Hooks

Hooks allow you to execute a custom command or script before or after a specified Stacktape command.

Example use cases:

- Building, validating, or linting your application before deployment.
- Running unit tests before deployment.
- Executing database migrations after deployment.
- Cleaning up a database before deletion.

## How to use hooks

You can reference scripts defined in the [`scripts`](../../configuration/scripts.md) section of your `stacktape.yml` file within
a hook. Scripts can also be executed manually. For more information, see the
[scripts documentation](../../configuration/scripts.md).

```yaml
scripts:
  # {start-highlight}
  buildWeb:
    # {stop-highlight}
    type: local-script
    properties:
      executeCommand: npx gatsby build

hooks:
  beforeDeploy:
    # {start-highlight}
    - scriptName: buildWeb
    # {stop-highlight}
```

## Hookable events

### Before-command hooks

These hooks are executed before the specified command, but after the configuration has been successfully loaded.

### After-command hooks

These hooks are executed after the specified command has finished successfully. Common use cases for after-command hooks
include database migration or seeding, and API or endpoint testing.

```yaml
scripts:
  migrateDb:
    type: local-script-with-bastion-tunneling
    properties:
      executeScript: migrate.ts
      connectTo:
        - myDatabase

# {start-highlight}
hooks:
  afterDeploy:
    - scriptName: migrateDb
# {stop-highlight}

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