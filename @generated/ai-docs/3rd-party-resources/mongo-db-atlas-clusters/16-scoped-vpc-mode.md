# Scoped VPC mode

This mode is similar to VPC mode, but even more restrictive. In this mode, the `connectTo` property not only grants _IAM_ permissions, but also grants access at the network level.

```yaml
providerConfig:
  mongoDbAtlas:
    privateKey: 'xxxxfa523543fxxxx42543xx'
    publicKey: 'xxxxxxx'
    # {start-highlight}
    # "accessibility" option is shared between "mongo-db-atlas-cluster" resources of your stack
    accessibility:
      accessibilityMode: scoping-workloads-in-vpc
    # {stop-highlight}
    organizationId: 'xxxxxxxxxxx07a593cbe63dd'

resources:
  # functionOne does NOT have access to database eventhough it is joined in vpc
  functionOne:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: 'path/to/my-lambda.ts'
      joinDefaultVpc: true

  # functionTwo does have access to database, because it is scoping the database in connectTo list
  functionTwo:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: 'path/to/my-lambda-2.ts'
      joinDefaultVpc: true
      # {start-highlight}
      connectTo:
        - myMongoCluster
      # {stop-highlight}

  myMongoCluster:
    type: mongo-db-atlas-cluster
    properties:
      clusterTier: M10
```