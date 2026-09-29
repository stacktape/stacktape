### 1.1 Web Service

The FastAPI app runs as an ASGI web service using `buildpack` packaging.

- **Packaging** - `buildpack` detects the Python project from `pyproject.toml` and `uv.lock` and builds a container.
  `startCommand` runs the app with uvicorn on the port Stacktape provides in `PORT`.
- **connectTo** - connects to the Postgres database, injecting `STP_MAIN_DATABASE_CONNECTION_STRING` env var.

```yml
resources:
  webService:
    type: web-service
    properties:
      packaging:
        type: buildpack
        properties:
          startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
      resources:
        cpu: 0.25
        memory: 512
      connectTo:
        - mainDatabase
      cors:
        enabled: true
```

### 1.2 Postgres Database

```yml
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserPassword: my_secret_password
    engine:
      type: postgres
      properties:
        version: "18.1"
        primaryInstance:
          instanceSize: db.t3.micro
```
