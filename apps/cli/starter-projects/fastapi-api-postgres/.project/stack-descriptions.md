### 1.1 Web Service

The FastAPI app runs as an ASGI web service using `stacktape-image-buildpack`.

- **Packaging** - `stacktape-image-buildpack` automatically detects the Python project and builds a container. The
  `runAppAs: ASGI` option configures uvicorn as the ASGI server.
- **connectTo** - connects to the Postgres database, injecting `STP_MAIN_DATABASE_CONNECTION_STRING` env var.

```yml
resources:
  webService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: ./app/main.py:app
          languageSpecificConfig:
            packageManagerFile: pyproject.toml
            runAppAs: ASGI
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
