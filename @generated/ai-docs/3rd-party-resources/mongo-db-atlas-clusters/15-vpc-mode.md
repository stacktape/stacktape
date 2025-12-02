# VPC mode

In addition to _IAM_ permissions, the cluster is also protected at the network level. This means that only resources within your stack's default VPC can access the cluster. Any IP addresses in the `whitelistedIps` list can also access the cluster. Traffic between your stack's resources and the cluster never leaves the AWS network, which is more secure and can be cheaper.

```yaml
providerConfig:
  mongoDbAtlas:
    privateKey: 'xxxxfa523543fxxxx42543xx'
    publicKey: 'xxxxxxx'
    # {start-highlight}
    # "accessibility" option is shared between "mongo-db-atlas-cluster" resources of your stack
    accessibility:
      accessibilityMode: vpc
    # {stop-highlight}
    organizationId: 'xxxxxxxxxxx07a593cbe63dd'

resources:
  myMongoCluster:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
```