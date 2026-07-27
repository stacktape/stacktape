# DynamoDB

A Stacktape DynamoDB table is a serverless NoSQL database that delivers single-digit millisecond reads and writes at any scale. It uses AWS DynamoDB underneath — no servers to manage, no capacity planning in the default on-demand mode, and you pay only for actual reads, writes, and storage.

## When to use

DynamoDB is the right choice when your access patterns are well-defined and key-based. It excels at high-throughput, low-latency workloads where you query by known keys rather than running ad-hoc joins or complex filters.

**Good fits:**
- User profiles, session stores, shopping carts — single-key lookups at scale
- IoT telemetry and time-series data (partition by device ID, sort by timestamp)
- Leaderboards, counters, and real-time analytics where you need fast writes
- Event sourcing with [DynamoDB Streams](/resources/triggers/dynamodb-streams) to trigger downstream processing
- Any workload where the access pattern is known upfront and read/write latency matters more than query flexibility

## When NOT to use

DynamoDB is a poor fit when you need relational queries, ad-hoc reporting, or full-text search. If you find yourself needing JOINs, complex aggregations, or frequently changing query patterns, use a [relational database](/resources/databases/relational-database) instead. For search-heavy workloads, consider [OpenSearch](/resources/databases/opensearch). If your data model is document-oriented but you need richer query capabilities than key lookups, [MongoDB Atlas](/resources/databases/mongodb-atlas) may be a better fit.

| Consider DynamoDB when | Consider alternatives when |
|---|---|
| Access patterns are known upfront | You need ad-hoc queries or JOINs |
| Single-digit ms latency is critical | Query flexibility matters more than latency |
| Traffic is spiky or unpredictable | You need full-text search |
| You want zero operational overhead | You need complex aggregations or reporting |

## Basic example

A DynamoDB table requires only a primary key definition. The simplest table uses a single partition key, which uniquely identifies each item.


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


This creates a DynamoDB table in on-demand (pay-per-request) mode — the default when `provisionedThroughput` is omitted. You pay only for actual reads and writes with no upfront capacity commitment.

## Primary key

Every DynamoDB table needs a primary key that uniquely identifies each item. The primary key **cannot be changed after creation**, so design it carefully based on your access patterns.

DynamoDB supports two key types:

- **Simple key** — a `partitionKey` alone. Each item must have a unique partition key value. Use when items are accessed individually (e.g., user profiles by `userId`).
- **Composite key** — a `partitionKey` plus a `sortKey`. Multiple items can share the same partition key, distinguished by the sort key. Use when you need to query groups of related items (e.g., all orders for a user, sorted by date).


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


The `partitionKey` determines which partition stores the item. Choosing a high-cardinality partition key (like `userId` or `orderId`) distributes data evenly across partitions. A sort key enables range queries within a partition — for example, querying all orders for a user between two dates.

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

Add `readScaling` and `writeScaling` to let DynamoDB adjust capacity automatically between `minUnits` and `maxUnits`. The `keepUtilizationUnder` property is required when configuring scaling — it sets the target utilization percentage that DynamoDB uses to decide when to scale. DynamoDB scales up when utilization exceeds this target and scales down when it drops below. Setting a lower target (e.g., 70) gives more headroom before throttling; higher values maximize utilization but leave less margin for traffic spikes. The source types define `keepUtilizationUnder` as a number — 70 is a common starting point, but the types do not document a specific allowed range.

For most provisioned-mode workloads, enable auto-scaling. Without it, a traffic spike throttles requests immediately.

| Mode | Best for | Tradeoff |
|---|---|---|
| On-demand (default) | Variable or unpredictable traffic | Higher per-request cost, zero management |
| Provisioned | Steady, predictable traffic | Lower per-request cost, requires capacity planning |
| Provisioned + auto-scaling | Mostly predictable with occasional spikes | Balance of cost and flexibility |

## Secondary indexes

Without secondary indexes, you can only query items by their primary key. A global secondary index (GSI) lets you query by any other attribute — for example, looking up users by `email` when the primary key is `userId`. In the Stacktape DynamoDB table resource, `secondaryIndexes` configures global secondary indexes; the type does not expose a local secondary index property.


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

Once streams are enabled, you can set up a [DynamoDB stream trigger](/resources/triggers/dynamodb-streams) on a Lambda function or batch job to process changes. Use the table's `streamArn` referenceable parameter when configuring the trigger; it is meaningful when streams are enabled with `streamType`.

## Backups

Enable `enablePointInTimeRecovery` for continuous backups that let you restore the table to any second within the last 35 days. Underneath, AWS DynamoDB creates continuous backups automatically — restores always create a new table rather than overwriting the existing one. This adds approximately 20% to storage costs.


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


Enable point-in-time recovery for production tables where data loss would be costly. For development or staging tables, skip it to save money.

## Connecting to other resources

Use [connectTo](/configuration/connecting-resources) on workloads or scripts that need access to a DynamoDB table. For DynamoDB tables, `connectTo` grants CRUD plus scan/query IAM permissions and injects environment variables with the table's connection details.


Example (TypeScript):

```typescript
import {
  defineConfig,
  DynamoDbTable,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const itemsTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: { name: 'itemId', type: 'string' }
    }
  });

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    connectTo: [itemsTable]
  });

  return {
    resources: { itemsTable, api }
  };
});
```


The `connectTo` injects these environment variables into the consuming workload:

| Environment variable | Description |
|---|---|
| `STP_ITEMS_TABLE_NAME` | The DynamoDB table name |
| `STP_ITEMS_TABLE_ARN` | The table's ARN |
| `STP_ITEMS_TABLE_STREAM_ARN` | The table's stream ARN |

`connectTo` documents DynamoDB access as CRUD plus scan/query. If your workload needs additional DynamoDB APIs, use [`iamRoleStatements`](/configuration/connecting-resources) on the consuming workload for explicit AWS permissions.

Use `STP_ITEMS_TABLE_NAME` as the `TableName` value in DynamoDB SDK operations:

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.STP_ITEMS_TABLE_NAME!;

export const handler = async (event: any) => {
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

You can also reference table parameters directly using the [`$ResourceParam` directive](/configuration/directives) — for example, `$ResourceParam('itemsTable', 'arn')`.

## Dev mode

During [`stacktape dev`](/local-development/dev-mode-overview), DynamoDB tables run locally in Docker by default. The local emulator gives you isolated development and fast iteration without deploying to AWS — ideal for testing CRUD logic, running integration tests, and iterating on data models without incurring costs or affecting shared data.

Set `dev.remote: true` to connect to the real deployed AWS table instead. The deployed resource must exist first. Use remote mode when local emulation diverges from AWS behavior in ways that matter to your application, or when you intentionally need to work against real production or staging data. Be careful with remote mode — your local code operates directly against the deployed table, so writes affect real data.

## Overrides

DynamoDB tables expose `overrides` as an escape hatch to modify the underlying CloudFormation resources that Stacktape creates. Use overrides when you need properties not directly exposed by `DynamoDbTableProps` — for example, setting a time-to-live (TTL) attribute so items expire automatically, or enabling server-side encryption with a customer-managed KMS key.

The example below enables TTL on an attribute named `expiresAt`. Replace `DynamoDbTableResource` with the actual logical resource name from your stack. The `Properties.TimeToLiveSpecification` path uses dot-notation to target a specific CloudFormation property on that resource:

```json
{
  "DynamoDbTableResource": {
    "Properties.TimeToLiveSpecification": {
      "Enabled": true,
      "AttributeName": "expiresAt"
    }
  }
}
```

TTL is useful for session stores, cache entries, or any data with a natural expiration. AWS DynamoDB automatically deletes expired items at no additional write cost, though deletions may lag behind the expiration time by up to 48 hours. To enable server-side encryption with a customer-managed KMS key instead, override `Properties.SSESpecification` with `{ "SSEEnabled": true, "KMSMasterKeyId": "<your-key-arn>", "SSEType": "KMS" }`.

Use [`stacktape info:stack --detailed`](/cli/info-stack) to inspect CloudFormation logical IDs before writing overrides. See [overrides and escape hatches](/configuration/overrides-and-escape-hatches) for the full workflow.

## Referenceable parameters


## Referenceable Parameters: `dynamo-db-table`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `name` | AWS (physical) name of the table | `$ResourceParam("<<resource-name>>", "name")` |
| `arn` | Arn of the table | `$ResourceParam("<<resource-name>>", "arn")` |
| `streamArn` | Arn of [DynamoDb stream](/resources/databases/dynamodb/#streams) (available only if `streamType` is configured) | `$ResourceParam("<<resource-name>>", "streamArn")` |


## API Reference


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


## FAQ

### When should I use DynamoDB instead of a relational database?

Use DynamoDB when your access patterns are predictable and key-based — user lookups, session stores, leaderboards, IoT telemetry. If your application primarily does single-item reads/writes or queries within a known partition, DynamoDB delivers lower latency and requires zero operational overhead compared to a [relational database](/resources/databases/relational-database). Choose a relational database when you need JOINs, complex aggregations, or flexible ad-hoc queries.

### How much does DynamoDB cost?

You pay for reads, writes, and storage. On-demand mode (the default) is more expensive per request but charges only for actual usage with no capacity planning; provisioned mode has a lower per-request cost but requires you to set capacity, so for steady, predictable traffic it typically costs less — especially with auto-scaling enabled. Two features add to the bill: secondary indexes duplicate data and consume their own capacity, and `enablePointInTimeRecovery` adds roughly 20% to storage costs.

### Can I change the primary key after creating a table?

No. The primary key (partition key and sort key) is immutable after table creation. If you need a different key structure, create a new table with the desired key and migrate your data. Design your primary key carefully based on your access patterns before deploying.

### How do DynamoDB Streams work with Stacktape?

Enable streams by setting `streamType` on your DynamoDB table, then configure a [DynamoDB stream trigger](/resources/triggers/dynamodb-streams) on a [Lambda function](/resources/compute/lambda-function) or [batch job](/resources/compute/batch-job). The `streamType` controls what each record contains — `KEYS_ONLY`, `NEW_IMAGE`, `OLD_IMAGE`, or `NEW_AND_OLD_IMAGES`. Use the table's `streamArn` referenceable parameter when wiring up the trigger.

### Does `connectTo` grant permission for DynamoDB transactions?

No. `connectTo` documents DynamoDB access as CRUD plus scan/query, which does not cover transaction operations like `TransactWriteItems` and `TransactGetItems`. If your workload needs transactions or any other DynamoDB API beyond CRUD/scan/query, use [`iamRoleStatements`](/configuration/connecting-resources) on the consuming workload to grant the explicit AWS permissions. Note that AWS charges transactions at twice the normal read/write capacity.

### How do I enable TTL so items expire automatically?

There is no dedicated property for time-to-live, so use `overrides` to set `Properties.TimeToLiveSpecification` with `Enabled: true` and the `AttributeName` holding the expiration timestamp. AWS DynamoDB then deletes expired items at no additional write cost, though deletions can lag the expiration time by up to 48 hours. See the [Overrides](#overrides) section for the full example.
