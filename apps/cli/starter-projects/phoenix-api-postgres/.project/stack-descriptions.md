### 1.1 Web Service

The Phoenix API runs in a Docker container with a multi-stage build for small image size.

```yml
resources:
  webService:
    type: web-service
    properties:
      packaging:
        type: custom-dockerfile
        properties:
          dockerfilePath: ./Dockerfile
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
