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
