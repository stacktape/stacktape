# Accessing clusters from workloads

You can grant a compute resource permission to access a cluster by listing it in the resource's `connectTo` property. This will inject the necessary credentials into the resource.

```yaml
# {start-ignore}
providerConfig:
  mongoDbAtlas:
    privateKey: 'xxxxfa523543fxxxx42543xx'
    publicKey: 'xxxxxxx'
    organizationId: 'xxxxxxxxxxx07a593cbe63dd'
# {stop-ignore}

resources:
  myMongoCluster:
    type: 'mongo-db-atlas-cluster'
    properties:
      clusterTier: M2

  myMongoFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: 'lambdas/mongo-lambda.ts'
      memory: 512
      # {start-highlight}
      # by allowing access to cluster, lambda receives permissions for reading and writing into cluster databases
      connectTo:
        - myMongoCluster
      # {stop-highlight}
      environment:
        # injecting the connection string as environment variable
        - name: MONGODB_CONNECTION_STRING
          value: $ResourceParam('myMongoCluster', 'connectionString')
```