# Primary Key

Every item in a DynamoDB table is uniquely identified by a primary key. There are two types of primary keys:

*   **Partition key:** A simple primary key, composed of one attribute. DynamoDB uses the partition key's value as input to an internal hash function. The output from the hash function determines the partition (physical storage internal to DynamoDB) in which the item will be stored.
*   **Partition key and sort key (composite primary key):** All items with the same partition key value are stored together, in sorted order by the sort key value.

This example shows a table with a composite primary key:

```yaml
resources:
  myDynamoTable:
    type: dynamo-db-table
    properties:
      # {start-highlight}
      primaryKey:
        partitionKey:
          name: this_attribute_will_be_partition_key
          type: string
        sortKey:
          name: this_attribute_will_be_sort_key
          type: number
      # {stop-highlight}
```