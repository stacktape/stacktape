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

### 1.2 MongoDB Atlas cluster

The application data is stored in an Atlas MongoDB cluster.

Only the cluster tier needs to be configured in a minimal setup. You can also configure
[other properties](https://docs.stacktape.com/3rd-party-resources/mongo-db-atlas-clusters/) if desired.

```yml
mongoDbCluster:
  type: mongo-db-atlas-cluster
  properties:
    clusterTier: M2
```

### 1.3 Functions

The core of our application consists of two serverless functions:

- **savePost function** - saves post into database(MongoDB)
- **getPosts function** - get all posts from the database(MongoDB)

Functions are configured as follows:

- **Packaging** - determines how the lambda artifact is built. The easiest and most optimized way to build the lambda
  from Typescript/Javascript is using `stacktape-lambda-buildpack`. We only need to configure `entryfilePath`. Stacktape
  automatically transpiles and builds the application code with all of its dependencies, creates the lambda zip
  artifact, and uploads it to a pre-created S3 bucket on AWS. You can also use
  [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-lambda-functions).
- **ConnectTo list** - we are adding the mongo cluster `mongoDbCluster` into `connectTo` list. By doing this, Stacktape
  will automatically setup secure access to the cluster associated with the function's role as well as inject relevant
  environment variables into the function's runtime (such as connection string needed for connecting).
- **Events** - Events determine how is function triggered. In this case, we are triggering the function when an event
  (HTTP request) is delivered to the HTTP API gateway:

  - if URL path is `/posts` and HTTP method is `POST`, request is delivered to `savePost` function.
  - if URL path is `/posts` and HTTP method is `GET`, request is delivered to `getPosts` function.

  The event(request) including the request body is passed to the function handler as an argument.

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
      - mongoDbCluster
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
      - mongoDbCluster
    events:
      - type: http-api-gateway
        properties:
          httpApiGatewayName: mainApiGateway
          path: /posts
          method: GET
```
