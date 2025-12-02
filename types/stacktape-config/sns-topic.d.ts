/**
 * #### Simple Notification Service (SNS) Topic
 *
 * ---
 *
 * A managed messaging service for application-to-application (A2A) and application-to-person (A2P) communication. It allows you to send messages (notifications) to a large number of subscribers, including other services, applications, and end-users.
 */
interface SnsTopic {
  type: 'sns-topic';
  properties?: SnsTopicProps;
  overrides?: ResourceOverrides;
}

interface SnsTopicProps {
  /**
   * #### SMS Display Name
   *
   * ---
   *
   * The name that appears as the sender when you send SMS messages to subscribers.
   */
  smsDisplayName?: string;
  /**
   * #### Enable FIFO (First-In-First-Out)
   *
   * ---
   *
   * Enables FIFO (First-In-First-Out) for this topic.
   *
   * FIFO topics ensure that messages are processed in the exact order they are sent and that no duplicate messages are delivered. This is useful for applications where order and uniqueness are critical, such as financial transactions or inventory updates.
   *
   * When `fifoEnabled` is `true`, either `contentBasedDeduplication` must be enabled, or every message must include a unique `MessageDeduplicationId`.
   *
   * For more details, refer to the [AWS documentation on FIFO topics](https://docs.aws.amazon.com/sns/latest/dg/sns-fifo-topics.html).
   *
   * @default false
   */
  fifoEnabled?: boolean;
  /**
   * #### Enable Content-Based Deduplication
   *
   * ---
   *
   * Enables content-based deduplication. This helps prevent sending duplicate messages.
   *
   * SNS will automatically generate a unique ID based on the message content and use it to detect and discard duplicate messages sent within a 5-minute interval.
   *
   * This property can only be used when `fifoEnabled` is `true`.
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
