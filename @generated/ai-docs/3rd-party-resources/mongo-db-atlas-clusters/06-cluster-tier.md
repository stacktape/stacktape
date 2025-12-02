# Cluster tier

The cluster tier determines the resources (memory, storage, IOPS) for each data-bearing node in your cluster. To learn more, see the [MongoDB Atlas documentation](https://docs.atlas.mongodb.com/cluster-tier/).

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
      # {start-highlight}
      clusterTier: M2
      # {stop-highlight}
```