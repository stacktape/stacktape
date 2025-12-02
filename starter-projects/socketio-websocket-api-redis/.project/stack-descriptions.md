### 1.1 Application load balancer

The application load balancer is responsible for maintaining and balancing websocket connections established between
clients and the containers.

If there are multiple containers(i.e your workload scales) load balancer distributes connections evenly among these
containers.

You can configure [more properties](https://docs.stacktape.com/resources/application-load-balancers/) on your load
balancer, including using custom domain names or enabling TLS. In this example, we are using the default setup.

```yml
resources:
  mainLoadBalancer:
    type: application-load-balancer
```

### 1.2 Upstash Redis database

The application uses Upstash serverless Redis database. It is used by
[Socket.IO adapter](https://socket.io/docs/v4/redis-adapter/) to synchronize when scaling to multiple Socket.IO
container instances.

In this example, we are configuring redis to use `tls`. You can also configure
[other properties](https://docs.stacktape.com/resources/upstash-redis-databases/) if desired.

```yml
redis:
  type: upstash-redis
  properties:
    enableTls: true
```

### 1.3 Container workload

Socket.IO server runs inside a container workload with a single container. The workload is configured as follows:

- [Container](https://docs.stacktape.com/compute-resources/multi-container-workloads/#containers). This container
  workload uses only a single container: `socketio-server`. The container is configured as follows:
  - **Packaging** - determines how the Docker container image is built. The easiest and most optimized way to build the
    image for a Typescript application is using `stacktape-image-buildpack`. We only need to configure `entryfilePath`.
    Stacktape automatically transpiles and builds the application code with all of its dependencies, builds the Docker
    image, and pushes it to a pre-created image repository on AWS. You can also use
    [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-multi-container-workloads).
  - **ConnectTo list** - we are adding redis database `redis` into `connectTo` list. By doing this, Stacktape will
    automatically inject relevant environment variables into the compute resource's runtime (such as redis connection
    url required for connecting to database)
  - Events that reach the container. Load balancer event is configured to forward all incoming connections with path
    `/`(used for load balancer healthcheck) or `/websockets*`(used for websocket connection) to the container's port
    `3000`.
- [Resources](https://docs.stacktape.com/compute-resources/multi-container-workloads#resources). Resources are shared
  between containers of container workload (in this case, we only have one container). The cheapest available resource
  configuration is `0.25` of virtual CPU and `512` MB of RAM.
- [Scaling](https://docs.stacktape.com/compute-resources/multi-container-workloads#scaling). For the purposes of this
  tutorial we are scaling the workload to two (parallel) instances, to showcase the "synchronization" through redis. I.e
  that all websocket clients receive messages even if they are connected to different containers.

```yml
websocketServer:
  type: multi-container-workload
  properties:
    resources:
      cpu: 0.25
      memory: 512
    connectTo:
      - redis
    containers:
      - name: socketio-server
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/server/index.ts
        environment:
          - name: PORT
            value: 3000

        events:
          - type: application-load-balancer
            properties:
              containerPort: 3000
              loadBalancerName: mainLoadBalancer
              priority: 2
              paths:
                - "/"
                - "/websockets*"
    scaling:
      minInstances: 2
      maxInstances: 2
```

## 2. Test script

To simplify testing of the websocket app, the stacktape config also contains `broadcastTest`
[script](https://docs.stacktape.com/configuration/scripts/).

The purpose of this script is to create multiple websocket client connections (connections are balanced between the 2
socket.io containers):

- One of the clients sends a message.
- After rest of the websockets receive the message, they gracefully disconnect and script exits.

```yml
scripts:
  broadcastTest:
    executeScript: scripts/broadcast-test.ts
    environment:
      - name: LOAD_BALANCER_DOMAIN
        value: $ResourceParam('loadBalancer', 'domain')
```

You can execute the test script after the deploy using

```bash
stp script:run --scriptName broadcastTet --stage <<previously-used-stage>> --region <<previously-used-region>>
```
