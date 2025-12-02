/**
 * #### Event Bus
 *
 * ---
 *
 * An event bus that receives events from your applications. Other services can be configured to react to events on the bus. It simplifies building event-driven architectures by decoupling event producers and consumers.
 *
 * For more information, see the [AWS documentation on Amazon EventBridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-buses.html).
 */
interface EventBus {
  type: 'event-bus';
  properties?: EventBusProps;
  overrides?: ResourceOverrides;
}

interface EventBusProps {
  /**
   * #### Partner Event Source
   *
   * ---
   *
   * The name of the partner event source to associate with this event bus. This is only required if you are creating a partner event bus to receive events from a third-party SaaS partner.
   *
   * For more details, refer to the [AWS documentation on partner event buses](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-partner-event-buses.html).
   */
  eventSourceName?: string;
  /**
   * #### Event Archiving
   *
   * ---
   *
   * Configures event archiving, allowing you to store and replay past events. This is useful for testing, debugging, or recovering from errors.
   */
  archivation?: EventBusArchivation;
}

interface EventBusArchivation {
  /**
   * #### Enable Archiving
   *
   * ---
   *
   * If `true`, events sent to this event bus will be archived.
   *
   * Note: Disabling the archive will result in its deletion.
   *
   * @default false
   */
  enabled: boolean;
  /**
   * #### Retention Period
   *
   * ---
   *
   * The number of days to retain archived events.
   *
   * @default "indefinitely"
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
