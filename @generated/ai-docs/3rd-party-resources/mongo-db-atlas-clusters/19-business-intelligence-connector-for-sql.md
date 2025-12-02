# Business Intelligence Connector for SQL

The MongoDB Connector for BI allows you to use SQL to query your MongoDB data with tools like Tableau, Power BI, and Excel.

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
      clusterTier: 'M10'
      # {start-highlight}
      biConnector:
        enabled: true
      # {stop-highlight}
```