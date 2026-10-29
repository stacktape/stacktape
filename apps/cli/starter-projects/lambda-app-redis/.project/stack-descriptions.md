### 1.1 HTTP API Gateway

API Gateway receives requests and routes them to the Lambda function.

For convenience, it has [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) allowed.

```yml
resources:
  mainApiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
```

### 1.2 Redis cache

The application uses an AWS ElastiCache Valkey Serverless cache (Redis-compatible) for key-value storage. It scales
automatically and is billed per GB stored and per request.

The password is auto-generated using a `$Secret` directive. You can also configure
[other properties](https://docs.stacktape.com/resources/databases/redis/) if desired.

```yml
redis:
  type: redis
  properties:
    defaultUserPassword: $Secret('redis.password')
    engine:
      type: valkey-serverless
```

### 1.3 Function

The application itself is fairly simple. It consists of a single lambda function `storeKeyValuePair` that stores a value
inside our Redis cache.

The function is configured as follows:

- **Packaging** - determines how the lambda artifact is built. The easiest and most optimized way to build the lambda
  from Typescript/Javascript is using `js-bundle`. We only need to configure `entryfilePath`. Stacktape
  automatically transpiles and builds the application code with all of its dependencies, creates the lambda zip
  artifact, and uploads it to a pre-created S3 bucket on AWS. You can also use
  [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-lambda-functions).
- **VPC** - the function is connected to the default VPC (`joinDefaultVpc: true`) so it can reach the Redis cache
  inside the VPC.
- **ConnectTo list** - we are adding the Redis cache `redis` into `connectTo` list. By doing this, Stacktape will
  automatically inject relevant environment variables into the function's runtime (such as redis connection string
  required for connecting to the cache).
- **Events** - Events determine how is function triggered. In this case, we are triggering the function when an event
  (HTTP request) is delivered to the HTTP API gateway to URL path `/save/{key}/{value}`, where `{key}` and `${value}`
  are path parameters(key and value can be arbitrary values). The event(request) including the path parameters is passed
  to the function handler as an argument.

```yml
storeKeyValuePair:
  type: function
  properties:
    packaging:
      type: js-bundle
      properties:
        entryfilePath: ./src/store-key-value-pair.ts
    connectTo:
      - redis
    events:
      - type: http-api-gateway
        properties:
          httpApiGatewayName: mainApiGateway
          method: GET
          path: /save/{key}/{value}
```
