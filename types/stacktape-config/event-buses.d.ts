/**
 * #### Central event bus for decoupling services. Publish events and trigger functions, queues, or batch jobs.
 *
 * ---
 *
 * Use to build event-driven architectures where producers and consumers are independent.
 * Functions, batch jobs, and other resources can subscribe to specific event patterns.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   # stp-focus
 *   orderEvents:
 *     type: event-bus
 *   # stp-end-focus
 *   orderProcessor:
 *     type: function
 *     properties:
 *       packaging:
 *         type: stacktape-lambda-buildpack
 *         properties:
 *           entryfilePath: src/process-order.ts
 *       events:
 *         - type: event-bus
 *           properties:
 *             eventBusName: orderEvents
 *             eventPattern:
 *               source:
 *                 - my.orders
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { EventBus, LambdaFunction, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   // stp-focus
 *   const orderEvents = new EventBus({});
 *   // stp-end-focus
 *
 *   const orderProcessor = new LambdaFunction({
 *     packaging: {
 *       type: 'stacktape-lambda-buildpack',
 *       properties: { entryfilePath: 'src/process-order.ts' }
 *     },
 *     events: [
 *       {
 *         type: 'event-bus',
 *         properties: {
 *           eventBusName: 'orderEvents',
 *           eventPattern: { source: ['my.orders'] }
 *         }
 *       }
 *     ]
 *   });
 *
 *   return { resources: { orderEvents, orderProcessor } };
 * });
 * ```
 */
interface EventBus {
  type: 'event-bus';
  properties?: EventBusProps;
  overrides?: ResourceOverrides;
}

interface EventBusProps {
  /**
   * #### Partner event source name. Only needed for receiving events from third-party SaaS integrations.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   partnerEvents:
   *     type: event-bus
   *     properties:
   *       # stp-focus
   *       eventSourceName: aws.partner/example.com/12345/my-integration
   *       # stp-end-focus
   *   partnerHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/handle-partner-event.ts
   *       events:
   *         - type: event-bus
   *           properties:
   *             eventBusName: partnerEvents
   *             eventPattern:
   *               source:
   *                 - aws.partner/example.com/12345/my-integration
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { EventBus, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const partnerEvents = new EventBus({
   *     // stp-focus
   *     eventSourceName: 'aws.partner/example.com/12345/my-integration'
   *     // stp-end-focus
   *   });
   *
   *   const partnerHandler = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/handle-partner-event.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'event-bus',
   *         properties: {
   *           eventBusName: 'partnerEvents',
   *           eventPattern: { source: ['aws.partner/example.com/12345/my-integration'] }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { partnerEvents, partnerHandler } };
   * });
   * ```
   */
  eventSourceName?: string;
  /**
   * #### Archive events to store and replay them later. Useful for debugging, testing, or error recovery.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   auditEvents:
   *     type: event-bus
   *     properties:
   *       # stp-focus
   *       archivation:
   *         enabled: true
   *         retentionDays: 90
   *       # stp-end-focus
   *   auditLogger:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/audit-logger.ts
   *       events:
   *         - type: event-bus
   *           properties:
   *             eventBusName: auditEvents
   *             eventPattern:
   *               source:
   *                 - my.audit
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { EventBus, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const auditEvents = new EventBus({
   *     // stp-focus
   *     archivation: {
   *       enabled: true,
   *       retentionDays: 90
   *     }
   *     // stp-end-focus
   *   });
   *
   *   const auditLogger = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/audit-logger.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'event-bus',
   *         properties: {
   *           eventBusName: 'auditEvents',
   *           eventPattern: { source: ['my.audit'] }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { auditEvents, auditLogger } };
   * });
   * ```
   */
  archivation?: EventBusArchivation;
}

interface EventBusArchivation {
  /**
   * #### Enable event archiving. Disabling deletes the archive.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   domainEvents:
   *     type: event-bus
   *     properties:
   *       archivation:
   *         # stp-focus
   *         enabled: true
   *         # stp-end-focus
   *         retentionDays: 30
   *   eventConsumer:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/consumer.ts
   *       events:
   *         - type: event-bus
   *           properties:
   *             eventBusName: domainEvents
   *             eventPattern:
   *               source:
   *                 - my.domain
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { EventBus, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const domainEvents = new EventBus({
   *     archivation: {
   *       // stp-focus
   *       enabled: true,
   *       // stp-end-focus
   *       retentionDays: 30
   *     }
   *   });
   *
   *   const eventConsumer = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/consumer.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'event-bus',
   *         properties: {
   *           eventBusName: 'domainEvents',
   *           eventPattern: { source: ['my.domain'] }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { domainEvents, eventConsumer } };
   * });
   * ```
   *
   * @default false
   */
  enabled: boolean;
  /**
   * #### Days to keep archived events. Omit to keep indefinitely.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   replayableEvents:
   *     type: event-bus
   *     properties:
   *       archivation:
   *         enabled: true
   *         # stp-focus
   *         retentionDays: 365
   *         # stp-end-focus
   *   replayHandler:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/replay-handler.ts
   *       events:
   *         - type: event-bus
   *           properties:
   *             eventBusName: replayableEvents
   *             eventPattern:
   *               source:
   *                 - my.events
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { EventBus, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const replayableEvents = new EventBus({
   *     archivation: {
   *       enabled: true,
   *       // stp-focus
   *       retentionDays: 365
   *       // stp-end-focus
   *     }
   *   });
   *
   *   const replayHandler = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: { entryfilePath: 'src/replay-handler.ts' }
   *     },
   *     events: [
   *       {
   *         type: 'event-bus',
   *         properties: {
   *           eventBusName: 'replayableEvents',
   *           eventPattern: { source: ['my.events'] }
   *         }
   *       }
   *     ]
   *   });
   *
   *   return { resources: { replayableEvents, replayHandler } };
   * });
   * ```
   */
  retentionDays?: number;
}

type StpEventBus = EventBus['properties'] & {
  name: string;
  type: EventBus['type'];
  configParentResourceType: EventBus['type'];
  nameChain: string[];
};

type EventBusReferencableParam = 'arn' | 'archiveArn';
