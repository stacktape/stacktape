# DynamoDB

A DynamoDB table is a serverless key-value and document store with single-digit millisecond reads and writes at any
scale. There are no servers or connections to manage, and in the default on-demand mode you pay per request:
$0.625 per million writes and $0.125 per million reads in us-east-1, plus $0.25 per GB-month of storage after the
first 25 GB ([DynamoDB pricing](https://aws.amazon.com/dynamodb/pricing/on-demand/)). An idle table costs nothing
beyond its storage.

It fits data you read by known keys: users, sessions, carts, device readings, counters. If you need joins, ad-hoc
queries or reports, use a [relational database](/resources/databases/relational-database); for full-text search, use
[OpenSearch](/resources/databases/opensearch).

## Basic example

A table needs only its primary key:


Example (TypeScript):

```typescript
import { defineConfig, DynamoDbTable } from 'stacktape';
export default defineConfig(() => {
  const postsTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: {
        name: 'id',
        type: 'string'
      }
    }
  });

  return {
    resources: { postsTable }
  };
});
```


The table runs in on-demand mode because `provisionedThroughput` is not set. Check it after the deploy:

```bash
stacktape query dynamodb postsTable --operation schema --stage dev
```

## Primary key

Every DynamoDB table needs a primary key that uniquely identifies each item. The primary key **cannot be changed after creation**, so design it carefully based on your access patterns.

DynamoDB supports two key types:

- **Simple key**: a `partitionKey` alone. Each item must have a unique partition key value. Use when items are accessed individually (e.g., user profiles by `userId`).
- **Composite key**: a `partitionKey` plus a `sortKey`. Multiple items can share the same partition key, distinguished by the sort key. Use when you need to query groups of related items (e.g., all orders for a user, sorted by date).


Example (TypeScript):

```typescript
import { defineConfig, DynamoDbTable } from 'stacktape';
export default defineConfig(() => {
  const ordersTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: {
        name: 'userId',
        type: 'string'
      },
      sortKey: {
        name: 'createdAt',
        type: 'string'
      }
    }
  });

  return {
    resources: { ordersTable }
  };
});
```


The `partitionKey` determines which partition stores the item. Choosing a high-cardinality partition key (like `userId` or `orderId`) distributes data evenly across partitions. A sort key enables range queries within a partition, for example querying all orders for a user between two dates.

Each attribute's `type` must be `string`, `number`, or `binary`. Most applications use `string` for identifiers and `number` or `string` for timestamps.

## Capacity modes

DynamoDB offers two billing modes that control how you pay for reads and writes. The choice is a cost vs. operational tradeoff.

### On-demand mode

On-demand is the default when you omit `provisionedThroughput`. DynamoDB manages capacity for you and you pay per request. This is the safest default for variable or unpredictable traffic — it requires zero capacity planning. Very large or sudden traffic changes can still run into AWS service limits, but for most teams this is the right starting point.

On-demand pricing is higher per-request than provisioned mode, but you avoid paying for unused capacity. Start here and switch to provisioned only after your traffic patterns stabilize and you can predict capacity needs.

### Provisioned mode

Provisioned mode lets you set fixed read and write capacity units for predictable pricing. One read capacity unit (RCU) handles one 4 KB strongly consistent read per second. One write capacity unit (WCU) handles one 1 KB write per second. Requests that exceed your provisioned capacity get throttled.


Example (TypeScript):

```typescript
import { defineConfig, DynamoDbTable } from 'stacktape';
export default defineConfig(() => {
  const sessionsTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'sessionId', type: 'string' }
    },
    provisionedThroughput: {
      readUnits: 50,
      writeUnits: 25,
      readScaling: {
        minUnits: 10,
        maxUnits: 200,
        keepUtilizationUnder: 70
      },
      writeScaling: {
        minUnits: 5,
        maxUnits: 100,
        keepUtilizationUnder: 70
      }
    }
  });

  return {
    resources: { sessionsTable }
  };
});
```


The `readUnits` and `writeUnits` values set the initial (seed) capacity. Without auto-scaling, these are also the fixed limits — any excess traffic gets throttled.

### Auto-scaling

`readScaling` and `writeScaling` let DynamoDB adjust capacity between `minUnits` and `maxUnits`. `keepUtilizationUnder`
is required: the target utilization in percent. A lower target, such as 70, leaves more headroom before requests are
throttled.

For most provisioned-mode workloads, enable auto-scaling. Without it, a traffic spike throttles requests immediately.

| Mode | Best for | Tradeoff |
|---|---|---|
| On-demand (default) | Variable or unpredictable traffic | Higher per-request cost, zero management |
| Provisioned | Steady, predictable traffic | Lower per-request cost, requires capacity planning |
| Provisioned + auto-scaling | Mostly predictable with occasional spikes | Balance of cost and flexibility |

## Secondary indexes

Without secondary indexes, you can only query items by their primary key. A global secondary index (GSI) lets you query by any other attribute, for example looking up users by `email` when the primary key is `userId`. `secondaryIndexes` creates global secondary indexes; local secondary indexes aren't available.


Example (TypeScript):

```typescript
import { defineConfig, DynamoDbTable } from 'stacktape';
export default defineConfig(() => {
  const usersTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'userId', type: 'string' }
    },
    secondaryIndexes: [
      {
        name: 'byEmail',
        partitionKey: { name: 'email', type: 'string' }
      },
      {
        name: 'byDepartment',
        partitionKey: { name: 'department', type: 'string' },
        sortKey: { name: 'joinedAt', type: 'string' },
        projections: ['fullName', 'role']
      }
    ]
  });

  return {
    resources: { usersTable }
  };
});
```


Each GSI has its own partition key and optional sort key. The `projections` array lists additional attributes to copy into the index beyond the table's primary key, which is always projected automatically. Only projected attributes are available when querying through the index — if you need an attribute in query results, include it in `projections`.

GSIs consume their own read/write capacity (or request units in on-demand mode) and add to storage costs because data is duplicated. Add indexes based on actual query needs rather than speculatively.

## Streams

DynamoDB Streams capture item-level changes. Stacktape exposes a [DynamoDB stream trigger](/resources/triggers/dynamodb-streams) for [Lambda functions](/resources/compute/lambda-function) and [batch jobs](/resources/compute/batch-job), invoking them when items change. Enable streams for use cases like auditing, analytics, cache invalidation, or downstream synchronization.


Example (TypeScript):

```typescript
import { defineConfig, DynamoDbTable } from 'stacktape';
export default defineConfig(() => {
  const productsTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'productId', type: 'string' }
    },
    streamType: 'NEW_AND_OLD_IMAGES'
  });

  return {
    resources: { productsTable }
  };
});
```


The `streamType` controls what data each stream record contains:

| Stream type | What's included | Use case |
|---|---|---|
| `KEYS_ONLY` | Only key attributes | Lightweight notifications, minimal data transfer |
| `NEW_IMAGE` | Full item after the change | Downstream sync, projections |
| `OLD_IMAGE` | Full item before the change | Undo/restore workflows |
| `NEW_AND_OLD_IMAGES` | Both before and after | Audit trails, change tracking, diff computation |

With a `streamType` set, the table has a `streamArn` parameter, and a [DynamoDB stream trigger](/resources/triggers/dynamodb-streams)
on a Lambda function or batch job processes the changes.

## Backups

`enablePointInTimeRecovery: true` keeps continuous backups, so you can restore the table to any second of the last 35
days. A restore creates a new table; it doesn't overwrite the existing one. It costs $0.20 per GB-month of table size
in us-east-1. Turn it on for production tables.


Example (TypeScript):

```typescript
import { defineConfig, DynamoDbTable } from 'stacktape';
export default defineConfig(() => {
  const ordersTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'orderId', type: 'string' }
    },
    enablePointInTimeRecovery: true
  });

  return {
    resources: { ordersTable }
  };
});
```


## Connecting to other resources

Add the table to a workload's [`connectTo`](/configuration/connecting-resources). The workload can then read, write,
query, scan and run batch and transaction operations on the table and its indexes. AWS authorizes a transaction by the
item operations inside it, so no extra permission is needed. It also gets these variables, for a table named
`itemsTable`:

| Variable | Value |
|---|---|
| `STP_ITEMS_TABLE_NAME` | Table name |
| `STP_ITEMS_TABLE_ARN` | Table ARN |
| `STP_ITEMS_TABLE_STREAM_ARN` | Stream ARN, only when the table has a `streamType` |


Example (TypeScript):

```typescript
import {
  defineConfig,
  DynamoDbTable,
  LambdaFunction,
  JsBundleLambdaPackaging
} from 'stacktape';
export default defineConfig(() => {
  const itemsTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'itemId', type: 'string' }
    }
  });

  const api = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: [itemsTable]
  });

  return {
    resources: { itemsTable, api }
  };
});
```


Use the name as `TableName` in SDK calls:

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.STP_ITEMS_TABLE_NAME!;

export const handler = async () => {
  await client.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: { itemId: '123', title: 'Hello', createdAt: new Date().toISOString() }
  }));

  const result = await client.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { itemId: '123' }
  }));

  return { statusCode: 200, body: JSON.stringify(result.Item) };
};
```

For other DynamoDB operations, such as managing backups, add `iamRoleStatements` to the workload.

## Dev mode

In [`stacktape dev`](/local-development/dev-mode-overview), tables run locally in Docker (DynamoDB Local), so you test
without touching shared data. Set `dev.remote: true` to use the deployed table instead; your local code then writes
real data.

## Expiring items (TTL)

DynamoDB deletes items whose TTL attribute (a Unix timestamp in seconds) is in the past, at no cost. That suits sessions,
caches and anything with a natural expiry. Turn it on with an [override](/configuration/overrides-and-escape-hatches)
of the table's CloudFormation resource, `<TableName>GlobalTable`:


Example (TypeScript):

```typescript
import { defineConfig, DynamoDbTable } from 'stacktape';

export default defineConfig(() => {
  const sessions = new DynamoDbTable({
    primaryKey: { partitionKey: { name: 'sessionId', type: 'string' } },
    overrides: {
      SessionsGlobalTable: {
        TimeToLiveSpecification: { Enabled: true, AttributeName: 'expiresAt' }
      }
    }
  });

  return { resources: { sessions } };
});
```


Deletion can lag the expiry time by a day or two, so filter expired items out of reads if that matters.
[`stacktape synth`](/cli/synth) shows the logical names of all child resources.

## Configuration reference


### Definition: `DynamoDbTableProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/dynamo-db-table` with definition name `DynamoDbTableProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `primaryKey` | yes | `DynamoDbTablePrimaryKey` | - |
| `dev` | no | `DevModeConfig` | - |
| `enablePointInTimeRecovery` | no | `boolean` | - |
| `provisionedThroughput` | no | `DynamoDbProvisionedThroughput` | - |
| `secondaryIndexes` | no | `Array<DynamoDbTableGlobalSecondaryIndex>` | - |
| `streamType` | no | `string: "KEYS_ONLY" \| "NEW_AND_OLD_IMAGES" \| "NEW_IMAGE" \| "OLD_IMAGE"` | - |


## Referenceable parameters


## Referenceable Parameters: `dynamo-db-table`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `name` | AWS (physical) name of the table | `$ResourceParam("<<resource-name>>", "name")` |
| `arn` | Arn of the table | `$ResourceParam("<<resource-name>>", "arn")` |
| `streamArn` | Arn of [DynamoDb stream](/resources/databases/dynamodb/#streams) (available only if `streamType` is configured) | `$ResourceParam("<<resource-name>>", "streamArn")` |
