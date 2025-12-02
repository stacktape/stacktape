# Provisioned Throughput

DynamoDB has two capacity modes for processing reads and writes on your tables: on-demand and provisioned.

*   **On-demand:** This is the default mode. You pay per request, which is suitable for unpredictable workloads.
*   **Provisioned:** You specify the number of reads and writes per second that you require for your application. This is best for predictable traffic.

You can also configure auto-scaling for provisioned throughput to automatically adjust your table's capacity based on traffic.

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
      provisionedThroughput:
        readUnits: 4
        writeUnits: 4
      # {stop-highlight}
```

### Throughput Scaling

The following example shows how to configure auto-scaling for read and write capacity.

```yaml
resources:
  myDynamoDbTable:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: this_attribute_will_be_id
          type: string
      provisionedThroughput:
        readUnits: 4
        writeUnits: 4
        # {start-highlight}
        readScaling:
          minUnits: 4
          maxUnits: 10
          keepUtilizationUnder: 80
        # {stop-highlight}
```