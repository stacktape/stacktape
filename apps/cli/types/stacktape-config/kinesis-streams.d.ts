/**
 * #### Real-time data stream for ingesting high-volume events (logs, clickstreams, IoT, analytics).
 *
 * ---
 *
 * Continuously captures data from many producers. Consumers (Lambda functions, etc.) process records in order.
 * Use when you need real-time processing with sub-second latency, not just async messaging (use SQS for that).
 */
interface KinesisStream {
  type: 'kinesis-stream';
  properties?: KinesisStreamProps;
  overrides?: ResourceOverrides;
}

interface KinesisStreamProps {
  /**
   * #### How the stream scales.
   *
   * ---
   *
   * - **`ON_DEMAND`**: Auto-scales, pay per GB. Recommended for most use cases.
   * - **`PROVISIONED`**: You choose a fixed number of shards (1 MB/s write, 2 MB/s read each). More predictable costs.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * # capacityMode
   * resources:
   *   eventStream:
   *     type: kinesis-stream
   *     properties:
   *       # stp-focus
   *       capacityMode: ON_DEMAND
   *       # stp-end-focus
   *       retentionPeriodHours: 48
   *   streamProcessor:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/process-records.ts
   *       events:
   *         - type: kinesis-stream
   *           properties:
   *             kinesisStreamName: eventStream
   *             batchSize: 100
   *             startingPosition: LATEST
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * // capacityMode
   * import { KinesisStream, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const eventStream = new KinesisStream({
   *     // stp-focus
   *     capacityMode: 'ON_DEMAND',
   *     // stp-end-focus
   *     retentionPeriodHours: 48
   *   });
   *
   *   const streamProcessor = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/process-records.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'kinesis-stream',
   *         properties: {
   *           kinesisStreamName: 'eventStream',
   *           batchSize: 100,
   *           startingPosition: 'LATEST'
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { eventStream, streamProcessor } };
   * });
   * ```
   *
   * @default "ON_DEMAND"
   */
  capacityMode?: 'ON_DEMAND' | 'PROVISIONED';
  /**
   * #### Number of shards. Only used when `capacityMode` is `PROVISIONED`.
   *
   * ---
   *
   * Each shard: 1 MB/s write (1,000 records/s), 2 MB/s read (shared across consumers).
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * # shardCount
   * resources:
   *   clickstream:
   *     type: kinesis-stream
   *     properties:
   *       capacityMode: PROVISIONED
   *       # stp-focus
   *       shardCount: 4
   *       # stp-end-focus
   *       retentionPeriodHours: 72
   *   analyticsConsumer:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/analytics.ts
   *       events:
   *         - type: kinesis-stream
   *           properties:
   *             kinesisStreamName: clickstream
   *             batchSize: 500
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * // shardCount
   * import { KinesisStream, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const clickstream = new KinesisStream({
   *     capacityMode: 'PROVISIONED',
   *     // stp-focus
   *     shardCount: 4,
   *     // stp-end-focus
   *     retentionPeriodHours: 72
   *   });
   *
   *   const analyticsConsumer = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/analytics.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'kinesis-stream',
   *         properties: {
   *           kinesisStreamName: 'clickstream',
   *           batchSize: 500
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { clickstream, analyticsConsumer } };
   * });
   * ```
   *
   * @default 1
   */
  shardCount?: number;
  /**
   * #### How long records stay in the stream (hours). Range: 24–8,760 (365 days). Beyond 24h costs extra.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * # retentionPeriodHours
   * resources:
   *   auditTrail:
   *     type: kinesis-stream
   *     properties:
   *       capacityMode: ON_DEMAND
   *       # stp-focus
   *       retentionPeriodHours: 168
   *       # stp-end-focus
   *   auditConsumer:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/audit.ts
   *       events:
   *         - type: kinesis-stream
   *           properties:
   *             kinesisStreamName: auditTrail
   *             startingPosition: TRIM_HORIZON
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * // retentionPeriodHours
   * import { KinesisStream, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const auditTrail = new KinesisStream({
   *     capacityMode: 'ON_DEMAND',
   *     // stp-focus
   *     retentionPeriodHours: 168
   *     // stp-end-focus
   *   });
   *
   *   const auditConsumer = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/audit.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'kinesis-stream',
   *         properties: {
   *           kinesisStreamName: 'auditTrail',
   *           startingPosition: 'TRIM_HORIZON'
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { auditTrail, auditConsumer } };
   * });
   * ```
   *
   * @default 24
   */
  retentionPeriodHours?: number;
  /**
   * #### Encrypt data at rest using a KMS key.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * # encryption
   * resources:
   *   secureStream:
   *     type: kinesis-stream
   *     properties:
   *       capacityMode: ON_DEMAND
   *       # stp-focus
   *       encryption:
   *         enabled: true
   *       # stp-end-focus
   *   secureConsumer:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/consume.ts
   *       events:
   *         - type: kinesis-stream
   *           properties:
   *             kinesisStreamName: secureStream
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * // encryption
   * import { KinesisStream, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const secureStream = new KinesisStream({
   *     capacityMode: 'ON_DEMAND',
   *     // stp-focus
   *     encryption: {
   *       enabled: true
   *     }
   *     // stp-end-focus
   *   });
   *
   *   const secureConsumer = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/consume.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'kinesis-stream',
   *         properties: {
   *           kinesisStreamName: 'secureStream'
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { secureStream, secureConsumer } };
   * });
   * ```
   */
  encryption?: KinesisStreamEncryption;
  /**
   * #### Give each consumer its own dedicated 2 MB/s read throughput (instead of sharing).
   *
   * ---
   *
   * Use when you have multiple consumers reading from the same stream and need low latency.
   * Enhanced fan-out consumers are auto-created when a Lambda uses `autoCreateConsumer: true`.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * # enableEnhancedFanOut
   * resources:
   *   fanoutStream:
   *     type: kinesis-stream
   *     properties:
   *       capacityMode: ON_DEMAND
   *       # stp-focus
   *       enableEnhancedFanOut: true
   *       # stp-end-focus
   *   realtimeConsumer:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/realtime.ts
   *       events:
   *         - type: kinesis-stream
   *           properties:
   *             kinesisStreamName: fanoutStream
   *             autoCreateConsumer: true
   *             startingPosition: LATEST
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * // enableEnhancedFanOut
   * import { KinesisStream, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const fanoutStream = new KinesisStream({
   *     capacityMode: 'ON_DEMAND',
   *     // stp-focus
   *     enableEnhancedFanOut: true
   *     // stp-end-focus
   *   });
   *
   *   const realtimeConsumer = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/realtime.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'kinesis-stream',
   *         properties: {
   *           kinesisStreamName: 'fanoutStream',
   *           autoCreateConsumer: true,
   *           startingPosition: 'LATEST'
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { fanoutStream, realtimeConsumer } };
   * });
   * ```
   *
   * @default false
   */
  enableEnhancedFanOut?: boolean;
}

interface KinesisStreamEncryption {
  /**
   * #### Enable server-side encryption.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * # encryption.enabled
   * resources:
   *   encryptedStream:
   *     type: kinesis-stream
   *     properties:
   *       capacityMode: ON_DEMAND
   *       retentionPeriodHours: 24
   *       encryption:
   *         # stp-focus
   *         enabled: true
   *         # stp-end-focus
   *   encryptedConsumer:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/consume.ts
   *       events:
   *         - type: kinesis-stream
   *           properties:
   *             kinesisStreamName: encryptedStream
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * // encryption.enabled
   * import { KinesisStream, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const encryptedStream = new KinesisStream({
   *     capacityMode: 'ON_DEMAND',
   *     retentionPeriodHours: 24,
   *     encryption: {
   *       // stp-focus
   *       enabled: true
   *       // stp-end-focus
   *     }
   *   });
   *
   *   const encryptedConsumer = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/consume.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'kinesis-stream',
   *         properties: {
   *           kinesisStreamName: 'encryptedStream'
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { encryptedStream, encryptedConsumer } };
   * });
   * ```
   *
   * @default false
   */
  enabled: boolean;
  /**
   * #### ARN of your own KMS key. If omitted, uses the AWS-managed `alias/aws/kinesis` key (no extra cost).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * # encryption.kmsKeyArn
   * resources:
   *   cmkStream:
   *     type: kinesis-stream
   *     properties:
   *       capacityMode: ON_DEMAND
   *       encryption:
   *         enabled: true
   *         # stp-focus
   *         kmsKeyArn: arn:aws:kms:eu-west-1:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab
   *         # stp-end-focus
   *   cmkConsumer:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/consume.ts
   *       events:
   *         - type: kinesis-stream
   *           properties:
   *             kinesisStreamName: cmkStream
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * // encryption.kmsKeyArn
   * import { KinesisStream, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cmkStream = new KinesisStream({
   *     capacityMode: 'ON_DEMAND',
   *     encryption: {
   *       enabled: true,
   *       // stp-focus
   *       kmsKeyArn: 'arn:aws:kms:eu-west-1:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab'
   *       // stp-end-focus
   *     }
   *   });
   *
   *   const cmkConsumer = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/consume.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'kinesis-stream',
   *         properties: {
   *           kinesisStreamName: 'cmkStream'
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { cmkStream, cmkConsumer } };
   * });
   * ```
   */
  kmsKeyArn?: string;
}

type StpKinesisStream = KinesisStream['properties'] & {
  name: string;
  type: KinesisStream['type'];
  configParentResourceType: KinesisStream['type'];
  nameChain: string[];
};

type KinesisStreamReferencableParam = 'arn' | 'name';
