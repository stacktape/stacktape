# Whitelisted IPs only mode

The cluster can only be accessed from the IP addresses and CIDR blocks in the `whitelistedIps` list.

```yaml
providerConfig:
  mongoDbAtlas:
    privateKey: 'xxxxfa523543fxxxx42543xx'
    publicKey: 'xxxxxxx'
    # {start-highlight}
    # "accessibility" option is shared between "mongo-db-atlas-cluster" resources of your stack
    accessibility:
      accessibilityMode: whitelisted-ips-only
      whitelistedIps:
        - 193.12.16.4
    # {stop-highlight}
    organizationId: 'xxxxxxxxxxx07a593cbe63dd'
resources:
  myMongoCluster:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
```