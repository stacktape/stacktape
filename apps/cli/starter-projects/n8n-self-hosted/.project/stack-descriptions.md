### 1.1 Web Service (n8n)

The n8n application runs in a web-service resource using a pre-built Docker image from the official n8n registry:

- **Packaging** — uses `prebuilt-image` with `docker.n8n.io/n8nio/n8n:latest`. No build step is needed; Stacktape pulls
  the image directly.
- **Resources** — 1 vCPU and 2048 MB of RAM. n8n can be memory-intensive when running complex workflows.
- **ConnectTo** — the `database` resource is listed in `connectTo`. This grants the web service network access to the
  database and automatically injects connection parameters (e.g. `STP_DATABASE_HOST`, `STP_DATABASE_PORT`) as
  environment variables.
- **Environment variables** — n8n is configured to use PostgreSQL via `DB_TYPE`, `DB_POSTGRESDB_HOST`,
  `DB_POSTGRESDB_PORT`, `DB_POSTGRESDB_DATABASE`, `DB_POSTGRESDB_USER`, and `DB_POSTGRESDB_PASSWORD`. The host, port,
  and database name are resolved at deploy time using the
  [`$ResourceParam()`](https://docs.stacktape.com/configuration/directives/#resource-param) directive. `N8N_PORT` is set
  to `3000` to match the container port Stacktape expects. `N8N_SECURE_COOKIE` is set to `false` because TLS is
  terminated at the load balancer.

```yml
n8n:
  type: web-service
  properties:
    packaging:
      type: prebuilt-image
      properties:
        image: docker.n8n.io/n8nio/n8n:latest
    resources:
      cpu: 1
      memory: 2048
    connectTo:
      - database
    environment:
      - name: DB_TYPE
        value: postgresdb
      - name: DB_POSTGRESDB_HOST
        value: $ResourceParam('database', 'host')
      - name: DB_POSTGRESDB_PORT
        value: $ResourceParam('database', 'port')
      - name: DB_POSTGRESDB_DATABASE
        value: $ResourceParam('database', 'dbName')
      - name: DB_POSTGRESDB_USER
        value: db_master_user
      - name: DB_POSTGRESDB_PASSWORD
        value: $Secret('db-password', 'my_secret_password')
      - name: N8N_PORT
        value: "3000"
      - name: N8N_SECURE_COOKIE
        value: "false"
```

### 1.2 PostgreSQL Database

Workflow data, credentials, and execution history are stored in a PostgreSQL database:

- **Engine** — PostgreSQL 16.6 running on a `db.t3.micro` instance (1 vCPU, 1 GB RAM, free-tier eligible).
- **Credentials** — the master password is stored using a
  [`$Secret`](https://docs.stacktape.com/configuration/directives/#secret) directive. On first deploy, it uses the
  default value `my_secret_password`. You should change it to a strong password using
  `stp secret:create --name db-password --value '<your-password>'`.

```yml
database:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: $Secret('db-password', 'my_secret_password')
    engine:
      type: postgres
      properties:
        version: "16.6"
        primaryInstance:
          instanceSize: db.t3.micro
```
