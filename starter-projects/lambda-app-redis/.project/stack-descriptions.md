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

### 1.2 Upstash Redis database

The application uses Upstash serverless Redis database.

In this example, we are configuring database to use `tls`. You can also configure
[other properties](https://docs.stacktape.com/resources/upstash-redis-databases/) if desired.

```yml
redis:
  type: upstash-redis
  properties:
    enableTls: true
```

### 1.3 Function

The application itself is fairly simple. It consists of a single lambda function `storeKeyValuePair` that stores a value
inside our Redis database.

The function is configured as follows:

- **Packaging** - determines how the lambda artifact is built. The easiest and most optimized way to build the lambda
  from Typescript/Javascript is using `stacktape-lambda-buildpack`. We only need to configure `entryfilePath`. Stacktape
  automatically transpiles and builds the application code with all of its dependencies, creates the lambda zip
  artifact, and uploads it to a pre-created S3 bucket on AWS. You can also use
  [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-lambda-functions).
- **ConnectTo list** - we are adding redis database `redis` into `connectTo` list. By doing this, Stacktape will
  automatically inject relevant environment variables into the function's runtime (such as redis connection url required
  for connecting to database)
- **Events** - Events determine how is function triggered. In this case, we are triggering the function when an event
  (HTTP request) is delivered to the HTTP API gateway to URL path `/save/{key}/{value}`, where `{key}` and `${value}`
  are path parameters(key and value can be arbitrary values). The event(request) including the path parameters is passed
  to the function handler as an argument.

```yml
storeKeyValuePair:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/store-key-value-pair.ts
    connectTo:
      - redis
    events:
      - type: http-api-gateway
        properties:
          httpApiGatewayName: gateway
          method: GET
          path: /save/{key}/{value}
```
