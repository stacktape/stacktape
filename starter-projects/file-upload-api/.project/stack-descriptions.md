### 1.1 HTTP API Gateway

API Gateway receives HTTP requests and routes them to the Lambda function.

For convenience, it has [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) allowed.

```yml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
```

### 1.2 S3 Bucket

An S3 bucket for storing uploaded files. CORS is enabled so browsers can upload directly using presigned URLs.

```yml
filesBucket:
  type: bucket
  properties:
    cors:
      enabled: true
```

### 1.3 API Function

A Hono app that provides endpoints for file management:

- `GET /upload-url?filename=x` - generates a presigned PUT URL for direct browser-to-S3 upload
- `GET /download-url?key=x` - generates a presigned GET URL for downloading
- `GET /files` - lists all files in the bucket
- `DELETE /files/:key` - deletes a file

**ConnectTo** grants the function S3 read/write access and injects the bucket name as `STP_FILES_BUCKET_NAME`.

```yml
api:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/index.ts
    memory: 512
    connectTo:
      - filesBucket
    events:
      - type: http-api-gateway
        properties:
          httpApiGatewayName: apiGateway
          path: /
          method: '*'
      - type: http-api-gateway
        properties:
          httpApiGatewayName: apiGateway
          path: /{proxy+}
          method: '*'
```
