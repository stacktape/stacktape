# Events

Events route traffic from an integration to a specified port on your container.

### HTTP API event

Forwards requests from an [HTTP API Gateway](../../../other-resources/http-api-gateways.md).

```yaml
resources:
  myApiGateway:
    type: http-api-gateway

  myApp:
    type: multi-container-workload
    properties:
      containers:
        - name: api-container
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          # {start-highlight}
          events:
            - type: http-api-gateway
              properties:
                httpApiGatewayName: myApiGateway
                containerPort: 80
                path: '/my-path'
                method: GET
          # {stop-highlight}
      resources:
        cpu: 2
        memory: 2048
```

> Incoming `GET` requests to `/my-path` on `myApiGateway` are routed to port `80` of the `api-container`.

### Application Load Balancer event

Forwards requests from an [Application Load Balancer](../../../other-resources/application-load-balancers.md). This allows for advanced routing based on path, query parameters, headers, and more.

```yaml
resources:
  myLoadBalancer:
    type: application-load-balancer

  myApp:
    type: multi-container-workload
    properties:
      containers:
        - name: api-container
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          # {start-highlight}
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: myLoadBalancer
                containerPort: 80
                priority: 1
                paths: ['*']
          # {stop-highlight}
      resources:
        cpu: 2
        memory: 2048
```

### Network Load Balancer event

Forwards traffic from a [Network Load Balancer](../../../other-resources/network-load-balancers.md).

```yaml
resources:
  myLoadBalancer:
    type: 'network-load-balancer'
    properties:
      listeners:
        - port: 8080
          protocol: TLS

  myWorkload:
    type: 'multi-container-workload'
    properties:
      containers:
        - name: container1
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: containers/ts-container.ts
          # {start-highlight}
          events:
            - type: network-load-balancer
              properties:
                loadBalancerName: myLoadBalancer
                listenerPort: 8080
                containerPort: 8080
          # {stop-highlight}
      resources:
        cpu: 0.25
        memory: 512
```

### Internal port (workload-internal)

Opens a port for communication with other containers within the same workload.

```yaml
resources:
  myApiGateway:
    type: http-api-gateway

  myApp:
    type: multi-container-workload
    properties:
      containers:
        - name: frontend
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/frontend/index.ts
          dependsOn:
            - containerName: backend
              condition: START
          environment:
            - name: PORT
              value: 80
            - name: BACKEND_PORT
              value: 3000
          events:
            - type: http-api-gateway
              properties:
                httpApiGatewayName: myApiGateway
                containerPort: 80
                path: /my-path
                method: GET
        - name: backend
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/backend/index.ts
          environment:
            - name: PORT
              value: 3000
          # {start-highlight}
          events:
            - type: workload-internal
              properties:
                containerPort: 3000
          # {stop-highlight}
      resources:
        cpu: 2
        memory: 2048
```

### Private port (service-connect)

Opens a port for communication with other workloads in the same stack.

```yaml
resources:
  internalService:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/private/index.ts
          events:
            - type: service-connect
              properties:
                containerPort: 3000
      resources:
        cpu: 2
        memory: 2048

  publicService:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/public/index.ts
      resources:
        cpu: 2
        memory: 2048
```