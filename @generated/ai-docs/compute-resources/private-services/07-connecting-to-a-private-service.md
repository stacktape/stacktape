# Connecting to a private service

Private services don't have public URLs. Instead, they have a private address in the format `host:port`.

- **`host`:** The resource name in lowercase (by default).
- **`port`:** `3000` by default, but can be customized using the [port](./25-port.md) property.

For a service named `privateApi`, the address would be `privateapi:3000`. You can connect to this address directly from other resources in your stack. Depending on your application's needs, you might have to prepend a protocol scheme, such as `http://privateapi:3000`.

```yaml
resources:
  publicService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 1
        memory: 1024
      environment:
        # injecting privateApi address
        - name: PRIVATE_ADDRESS
          value: $ResourceParam('privateApi', 'address')

  privateApi:
    type: private-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/private-api/main.ts
      resources:
        cpu: 1
        memory: 1024
```