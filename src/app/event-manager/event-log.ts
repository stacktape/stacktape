import { getFirstAndLastItem, groupBy, orderPropertiesOfObjectAccordingToKeys } from '@shared/utils/misc';
import { printer } from '@utils/printer';
import { getGroupedEventsWithDetails } from './utils';

type EventNamespace = { identifier: string; eventType: LoggableEventType };

// export type EventLogEntry = {
//   eventType: LoggableEventType;
//   started: number;
//   finished?: number;
//   duration?: number;
//   data: {
//     onStart?: Record<string, any>;
//     onFinish?: Record<string, any>;
//     onLastUpdate?: Record<string, any>;
//   };
//   description: string;
//   additionalMessage?: string;
//   printableMessage?: string;
//   lastChildEvents: { [uniqueId: string]: Omit<EventLogEntry, 'subevents'> };
// };

export type ChildEventLogEntry = Omit<EventLogEntry, 'childEvents'>;

export type EventLogEntry = {
  eventType: LoggableEventType;
  captureType: EventLogEntryType;
  timestamp: number;
  data: any;
  description: string;
  additionalMessage?: string;
  finalMessage?: string;
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
  data: any;
  childEvents: {
    id: string;
    finalMessage?: string;
    duration?: number;
    events: Omit<FormattedEventData, 'childEvents'>[];
  }[];
};

export class EventLog {
  rawEvents: EventLogEntry[] = [];
  rawNamespacedEvents: { identifier: string; eventType: LoggableEventType; data: ChildEventLogEntry }[] = [];

  get formattedData(): FormattedEventData[] {
    const rootEvents = getGroupedEventsWithDetails(this.rawEvents).map((e) => ({ ...e, childEvents: [] }));
    rootEvents.forEach((event: FormattedEventData) => {
      const relevantEvents = this.rawNamespacedEvents.filter(
        (namespacedEvent) => namespacedEvent.eventType === event.eventType
      );
      const groupedByIdentifier = orderPropertiesOfObjectAccordingToKeys(groupBy(relevantEvents, (e) => e.identifier));

      Object.entries(groupedByIdentifier).forEach(([identifier, namespacedEvents]) => {
        event.printableText = event.additionalMessage || '';
        const events = getGroupedEventsWithDetails(namespacedEvents.map((e) => e.data));
        const { first, last } = getFirstAndLastItem(events);

        event.childEvents.push({
          id: identifier,
          ...(last.finalMessage ? { finalMessage: last.finalMessage } : {}),
          ...(last.finished ? { duration: last.finished - first.started } : {}), // last.duration ||
          events
        });
      });
      let printableText = `${event.message}${event.additionalMessage ? `. ${event.additionalMessage}` : ''}`;
      if (event.duration) {
        printableText += event.duration
          ? ` done in ${printer.getTime(event.duration)}. ${event.finalMessage || ''}`
          : '...';
      }

      event.childEvents.forEach(({ id, finalMessage, duration, events }) => {
        const { last } = getFirstAndLastItem(events);
        const idSplit = id.split('.');
        printableText += `\n${' '.repeat(idSplit.length)}└ ${printer.colorize('yellow', idSplit[idSplit.length - 1])}`;
        if (duration) {
          printableText += `: done in ${printer.getTime(duration)}. ${finalMessage || ''}`;
        } else {
          // const description = last.message ? `-> ${last.message}` : '';
          // const postfix = last.duration ? `done in ${printer.getTime(last.duration)}.` : '...';
          // const identifier = `${printer.colorize('yellow', id)}`;
          // printableText += `\n  └ ${identifier} ${description} ${postfix} ${last.finalMessage || ''}`;
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
    namespace: EventNamespace;
    captureType: EventLogEntryType;
    additionalMessage: string;
    finalMessage?: string;
  }) => {
    return this.addEvent({
      namespace: props.namespace,
      eventData: { ...props, description: props.description || '', childEvents: {} }
    });
  };

  reset = () => {
    this.rawEvents = [];
    this.rawNamespacedEvents = [];
  };

  private addEvent = ({ namespace, eventData }: { namespace: EventNamespace; eventData: EventLogEntry }) => {
    if (namespace) {
      this.rawNamespacedEvents.push({ ...namespace, data: eventData });
    } else {
      this.rawEvents.push(eventData);
    }
  };
}
