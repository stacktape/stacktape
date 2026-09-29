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

The Rust binary runs as a custom Lambda runtime (`provided.al2023`). The `buildpack` packaging compiles the crate with
`cargo-lambda` in Docker and packages the binary as the function's `bootstrap`. You don't need a local Rust toolchain.

- **Memory** is set to 256 MB - Rust is very memory-efficient.
- **Packaging** points `entryfilePath` at `src/main.rs`. Stacktape builds the crate from the nearest `Cargo.toml`.

```yml
api:
  type: function
  properties:
    packaging:
      type: buildpack
      properties:
        entryfilePath: src/main.rs
    memory: 256
    runtime: provided.al2023
```
