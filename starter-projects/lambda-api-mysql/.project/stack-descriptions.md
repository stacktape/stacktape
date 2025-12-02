### 1.1 HTTP API Gateway

API Gateway receives requests and routes them to the container.

For convenience, it has [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) allowed.

```yml
resources:
  mainApiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
```

### 1.2 MySQL relational database

The application data is stored in a MySQL database. The database is configured as follows:

- **Database credentials**. In this example, we input them directly. In production, you should use
  [secrets](https://docs.stacktape.com/resources/secrets/) to store them securely.

- **Engine type**. We are using `mysql` engine. It uses a single-node database server - the simplest and cheapest
  option.

- **Instance size**. We are using the `db.t3.micro` instance. It has 1 vCPU, 1GB of memory, and is free-tier eligible
  (~$12.5/month without a free tier). To see the full list of available options, refer to
  [AWS instance type list](https://aws.amazon.com/rds/instance-types/).

By default, the version used for the database is the latest AWS-supported stable version (currently `8.0.27`). Minor
version upgrades are done automatically.

You can also configure many other aspects of your database, such as
[storage](https://docs.stacktape.com/resources/relational-databases/#storage),
[logging](https://docs.stacktape.com/resources/relational-databases/#logging),
[read replicas](https://docs.stacktape.com/resources/relational-databases/#read-replicas), or
[failover instances](https://docs.stacktape.com/resources/relational-databases/#multi-az-mode).

```yml
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: my_secret_password
    engine:
      type: mysql
      properties:
        primaryInstance:
          instanceSize: db.t3.micro
```

### 1.3 Functions

The core of our application consists of two serverless functions:

- **savePost function** - saves post into database
- **getPosts function** - get all posts from the database

Functions are configured as follows:

- **Packaging** - determines how the lambda artifact is built. The easiest and most optimized way to build the lambda
  from Typescript/Javascript is using `stacktape-lambda-buildpack`. We only need to configure `entryfilePath`. Stacktape
  automatically transpiles and builds the application code with all of its dependencies, creates the lambda zip
  artifact, and uploads it to a pre-created S3 bucket on AWS. You can also use
  [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-lambda-functions).
- **ConnectTo list** - we are adding database `mainDatabase` into `connectTo` list. By doing this, Stacktape will
  automatically inject relevant environment variables into the function's runtime (such as the connection string
  required to connect to the database)
- **Events** - Events determine how is function triggered. In this case, we are triggering the function when an event
  (HTTP request) is delivered to the HTTP API gateway:

  - if URL path is `/posts` and HTTP method is `POST`, request is delivered to `savePost` function.
  - if URL path is `/posts` and HTTP method is `GET`, request is delivered to `getPosts` function.

  Event(request) including the request body is passed to the function handler as an argument.

```yml
savePost:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/lambdas/save-post.ts
      memory: 512
      connectTo:
        - mainDatabase
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: mainApiGateway
            path: /post
            method: POST

  getPosts:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/lambdas/get-posts.ts
      memory: 512
      connectTo:
        - mainDatabase
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: mainApiGateway
            path: /posts
            method: GET
```

## 2. Database migration hooks

To simplify database access and migrations, this project uses [Prisma](https://www.prisma.io/). If you're not familiar
with it, don't worry - it's very simple. [Prisma schema](https://www.prisma.io/docs/concepts/components/prisma-schema)
for this application is already configured at `prisma/schema.prisma` in the project directory.

### 2.1 Generate Prisma client

Prisma offers a database client that we can import into our code. To generate it, we use the `npx prisma generate`
command. To do it automatically every time before the stack is deployed, the command is saved as a
[script](https://docs.stacktape.com/configuration/scripts/) and then used inside a `beforeDeploy`
[hook](https://docs.stacktape.com/configuration/hooks/). We are also creating a hook to install dependencies when
deploying from CI.

```yml
# {start-highlight}
scripts:
  generatePrismaClient:
    executeCommand: npx prisma generate
# {stop-highlight}

# {start-highlight}
hooks:
  beforeDeploy:
    - executeNamedScript: generatePrismaClient
# {stop-highlight}
```

### 2.2 Prisma database migration

To sync our Prisma schema with the database, we need to use `npx prisma db push` command. We can't do this before the
database is created, so we use the `afterDeploy` hook.

We also need to pass the `STP_MAIN_DATABASE_CONNECTION_STRING` environment variable to the script. We do it using the
[$ResourceParam()](https://docs.stacktape.com/configuration/directives/#resource-param) directive that will
automatically download the connection string value and pass it to the script.

```yml
scripts:
  generatePrismaClient:
    executeCommand: npx prisma generate
  # {start-highlight}
  migrateDb:
    executeCommand: npx prisma db push --skip-generate
    environment:
      - name: STP_MAIN_DATABASE_CONNECTION_STRING
        value: $ResourceParam('mainDatabase', 'connectionString')
  # {stop-highlight}

hooks:
  beforeDeploy:
    - executeNamedScript: generatePrismaClient
  # {start-highlight}
  afterDeploy:
    - executeNamedScript: migrateDb
  # {stop-highlight}
```

You can also execute the migration script anytime using

```bash
stp script:run --scriptName migrateDb --stage <<previously-used-stage>> --region <<previously-used-region>>
```
