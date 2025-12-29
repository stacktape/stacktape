import { getFirstAndLastItem, groupBy, orderPropertiesOfObjectAccordingToKeys } from '@shared/utils/misc';
import { printer } from '@utils/printer';
import { getGroupedEventsWithDetails } from './utils';

export type ChildEventLogEntry = Omit<EventLogEntry, 'childEvents'>;

export type EventLogEntry = {
  eventType: LoggableEventType;
  captureType: EventLogEntryType;
  timestamp: number;
  data: any;
  description: string;
  additionalMessage?: string;
  finalMessage?: string;
  phase?: DeploymentPhase;
  childEvents: { [uniqueId: string]: ChildEventLogEntry[] };
};

export type FormattedEventData = {
  eventType: LoggableEventType;
  duration: number;
  started: number;
  finished: number;
  message: string;
  additionalMessage: string;
  printableText: string;
  finalMessage?: string;
  phase?: DeploymentPhase;
  data: any;
  childEvents: {
    instanceId: string;
    finalMessage?: string;
    duration?: number;
    events: Omit<FormattedEventData, 'childEvents'>[];
  }[];
};

/**
 * Stored child event with context for parent-child relationships.
 * - parentEventType: The parent event this belongs to (e.g., PACKAGE_ARTIFACTS)
 * - instanceId: Identifies this specific instance (e.g., "my-lambda" when multiple run in parallel)
 * - parentInstanceId: For deeply nested events, the parent's instance ID
 */
type StoredChildEvent = {
  parentEventType: LoggableEventType;
  instanceId: string;
  parentInstanceId?: string;
  data: ChildEventLogEntry;
};

export class EventLog {
  rawEvents: EventLogEntry[] = [];
  childEvents: StoredChildEvent[] = [];

  get formattedData(): FormattedEventData[] {
    const rootEvents = getGroupedEventsWithDetails(this.rawEvents).map((e) => ({ ...e, childEvents: [] }));
    rootEvents.forEach((event: FormattedEventData) => {
      const relevantChildEvents = this.childEvents.filter(
        (childEvent) => childEvent.parentEventType === event.eventType
      );
      const groupedByInstanceId = orderPropertiesOfObjectAccordingToKeys(
        groupBy(relevantChildEvents, (e) => e.instanceId)
      );

      Object.entries(groupedByInstanceId).forEach(([instanceId, childEventsForInstance]) => {
        event.printableText = event.additionalMessage || '';
        const events = getGroupedEventsWithDetails(childEventsForInstance.map((e) => e.data));
        const { first, last } = getFirstAndLastItem(events);

        event.childEvents.push({
          instanceId,
          ...(last.finalMessage ? { finalMessage: last.finalMessage } : {}),
          ...(last.finished ? { duration: last.finished - first.started } : {}),
          events
        });
      });
      let printableText = `${event.message}${event.additionalMessage ? `. ${event.additionalMessage}` : ''}`;
      if (event.duration) {
        printableText += event.duration
          ? ` done in ${printer.getTime(event.duration)}. ${event.finalMessage || ''}`
          : '...';
      }

      event.childEvents.forEach(({ instanceId, finalMessage, duration, events }) => {
        const { last } = getFirstAndLastItem(events);
        const idSplit = instanceId.split('.');
        printableText += `\n${' '.repeat(idSplit.length)}└ ${printer.colorize('yellow', idSplit[idSplit.length - 1])}`;
        if (duration) {
          printableText += `: done in ${printer.getTime(duration)}. ${finalMessage || ''}`;
        } else {
          printableText += ` ${last.message}... ${last.additionalMessage || ''}`;
        }
      });

      event.printableText = printableText;
    });

    return rootEvents;
  }

  captureEvent = (props: {
    data: any;
    eventType: LoggableEventType;
    description?: string;
    timestamp: number;
    captureType: EventLogEntryType;
    additionalMessage: string;
    finalMessage?: string;
    phase?: DeploymentPhase;
    // Context for parent-child relationships
    instanceId?: string;
    parentEventType?: LoggableEventType;
    parentInstanceId?: string;
  }) => {
    const eventData: EventLogEntry = {
      eventType: props.eventType,
      captureType: props.captureType,
      timestamp: props.timestamp,
      data: props.data,
      description: props.description || '',
      additionalMessage: props.additionalMessage,
      finalMessage: props.finalMessage,
      phase: props.phase,
      childEvents: {}
    };

    // If this event has a parent, store it as a child event
    if (props.parentEventType && props.instanceId) {
      this.childEvents.push({
        parentEventType: props.parentEventType,
        instanceId: props.instanceId,
        parentInstanceId: props.parentInstanceId,
        data: eventData
      });
    } else {
      // Root-level event
      this.rawEvents.push(eventData);
    }
  };

  reset = () => {
    this.rawEvents = [];
    this.childEvents = [];
  };
}
