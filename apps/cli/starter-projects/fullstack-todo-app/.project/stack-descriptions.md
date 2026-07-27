### 1.1 HTTP API Gateway

API Gateway receives HTTP requests and routes them to the Lambda function.

```yml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
```

### 1.2 DynamoDB Table

Stores todo items with their completion status.

```yml
todosTable:
  type: dynamo-db-table
  properties:
    primaryKey:
      partitionKey:
        name: id
        type: string
```

### 1.3 API Function

A Hono app with full CRUD:

- `GET /todos` - list all todos
- `POST /todos` - create a todo
- `PUT /todos/:id` - update title or completion status
- `DELETE /todos/:id` - delete a todo

```yml
api:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/index.ts
    connectTo:
      - todosTable
```

### 1.4 Frontend (Hosting Bucket)

A static website hosted on S3 + CloudFront CDN. No build step needed — just plain HTML and JavaScript.

The `injectEnvironment` property makes the API Gateway URL available to the frontend JavaScript as
`window.STP_INJECTED_ENV.API_URL`. This lets the frontend call the API without hardcoding URLs.

```yml
frontend:
  type: hosting-bucket
  properties:
    uploadDirectoryPath: ./public
    hostingContentType: single-page-app
    injectEnvironment:
      - name: API_URL
        value: $ResourceParam('apiGateway', 'url')
```
