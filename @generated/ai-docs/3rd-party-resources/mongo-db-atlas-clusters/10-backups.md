# Backups

There are different types of snapshots with different retention periods and frequencies:

- **Hourly:** Every 6 hours, retained for 2 days.
- **Daily:** Every day, retained for 7 days.
- **Weekly:** Every Saturday, retained for 4 weeks.
- **Monthly:** Last day of the month, retained for 12 months.

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
      enableBackups: true
      # {stop-highlight}
```