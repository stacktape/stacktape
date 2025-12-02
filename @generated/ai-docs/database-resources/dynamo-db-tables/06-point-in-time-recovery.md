# Point-in-Time Recovery

Point-in-time recovery (PITR) helps protect your tables from accidental write or delete operations. With PITR, you can restore that table to any point in time during the last 35 days.

```yaml
resources:
  myDynamoDbTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: this_attribute_will_be_id
          type: string
      # {start-highlight}
      enablePointInTimeRecovery: true
      # {stop-highlight}
```