### 1. Web Service (prebuilt-image)

The `app` resource runs any public Docker image as a managed
[web service](https://docs.stacktape.com/compute-resources/web-services/) using the `prebuilt-image` packaging type — no
Dockerfile needed.

To self-host a different tool, swap the `image` property:

```yml
resources:
  app:
    type: web-service
    properties:
      packaging:
        type: prebuilt-image
        properties:
          # Change this to any Docker image:
          #   plausible/analytics:v2.1
          #   metabase/metabase:latest
          #   n8nio/n8n:latest
          image: louislam/uptime-kuma:1
```

### 2. CPU & Memory

Resource allocation is configured with `resources`. Increase these values for heavier workloads:

```yml
resources:
  cpu: 0.5
  memory: 1024
```

### 3. Environment variables

Pass runtime configuration to your container using `environment`. Adjust these to match the image you are deploying:

```yml
environment:
  - name: UPTIME_KUMA_PORT
    value: "3000"
```

### 4. PostgreSQL database (optional)

A [relational database](https://docs.stacktape.com/resources/relational-databases/) section is included but commented
out. Uncomment it to provision a managed PostgreSQL instance and connect it to the web service using `connectTo`:

```yml
# database:
#   type: relational-database
#   properties:
#     credentials:
#       masterUserPassword: $Secret('db-password', 'my_secret_password')
#     engine:
#       type: postgres
#       properties:
#         version: '16.6'
#         primaryInstance:
#           instanceSize: db.t3.micro
```

When uncommented, also uncomment the `connectTo` section on the web service so it can reach the database. Connection
details (host, port, credentials) are automatically injected as environment variables.
