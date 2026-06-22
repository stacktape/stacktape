# Dynamo Db Table

Resource type: `dynamo-db-table`

## TypeScript Definition

```typescript
/**
 * #### Serverless NoSQL database with single-digit millisecond reads/writes at any scale.
 *
 * ---
 *
 * No servers to manage, no capacity planning needed (in on-demand mode). Pay per read/write.
 * Great for user profiles, session data, IoT data, and any key-value or document workload.
 */
interface DynamoDbTable {
  type: 'dynamo-db-table';
  properties: DynamoDbTableProps;
  overrides?: ResourceOverrides;
}

interface DynamoDbTableProps {
  /**
   * #### The primary key that uniquely identifies each item.
   *
   * ---
   *
   * - **Simple key**: Just a `partitionKey` (e.g., `userId`).
   * - **Composite key**: `partitionKey` + `sortKey` (e.g., `userId` + `createdAt`).
   *
   * > **Cannot be changed after creation.** Every item must include the primary key attribute(s).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ordersTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: customerId
   *           type: string
   *         sortKey:
   *           name: orderId
   *           type: string
   *   reconcileJob:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/reconcile.ts
   *       events:
   *         - type: schedule
   *           properties:
   *             scheduleRate: rate(1 hour)
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ordersTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'customerId', type: 'string' },
   *       sortKey: { name: 'orderId', type: 'string' }
   *     }
   *   });
   *
   *   const reconcileJob = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/reconcile.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'schedule',
   *         properties: { scheduleRate: 'rate(1 hour)' }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { ordersTable, reconcileJob } };
   * });
   * ```
   */
  primaryKey: DynamoDbTablePrimaryKey;
  /**
   * #### Fixed-capacity mode with predictable pricing. Omit for on-demand (pay-per-request) mode.
   *
   * ---
   *
   * - **On-demand** (default, no config): Pay per read/write. Best for unpredictable or variable traffic.
   * - **Provisioned**: Set fixed read/write capacity. Cheaper at steady, predictable load. Can auto-scale.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   sessionsTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: sessionId
   *           type: string
   *       provisionedThroughput:
   *         readUnits: 25
   *         writeUnits: 10
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const sessionsTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'sessionId', type: 'string' }
   *     },
   *     provisionedThroughput: {
   *       readUnits: 25,
   *       writeUnits: 10
   *     }
   *   });
   *
   *   return { resources: { sessionsTable } };
   * });
   * ```
   */
  provisionedThroughput?: DynamoDbProvisionedThroughput;
  /**
   * #### Enable continuous backups with point-in-time recovery (restore to any second in the last 35 days).
   *
   * ---
   *
   * Restores always create a new table. Adds ~20% to storage cost.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   paymentsTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: paymentId
   *           type: string
   *       enablePointInTimeRecovery: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const paymentsTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'paymentId', type: 'string' }
   *     },
   *     enablePointInTimeRecovery: true
   *   });
   *
   *   return { resources: { paymentsTable } };
   * });
   * ```
   */
  enablePointInTimeRecovery?: boolean;
  /**
   * #### Stream item changes to trigger functions or batch jobs in real time.
   *
   * ---
   *
   * - `KEYS_ONLY`: Only key attributes of the changed item.
   * - `NEW_IMAGE`: The full item after the change.
   * - `OLD_IMAGE`: The full item before the change.
   * - `NEW_AND_OLD_IMAGES`: Both before and after — useful for change tracking and auditing.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   productsTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: productId
   *           type: string
   *       streamType: NEW_AND_OLD_IMAGES
   *   auditLogger:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/audit.ts
   *       events:
   *         - type: dynamo-db-stream
   *           properties:
   *             streamArn: $ResourceParam('productsTable', 'streamArn')
   *             batchSize: 25
   *             startingPosition: LATEST
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, LambdaFunction, defineConfig, $ResourceParam } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const productsTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'productId', type: 'string' }
   *     },
   *     streamType: 'NEW_AND_OLD_IMAGES'
   *   });
   *
   *   const auditLogger = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/audit.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'dynamo-db-stream',
   *         properties: {
   *           streamArn: $ResourceParam('productsTable', 'streamArn'),
   *           batchSize: 25,
   *           startingPosition: 'LATEST'
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { productsTable, auditLogger } };
   * });
   * ```
   */
  streamType?: 'KEYS_ONLY' | 'NEW_IMAGE' | 'OLD_IMAGE' | 'NEW_AND_OLD_IMAGES';
  /**
   * #### Additional indexes for querying by attributes other than the primary key.
   *
   * ---
   *
   * Without indexes, you can only query by primary key. Add a secondary index to query by
   * any attribute (e.g., query orders by `status` or users by `email`).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   usersTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: userId
   *           type: string
   *       secondaryIndexes:
   *         - name: byEmail
   *           partitionKey:
   *             name: email
   *             type: string
   *         - name: byStatusCreatedAt
   *           partitionKey:
   *             name: status
   *             type: string
   *           sortKey:
   *             name: createdAt
   *             type: number
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const usersTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'userId', type: 'string' }
   *     },
   *     secondaryIndexes: [
   *       {
   *         name: 'byEmail',
   *         partitionKey: { name: 'email', type: 'string' }
   *       },
   *       {
   *         name: 'byStatusCreatedAt',
   *         partitionKey: { name: 'status', type: 'string' },
   *         sortKey: { name: 'createdAt', type: 'number' }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { usersTable } };
   * });
   * ```
   */
  secondaryIndexes?: DynamoDbTableGlobalSecondaryIndex[];
  /**
   * #### Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed table.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cacheTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: cacheKey
   *           type: string
   *       dev:
   *         remote: false
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cacheTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'cacheKey', type: 'string' }
   *     },
   *     dev: {
   *       remote: false
   *     }
   *   });
   *
   *   return { resources: { cacheTable } };
   * });
   * ```
   */
  dev?: DevModeConfig;
}

interface DynamoDbTablePrimaryKey {
  /**
   * #### The main key attribute (e.g., `userId`, `orderId`). Must be unique if no sort key is used.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   devicesTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: deviceId
   *           type: string
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const devicesTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'deviceId', type: 'string' }
   *     }
   *   });
   *
   *   return { resources: { devicesTable } };
   * });
   * ```
   */
  partitionKey: DynamoDbAttribute;
  /**
   * #### Optional second key for composite keys. Enables range queries and multiple items per partition key.
   *
   * ---
   *
   * E.g., partition key `userId` + sort key `createdAt` lets you query all items for a user sorted by date.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   eventsTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: userId
   *           type: string
   *         sortKey:
   *           name: createdAt
   *           type: number
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const eventsTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'userId', type: 'string' },
   *       sortKey: { name: 'createdAt', type: 'number' }
   *     }
   *   });
   *
   *   return { resources: { eventsTable } };
   * });
   * ```
   */
  sortKey?: DynamoDbAttribute;
}

interface DynamoDbTableGlobalSecondaryIndex {
  /**
   * #### Name of the index (used when querying).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ordersTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: orderId
   *           type: string
   *       secondaryIndexes:
   *         -
   *           name: byCustomer
   *           partitionKey:
   *             name: customerId
   *             type: string
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ordersTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'orderId', type: 'string' }
   *     },
   *     secondaryIndexes: [
   *       {
   *         name: 'byCustomer',
   *         partitionKey: { name: 'customerId', type: 'string' }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { ordersTable } };
   * });
   * ```
   */
  name: string;
  /**
   * #### Partition key for this index — the attribute you'll query by.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ticketsTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: ticketId
   *           type: string
   *       secondaryIndexes:
   *         - name: byAssignee
   *           partitionKey:
   *             name: assigneeId
   *             type: string
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ticketsTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'ticketId', type: 'string' }
   *     },
   *     secondaryIndexes: [
   *       {
   *         name: 'byAssignee',
   *         partitionKey: { name: 'assigneeId', type: 'string' }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { ticketsTable } };
   * });
   * ```
   */
  partitionKey: DynamoDbAttribute;
  /**
   * #### Optional sort key for range queries within a partition.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ticketsTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: ticketId
   *           type: string
   *       secondaryIndexes:
   *         - name: byAssigneePriority
   *           partitionKey:
   *             name: assigneeId
   *             type: string
   *           sortKey:
   *             name: priority
   *             type: number
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ticketsTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'ticketId', type: 'string' }
   *     },
   *     secondaryIndexes: [
   *       {
   *         name: 'byAssigneePriority',
   *         partitionKey: { name: 'assigneeId', type: 'string' },
   *         sortKey: { name: 'priority', type: 'number' }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { ticketsTable } };
   * });
   * ```
   */
  sortKey?: DynamoDbAttribute;
  /**
   * #### Extra attributes to copy into the index. Only projected attributes are available when querying.
   *
   * ---
   *
   * The table's primary key is always projected. List additional attributes you need in query results.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   usersTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: userId
   *           type: string
   *       secondaryIndexes:
   *         - name: byEmail
   *           partitionKey:
   *             name: email
   *             type: string
   *           projections:
   *             - displayName
   *             - avatarUrl
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const usersTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'userId', type: 'string' }
   *     },
   *     secondaryIndexes: [
   *       {
   *         name: 'byEmail',
   *         partitionKey: { name: 'email', type: 'string' },
   *         projections: ['displayName', 'avatarUrl']
   *       }
   *     ]
   *   });
   *
   *   return { resources: { usersTable } };
   * });
   * ```
   */
  projections?: string[];
}

interface DynamoDbAttribute {
  /**
   * #### Attribute name (e.g., `userId`, `email`, `createdAt`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   productsTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: sku
   *           type: string
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const productsTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: {
   *         name: 'sku',
   *         type: 'string'
   *       }
   *     }
   *   });
   *
   *   return { resources: { productsTable } };
   * });
   * ```
   */
  name: string;
  /**
   * #### Attribute data type: `string`, `number`, or `binary`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   metricsTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: metricId
   *           type: string
   *         sortKey:
   *           name: timestamp
   *           type: number
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const metricsTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'metricId', type: 'string' },
   *       sortKey: {
   *         name: 'timestamp',
   *         type: 'number'
   *       }
   *     }
   *   });
   *
   *   return { resources: { metricsTable } };
   * });
   * ```
   */
  type: 'string' | 'number' | 'binary';
}

interface DynamoDbProvisionedThroughput {
  /**
   * #### Read capacity units per second. 1 unit = one 4 KB strongly consistent read (or two eventually consistent).
   *
   * ---
   *
   * Requests exceeding this limit get throttled. Use `readScaling` to auto-adjust.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   catalogTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: itemId
   *           type: string
   *       provisionedThroughput:
   *         readUnits: 50
   *         writeUnits: 5
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const catalogTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'itemId', type: 'string' }
   *     },
   *     provisionedThroughput: {
   *       readUnits: 50,
   *       writeUnits: 5
   *     }
   *   });
   *
   *   return { resources: { catalogTable } };
   * });
   * ```
   */
  readUnits: number;
  /**
   * #### Write capacity units per second. 1 unit = one 1 KB write.
   *
   * ---
   *
   * Requests exceeding this limit get throttled. Use `writeScaling` to auto-adjust.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ingestTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: recordId
   *           type: string
   *       provisionedThroughput:
   *         readUnits: 5
   *         writeUnits: 40
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ingestTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'recordId', type: 'string' }
   *     },
   *     provisionedThroughput: {
   *       readUnits: 5,
   *       writeUnits: 40
   *     }
   *   });
   *
   *   return { resources: { ingestTable } };
   * });
   * ```
   */
  writeUnits: number;
  /**
   * #### Auto-scale write capacity based on actual usage. Scales up/down between min and max units.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ordersTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: orderId
   *           type: string
   *       provisionedThroughput:
   *         readUnits: 20
   *         writeUnits: 10
   *         writeScaling:
   *           minUnits: 10
   *           maxUnits: 100
   *           keepUtilizationUnder: 70
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ordersTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'orderId', type: 'string' }
   *     },
   *     provisionedThroughput: {
   *       readUnits: 20,
   *       writeUnits: 10,
   *       writeScaling: {
   *         minUnits: 10,
   *         maxUnits: 100,
   *         keepUtilizationUnder: 70
   *       }
   *     }
   *   });
   *
   *   return { resources: { ordersTable } };
   * });
   * ```
   */
  writeScaling?: DynamoDbWriteScaling;
  /**
   * #### Auto-scale read capacity based on actual usage. Scales up/down between min and max units.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ordersTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: orderId
   *           type: string
   *       provisionedThroughput:
   *         readUnits: 20
   *         writeUnits: 10
   *         readScaling:
   *           minUnits: 20
   *           maxUnits: 200
   *           keepUtilizationUnder: 65
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ordersTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'orderId', type: 'string' }
   *     },
   *     provisionedThroughput: {
   *       readUnits: 20,
   *       writeUnits: 10,
   *       readScaling: {
   *         minUnits: 20,
   *         maxUnits: 200,
   *         keepUtilizationUnder: 65
   *       }
   *     }
   *   });
   *
   *   return { resources: { ordersTable } };
   * });
   * ```
   */
  readScaling?: DynamoDbReadScaling;
}

interface DynamoDbWriteScaling {
  /**
   * #### Minimum write units. Capacity never scales below this.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ordersTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: orderId
   *           type: string
   *       provisionedThroughput:
   *         readUnits: 20
   *         writeUnits: 10
   *         writeScaling:
   *           minUnits: 10
   *           maxUnits: 100
   *           keepUtilizationUnder: 70
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ordersTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'orderId', type: 'string' }
   *     },
   *     provisionedThroughput: {
   *       readUnits: 20,
   *       writeUnits: 10,
   *       writeScaling: {
   *         minUnits: 10,
   *         maxUnits: 100,
   *         keepUtilizationUnder: 70
   *       }
   *     }
   *   });
   *
   *   return { resources: { ordersTable } };
   * });
   * ```
   */
  minUnits: number;
  /**
   * #### Maximum write units. Capacity never scales above this.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ordersTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: orderId
   *           type: string
   *       provisionedThroughput:
   *         readUnits: 20
   *         writeUnits: 10
   *         writeScaling:
   *           minUnits: 10
   *           maxUnits: 100
   *           keepUtilizationUnder: 70
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ordersTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'orderId', type: 'string' }
   *     },
   *     provisionedThroughput: {
   *       readUnits: 20,
   *       writeUnits: 10,
   *       writeScaling: {
   *         minUnits: 10,
   *         maxUnits: 100,
   *         keepUtilizationUnder: 70
   *       }
   *     }
   *   });
   *
   *   return { resources: { ordersTable } };
   * });
   * ```
   */
  maxUnits: number;
  /**
   * #### Target utilization percentage (e.g., 70). Scales up when usage exceeds this, down when it drops.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ordersTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: orderId
   *           type: string
   *       provisionedThroughput:
   *         readUnits: 20
   *         writeUnits: 10
   *         writeScaling:
   *           minUnits: 10
   *           maxUnits: 100
   *           keepUtilizationUnder: 70
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ordersTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'orderId', type: 'string' }
   *     },
   *     provisionedThroughput: {
   *       readUnits: 20,
   *       writeUnits: 10,
   *       writeScaling: {
   *         minUnits: 10,
   *         maxUnits: 100,
   *         keepUtilizationUnder: 70
   *       }
   *     }
   *   });
   *
   *   return { resources: { ordersTable } };
   * });
   * ```
   */
  keepUtilizationUnder: number;
}

interface DynamoDbReadScaling {
  /**
   * #### Minimum read units. Capacity never scales below this.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ordersTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: orderId
   *           type: string
   *       provisionedThroughput:
   *         readUnits: 20
   *         writeUnits: 10
   *         readScaling:
   *           minUnits: 20
   *           maxUnits: 200
   *           keepUtilizationUnder: 65
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ordersTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'orderId', type: 'string' }
   *     },
   *     provisionedThroughput: {
   *       readUnits: 20,
   *       writeUnits: 10,
   *       readScaling: {
   *         minUnits: 20,
   *         maxUnits: 200,
   *         keepUtilizationUnder: 65
   *       }
   *     }
   *   });
   *
   *   return { resources: { ordersTable } };
   * });
   * ```
   */
  minUnits: number;
  /**
   * #### Maximum read units. Capacity never scales above this.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ordersTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: orderId
   *           type: string
   *       provisionedThroughput:
   *         readUnits: 20
   *         writeUnits: 10
   *         readScaling:
   *           minUnits: 20
   *           maxUnits: 200
   *           keepUtilizationUnder: 65
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ordersTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'orderId', type: 'string' }
   *     },
   *     provisionedThroughput: {
   *       readUnits: 20,
   *       writeUnits: 10,
   *       readScaling: {
   *         minUnits: 20,
   *         maxUnits: 200,
   *         keepUtilizationUnder: 65
   *       }
   *     }
   *   });
   *
   *   return { resources: { ordersTable } };
   * });
   * ```
   */
  maxUnits: number;
  /**
   * #### Target utilization percentage (e.g., 70). Scales up when usage exceeds this, down when it drops.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ordersTable:
   *     type: dynamo-db-table
   *     properties:
   *       primaryKey:
   *         partitionKey:
   *           name: orderId
   *           type: string
   *       provisionedThroughput:
   *         readUnits: 20
   *         writeUnits: 10
   *         readScaling:
   *           minUnits: 20
   *           maxUnits: 200
   *           keepUtilizationUnder: 65
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { DynamoDbTable, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ordersTable = new DynamoDbTable({
   *     primaryKey: {
   *       partitionKey: { name: 'orderId', type: 'string' }
   *     },
   *     provisionedThroughput: {
   *       readUnits: 20,
   *       writeUnits: 10,
   *       readScaling: {
   *         minUnits: 20,
   *         maxUnits: 200,
   *         keepUtilizationUnder: 65
   *       }
   *     }
   *   });
   *
   *   return { resources: { ordersTable } };
   * });
   * ```
   */
  keepUtilizationUnder: number;
}

type DynamoDBTableReferencableParam = 'name' | 'arn' | 'streamArn';
```
