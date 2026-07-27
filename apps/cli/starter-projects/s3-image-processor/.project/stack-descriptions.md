### 1.1 HTTP API Gateway

API Gateway receives HTTP requests and routes them to the API function.

[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) is enabled for convenience.

```yml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
```

### 1.2 S3 Bucket

Stores uploaded and processed images. CORS is enabled so browsers can upload directly via presigned URLs.

```yml
imagesBucket:
  type: bucket
  properties:
    cors:
      enabled: true
```

### 1.3 Process Image Function

Triggered automatically when a file is uploaded to the `uploads/` prefix in the S3 bucket. Reads the uploaded image,
resizes it to three sizes (150px thumbnail, 600px medium, 1200px large) using sharp, and saves the results to the
`processed/` prefix.

- **Memory** - 1024 MB to handle image processing with sharp.
- **Timeout** - 60 seconds for large images.
- **ConnectTo** - grants S3 read/write access and injects `STP_IMAGES_BUCKET_NAME`.
- **Events** - S3 `ObjectCreated` event filtered to the `uploads/` prefix.

```yml
processImage:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/process-image.ts
    memory: 1024
    timeout: 60
    connectTo:
      - imagesBucket
    events:
      - type: s3
        properties:
          bucketArn: $ResourceParam('imagesBucket', 'arn')
          s3EventType: "s3:ObjectCreated:*"
          filterRule:
            prefix: uploads/
```

### 1.4 API Function

Hono-based HTTP API for generating presigned upload URLs, listing processed images, and generating download URLs.

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
      - imagesBucket
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
