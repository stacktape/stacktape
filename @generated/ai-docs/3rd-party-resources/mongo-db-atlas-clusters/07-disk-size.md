# Disk size

Each cluster tier comes with a default amount of storage. All M10+ clusters automatically scale their storage, but you can disable this behavior. You can also customize the storage capacity for all M10+ clusters.

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
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M2
      # {start-highlight}
      diskSizeGB: 60
      # {stop-highlight}
```