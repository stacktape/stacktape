# Provider configuration

To use MongoDB Atlas with Stacktape, you will need to:

1.  Create a [MongoDB Atlas account](https://account.mongodb.com/account/register).
2.  Follow our [step-by-step guide](../../user-guides/mongo-db-atlas-credentials/.md) to get your `organizationId`, `publicKey`, and `privateKey`.
3.  Store your credentials in a [secret](../../security-resources/secrets//index.md).

```yaml
# {start-highlight}
providerConfig:
  mongoDbAtlas:
    privateKey: 'xxxxfa523543fxxxx42543xx'
    publicKey: 'xxxxxxx'
    organizationId: 'xxxxxxxxxxx07a593cbe63dd'
# {stop-highlight}

resources:
  myMongoCluster:
    type: 'mongo-db-atlas-cluster'
    properties:
      clusterTier: M2
```