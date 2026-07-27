### 1.1 Web Service

Application runs in web-service resource and is configured as follows:

- **Packaging** - determines how the Docker container image is built. In this case, we are using
  `stacktape-image-buildpack`. We only need to configure `entryfilePath`. Stacktape automatically builds the application
  code with all of its dependencies, builds the Docker image, and pushes it to a pre-created image repository on AWS.
  You can also use
  [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-web-services).
- **ConnectTo list** - we are adding database `mainDatabase` into `connectTo` list. By doing this, Stacktape will
  automatically inject relevant environment variables into the container runtime (such as the connection string required
  to connect to the database)
- [Resources](https://docs.stacktape.com/compute-resources/web-services#resources). The cheapest available resource
  configuration is `0.25` of virtual CPU and `512` MB of RAM.
- For convenience, automatic CORS is enabled.

You can also configure [scaling](https://docs.stacktape.com/compute-resources/web-services#scaling). New (parallel)
container can be added when (for example) the utilization of your CPU or RAM gets larger than 80%. The traffic is evenly
distributed to all the containers.

```yml
resources:
  webService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: ./postsproject/asgi.py
          languageSpecificConfig:
            packageManagerFile: ./pyproject.toml
      resources:
        cpu: 0.25
        memory: 512
      connectTo:
        - mainDatabase
      cors:
        enabled: true
```

### 1.2 Postgres relational database

The application data is stored in a Postgres database. The database is configured as follows:

- **Database credentials**. In this example, we input them directly. In production, you should use
  [secrets](https://docs.stacktape.com/resources/secrets/) to store them securely.

- **Engine type**. We are using `postgres` engine. It uses a single-node database server - the simplest and cheapest
  option.

- **Instance size**. We are using the `db.t3.micro` instance. It has 1 vCPU, 1GB of memory, and is free-tier eligible
  (~$12.5/month without a free tier). To see the full list of available options, refer to
  [AWS instance type list](https://aws.amazon.com/rds/instance-types/).

By default, the version used for the database is the latest AWS-supported stable version (currently `13.4`). Minor
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
      type: postgres
      properties:
        primaryInstance:
          instanceSize: db.t3.micro
```

## 2. Database migration hooks

To handle database access and migrations, this project uses
[Django's](https://docs.djangoproject.com/en/4.0/topics/migrations/) built in capabilities.

To automatically perform migration after every deployment, the stacktape configuration contains a
[script](https://docs.stacktape.com/configuration/scripts/) and a
[hook](https://docs.stacktape.com/configuration/hooks/).

[Script](https://docs.stacktape.com/configuration/scripts/) specifies the command to be executed. To execute it
automatically every time before the stack is deployed, we reference it inside a
[hook](https://docs.stacktape.com/configuration/hooks/).

We also need to pass the `STP_MAIN_DATABASE_CONNECTION_STRING` environment variable to the script. We do it using the
[$ResourceParam()](https://docs.stacktape.com/configuration/directives/#resource-param) directive that will
automatically download the connection string value and pass it to the script.

```yml
scripts:
  migrateDb:
    executeCommand: uv run python manage.py makemigrations && uv run python manage.py migrate
    environment:
      - name: STP_MAIN_DATABASE_CONNECTION_STRING
        value: $ResourceParam('mainDatabase', 'connectionString')

hooks:
  - triggers: ["after:deploy"]
    scriptName: migrateDb
```

You can also execute the migration script anytime using

```bash
stp script:run --scriptName migrateDb --stage <<previously-used-stage>> --region <<previously-used-region>>
```
