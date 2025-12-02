# Auto-scaling

```yaml
# {start-ignore}
providerConfig:
  mongoDbAtlas:
    privateKey: 'xxxxfa523543fxxxx42543xx'
    publicKey: 'xxxxxxx'
    organizationId: 'xxxxxxxxxxx07a593cbe63dd'
# {stop-ignore}
resources:
  myMongoDbCluster:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
      # {start-highlight}
      autoScaling:
        minClusterTier: M10
        maxClusterTier: M30
        disableDiskScaling: true
        disableScaleDown: true
      # {stop-highlight}
```