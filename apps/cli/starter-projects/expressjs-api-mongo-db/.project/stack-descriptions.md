### 1.1 Web Service

Application runs in web-service resource and is configured as follows:

- **Packaging** - determines how the Docker container image is built. The easiest and most optimized way to build the
  image for a Typescript application is using `stacktape-image-buildpack`. We only need to configure `entryfilePath`.
  Stacktape automatically transpiles and builds the application code with all of its dependencies, builds the Docker
  image, and pushes it to a pre-created image repository on AWS. You can also use
  [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-web-services).
- **ConnectTo list** - we are adding database `mainDatabase` into `connectTo` list. By doing this, Stacktape will
  automatically inject relevant environment variables into the container runtime (such as the connection string required
  to connect to the database)
- [Resources](https://docs.stacktape.com/compute-resources/web-services#resources). The cheapest available resource
  configuration is `0.25` of virtual CPU and `512` MB of RAM.
- For convenience, automatic CORS is enabled.

You can also configure [scaling](https://docs.stacktape.com/compute-resources/web-services#scaling). New (parallel)
container can be added when (for example) the utilization of your CPU or RAM gets larger than 80%. The traffic is evenly
distributed to all the containers.

```yml
resources:
  webService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: ./src/index.ts
      resources:
        cpu: 0.25
        memory: 512
      connectTo:
        - mainDatabase
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
