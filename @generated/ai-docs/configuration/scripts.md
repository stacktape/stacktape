# Scripts

Scripts allow you to define custom commands that can be executed as part of your workflow. They can be used to perform a variety of tasks, such as building your application, running database migrations, or sending notifications.

```yml
scripts:
  # {start-highlight}
  buildWeb:
    type: local-script
    properties:
      executeCommand: npx gatsby build
  # {stop-highlight}

hooks:
  beforeDeploy:
    - scriptName: buildWeb
```

## Local script

A local script is executed on the same machine where the Stacktape command is run.

*   The script must define one of the following properties: `executeCommand`, `executeScript`, `executeCommands`, or `executeScripts`.
*   You can use the `connectTo` property to list the resources that your script needs to access. Stacktape will automatically inject the necessary environment variables for connecting to those resources. For more information, see [Connecting to resources](#connecting-to-resources).

### executeCommand

```yml
scripts:
  # {start-highlight}
  buildWeb:
    type: local-script
    properties:
      executeCommand: npx gatsby build
  # {stop-highlight}
```

### executeScript

```yml
scripts:
  # {start-highlight}
  sendSlackNotification:
    type: local-script
    properties:
      executeScript: scripts/send-slack-notification.ts
  # {stop-highlight}
```

```ts
import { WebClient } from "@slack/web-api";

const token = "my-access-token";
const conversationId = "my-conversation-id";
const slackClient = new WebClient(token);
const errorData = JSON.parse(process.env.STP_ERROR);

(async () => {
  await slackClient.chat.postMessage({
    channel: conversationId,
    text: errorData.message
  });
})();
```

### executeCommands

```yml
scripts:
  # {start-highlight}
  buildWeb:
    type: local-script
    properties:
      executeCommands:
        - poetry run python manage.py makemigrations
        - poetry run python manage.py migrate
  # {stop-highlight}
```

### executeScripts

```yml
scripts:
  # {start-highlight}
  sendSlackNotification:
    type: local-script
    properties:
      executeScripts:
        - scripts/run-migration.ts
        - scripts/send-slack-notification.ts
  # {stop-highlight}
```

## Local script with bastion tunneling

A local script with bastion tunneling is executed in the same way as a regular local script, but connections to the resources listed in the `connectTo` property are tunneled through a _bastion_ server.

*   This provides a secure, encrypted connection to your resources.
*   It allows you to connect to resources that do not have a public endpoint and are only accessible within the stack's [default VPC](../../user-guides/vpcs.md), such as a private `relational-database` or `redis-cluster`.
*   The environment variables injected by the `connectTo` property are automatically adjusted to use the tunneled endpoints.

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

```typescript
import { DbClient } from './db';

// using environment variable which was automatically injected thanks to connectTo property
// injected environment variables are using tunneled endpoint
const databaseConnectionString = process.env.STP_MY_DATABASE_CONNECTION_STRING;

const client = new DbClient({ connectionString: databaseConnectionString });

// perform migrations with the client

client.close();
```

## Bastion script

A bastion script is executed remotely on a _bastion_ server.

*   Logs from the script's execution are streamed in real-time to your local machine.
*   This provides a unified way to execute a set of commands from anywhere.
*   You can use the `connectTo` property to list the resources that your script needs to access. Stacktape will automatically inject the necessary environment variables for connecting to those resources. For more information, see [Connecting to resources](#connecting-to-resources).

```yaml
scripts:
  # {start-highlight}
  dbScript:
    type: bastion-script
    properties:
      executeCommands:
        - psql $STP_MY_DATABASE_CONNECTION_STRING -c "SELECT 1 where 1=1"
      connectTo:
        - myDatabase
  # {stop-highlight}

hooks:
  afterDeploy:
    - scriptName: dbScript

resources:
  myBastion:
    type: bastion
    properties:
      runCommandsAtLaunch:
        - yum update
        - yum install postgresql.x86_64 -y

  myDatabase:
    type: relational-database
    properties:
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

## Connecting to resources

```yml
scripts:
  dbScript:
    type: local-script
    properties:
      # The $STP_MY_DATABASE_CONNECTION_STRING environment variable is injected by connectTo
      executeCommands:
        - psql $STP_MY_DATABASE_CONNECTION_STRING -c "SELECT * FROM users"
      # {start-highlight}
      connectTo:
        - myDatabase
      # {stop-highlight}

resources:
  myDatabase:
    type: relational-database
    properties:
      engine:
        type: postgres
        properties:
          primaryInstance:
            instanceSize: db.t3.micro
```

## How to execute a script

A script can be executed in two ways:

*   Using the [`script:run`](../../cli/commands/script-run.md) command:

    ```bash
    stacktape script:run --scriptName <<scriptName>> --stage <<stage>>
    ```

*   Inside a [hook](../../configuration/hooks.md).

## Environment variables

```yml
scripts:
  migrateDb:
    executeScript: scripts/migrate-db.ts
    environment:
      # {start-highlight}
      - name: DB_CONNECTION_STRING
        value: $ResourceParam('mainDatabase', 'connectionString')
      # {stop-highlight}

resources:
  mainDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: my_secret_password
      engine:
        type: mysql
        properties:
          primaryInstance:
            instanceSize: db.t2.micro
```

## Permissions

You can use the `assumeRoleOfResource` property to grant a script the same AWS permissions as a specific resource.

```yml
scripts:
  seedDb:
    executeScript: scripts/seed-db.ts
    # {start-highlight}
    assumeRoleOfResource: myFunction
    # {stop-highlight}
    environment:
      - name: TABLE_NAME
        value: $ResourceParam('dynamoTable', 'name')

resources:
  dynamoTable:
    type: dynamo-db-table

  myFunction:
    type: function
    properties:
      allowAccessTo:
        - dynamoTable
```

## API reference