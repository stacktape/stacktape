# Item-Change Streaming

You can capture a time-ordered sequence of item-level modifications in any DynamoDB table and store this information in a log for up to 24 hours. Applications can access this log and view the data items as they appeared before and after they were modified, in near-real time. This is called DynamoDB Streams.

Streams can be consumed by [functions](../../compute-resources/functions/22-dynamodb-stream-event.md) and [batch jobs](../../compute-resources/batch-jobs/index.md).

You must configure the stream type, which determines what information is written to the stream when an item in the table is modified. Allowed values are:

*   `KEYS_ONLY`: Only the key attributes of the modified item.
*   `NEW_IMAGE`: The entire item as it appeared after it was modified.
*   `OLD_IMAGE`: The entire item as it appeared before it was modified.
*   `NEW_AND_OLD_IMAGES`: Both the new and the old images of the item.

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
      streamType: NEW_AND_OLD_IMAGES
      # {stop-highlight}
```