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

### 1.2 Rust Lambda Function

The Rust binary runs as a custom Lambda runtime (`provided.al2023`). The binary is built locally using `cargo-lambda`
and packaged as a zip artifact.

- **Memory** is set to 256 MB - Rust is very memory-efficient.
- **Build** uses `cargo lambda build` in the `beforeDeploy` hook.

```yml
api:
  type: function
  properties:
    packaging:
      type: custom-artifact
      properties:
        packagePath: ./target/lambda/rust-lambda-api/bootstrap.zip
    memory: 256
    runtime: provided.al2023
```
