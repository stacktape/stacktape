# Integrating with compute resources

You can forward requests from an API gateway to your compute resources by creating an event integration on a **multi-container workload**, **function**, or **batch job**.

Each integration must specify:

- **`httpApiGatewayName`**: The name of the API gateway.
- **`path`**: A path pattern that the request must match.
- **`method`**: The HTTP method that the request must match.

If multiple integrations match a request, the most specific one is chosen.

This example shows two integrations:

-   The first forwards all requests (`/{proxy+}`) to a multi-container workload.
-   The second, which is more specific, forwards `GET` requests for `/invoke-my-function` to a Lambda function.

```yaml
resources:
  myHttpApi:
    type: http-api-gateway

  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: 'path/to/my-lambda.ts'
      # {start-highlight}
      events:
        - type: http-api-gateway
          properties:
            httpApiGatewayName: 'myHttpApi'
            path: '/invoke-my-function'
            method: 'GET'
      # {stop-highlight}

  mySingleContainer:
    type: 'multi-container-workload'
    properties:
      containers:
        - name: 'myAppContainer'
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: '_example-configs/containers/ts-container.ts'
          environment:
            - name: port
              value: 80
          # {start-highlight}
          events:
            - type: 'http-api-gateway'
              properties:
                httpApiGatewayName: 'myHttpApi'
                containerPort: 80
                path: /{proxy+} # greedy path
                method: '*'
          # {stop-highlight}
      resources:
        cpu: 0.25
        memory: 512
```

> An HTTP API Gateway with integrations for both a function and a multi-container workload.

For more information, see the documentation on integrating API gateways with [functions](../../compute-resources/functions//index.md) and [multi-container workloads](../../compute-resources/multi-container-workloads/index.md).