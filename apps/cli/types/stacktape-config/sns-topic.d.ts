/**
 * #### Pub/sub messaging: publish once, deliver to many subscribers (Lambda, SQS, email, SMS, HTTP).
 *
 * ---
 *
 * Serverless, pay-per-message. Use when one event needs to trigger multiple actions — e.g., order placed
 * triggers email confirmation + inventory update + analytics. Subscribers are configured on the subscriber side.
 */
interface SnsTopic {
  type: 'sns-topic';
  properties?: SnsTopicProps;
  overrides?: ResourceOverrides;
}

interface SnsTopicProps {
  /**
   * #### Sender name shown on SMS messages sent to subscribers (e.g., "MyApp"). Max 11 characters.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   orderEventsTopic:
   *     type: sns-topic
   *     properties:
   *       # stp-focus
   *       smsDisplayName: ShopAlerts
   *       # stp-end-focus
   *   orderNotifier:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/notify.ts
   *       events:
   *         - type: sns
   *           properties:
   *             snsTopicName: orderEventsTopic
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SnsTopic, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const orderEventsTopic = new SnsTopic({
   *     // stp-focus
   *     smsDisplayName: 'ShopAlerts'
   *     // stp-end-focus
   *   });
   *
   *   const orderNotifier = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/notify.ts' }
   *     },
   *     events: [{ type: 'sns', properties: { snsTopicName: 'orderEventsTopic' } }]
   *   });
   *
   *   return { resources: { orderEventsTopic, orderNotifier } };
   * });
   * ```
   */
  smsDisplayName?: string;
  /**
   * #### Guarantees message order and exactly-once delivery. Use for financial transactions, sequential workflows.
   *
   * ---
   *
   * FIFO topics can only deliver to FIFO SQS queues (not email, SMS, or HTTP).
   * Requires either `contentBasedDeduplication: true` or a unique `MessageDeduplicationId` per message.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   transactionsTopic:
   *     type: sns-topic
   *     properties:
   *       # stp-focus
   *       fifoEnabled: true
   *       # stp-end-focus
   *       contentBasedDeduplication: true
   *   paymentsProcessor:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/process-payment.ts
   *       events:
   *         - type: sns
   *           properties:
   *             snsTopicName: transactionsTopic
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SnsTopic, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const transactionsTopic = new SnsTopic({
   *     // stp-focus
   *     fifoEnabled: true,
   *     // stp-end-focus
   *     contentBasedDeduplication: true
   *   });
   *
   *   const paymentsProcessor = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/process-payment.ts' }
   *     },
   *     events: [{ type: 'sns', properties: { snsTopicName: 'transactionsTopic' } }]
   *   });
   *
   *   return { resources: { transactionsTopic, paymentsProcessor } };
   * });
   * ```
   *
   * @default false
   */
  fifoEnabled?: boolean;
  /**
   * #### Automatically deduplicates messages based on content (SHA-256 hash) within a 5-minute window.
   *
   * ---
   *
   * Saves you from generating a unique deduplication ID for each message. Requires `fifoEnabled: true`.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   auditTopic:
   *     type: sns-topic
   *     properties:
   *       fifoEnabled: true
   *       # stp-focus
   *       contentBasedDeduplication: true
   *       # stp-end-focus
   *   auditLogger:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/audit.ts
   *       events:
   *         - type: sns
   *           properties:
   *             snsTopicName: auditTopic
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SnsTopic, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const auditTopic = new SnsTopic({
   *     fifoEnabled: true,
   *     // stp-focus
   *     contentBasedDeduplication: true
   *     // stp-end-focus
   *   });
   *
   *   const auditLogger = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/audit.ts' }
   *     },
   *     events: [{ type: 'sns', properties: { snsTopicName: 'auditTopic' } }]
   *   });
   *
   *   return { resources: { auditTopic, auditLogger } };
   * });
   * ```
   *
   * @default false
   */
  contentBasedDeduplication?: boolean;
}

type StpSnsTopic = SnsTopic['properties'] & {
  name: string;
  type: SnsTopic['type'];
  configParentResourceType: SnsTopic['type'];
  nameChain: string[];
};

type SnsTopicReferencableParam = 'arn' | 'name';
